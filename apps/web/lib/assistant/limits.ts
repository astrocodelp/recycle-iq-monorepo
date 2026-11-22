import 'server-only';
import { createHash } from 'node:crypto';
import { assistantQuota, getDb, sql } from '@recycleiq/db';

/** IP addresses are never stored: counters use a salted one-way hash (see /privacy). */
const ipKey = (ip: string) =>
  createHash('sha256').update(`${process.env.ASSISTANT_IP_SALT ?? 'recycleiq-quota'}:${ip}`).digest('hex').slice(0, 32);

/**
 * Usage limits for the assistant, so the open models are never overused and the bill stays predictable.
 * Counted per question (a new user message), not per tool step or approval. Defaults, all overridable by env:
 *
 *   ASSISTANT_LIMIT_DEVICE_HOUR     10   questions per hour per app install (citizen)
 *   ASSISTANT_LIMIT_DEVICE_DAY      30   questions per day per app install (citizen)
 *   ASSISTANT_LIMIT_IP_DAY         100   questions per day per IP in citizen mode (stops device-id rotation)
 *   ASSISTANT_LIMIT_MUNICIPAL_DAY  200   questions per day per IP on the dashboard
 *   ASSISTANT_LIMIT_GLOBAL_DAY    3000   questions per day for everyone (~$3 a day at most on gpt-oss-120b)
 *
 * Windows are UTC hours and days. Counters live in the `assistant_quota` table and are pruned after 3 days.
 */
const num = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
};

export interface QuotaResult {
  ok: boolean;
  /** Questions left in the tightest window for this user. */
  remaining: number;
  limit: number;
  /** Seconds until the window that blocked resets. */
  retryAfter?: number;
  reason?: 'device-hour' | 'device-day' | 'ip-day' | 'municipal-day' | 'global-day';
}

export async function takeQuota(opts: { mode: 'citizen' | 'municipal'; deviceId: string | null; ip: string }): Promise<QuotaResult> {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  const secsToHour = 3600 - (now.getUTCMinutes() * 60 + now.getUTCSeconds());
  const secsToDay = 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());

  type Rule = { key: string; window: string; limit: number; reason: QuotaResult['reason']; resets: number; user: boolean };
  const ip = ipKey(opts.ip);
  const rules: Rule[] = [{ key: 'global', window: day, limit: num('ASSISTANT_LIMIT_GLOBAL_DAY', 3000), reason: 'global-day', resets: secsToDay, user: false }];
  if (opts.mode === 'municipal') {
    rules.push({ key: `mun:${ip}`, window: day, limit: num('ASSISTANT_LIMIT_MUNICIPAL_DAY', 200), reason: 'municipal-day', resets: secsToDay, user: true });
  } else {
    const dev = opts.deviceId ? `dev:${opts.deviceId}` : `dev-ip:${ip}`;
    rules.push(
      { key: dev, window: hour, limit: num('ASSISTANT_LIMIT_DEVICE_HOUR', 10), reason: 'device-hour', resets: secsToHour, user: true },
      { key: dev, window: day, limit: num('ASSISTANT_LIMIT_DEVICE_DAY', 30), reason: 'device-day', resets: secsToDay, user: true },
      { key: `ip:${ip}`, window: day, limit: num('ASSISTANT_LIMIT_IP_DAY', 100), reason: 'ip-day', resets: secsToDay, user: false },
    );
  }

  try {
    const db = getDb();
    const current = await Promise.all(
      rules.map(async (r) => {
        const [row] = await db
          .select({ count: assistantQuota.count })
          .from(assistantQuota)
          .where(sql`${assistantQuota.key} = ${r.key} and ${assistantQuota.window} = ${r.window}`);
        return row?.count ?? 0;
      }),
    );
    const userRules = rules.map((r, i) => ({ r, used: current[i]! })).filter((x) => x.r.user);
    const blocked = rules.findIndex((r, i) => current[i]! >= r.limit);
    if (blocked >= 0) {
      const r = rules[blocked]!;
      const tightest = userRules.reduce((a, b) => (b.r.limit - b.used < a.r.limit - a.used ? b : a), userRules[0]!);
      return { ok: false, remaining: 0, limit: tightest?.r.limit ?? r.limit, retryAfter: r.resets, reason: r.reason };
    }
    await Promise.all(
      rules.map((r) =>
        db
          .insert(assistantQuota)
          .values({ key: r.key, window: r.window, count: 1 })
          .onConflictDoUpdate({ target: [assistantQuota.key, assistantQuota.window], set: { count: sql`${assistantQuota.count} + 1`, updatedAt: sql`now()` } }),
      ),
    );
    // Prune old windows now and then.
    if (Math.random() < 0.02) await db.delete(assistantQuota).where(sql`${assistantQuota.updatedAt} < now() - interval '3 days'`);
    const left = userRules.map((x) => ({ limit: x.r.limit, left: x.r.limit - x.used - 1 }));
    const tight = left.reduce((a, b) => (b.left < a.left ? b : a), left[0] ?? { limit: 0, left: 0 });
    return { ok: true, remaining: Math.max(0, tight.left), limit: tight.limit };
  } catch (e) {
    // Never take the assistant down because the counter table is unavailable; log and allow.
    console.warn('assistant quota unavailable', e instanceof Error ? e.message : e);
    return { ok: true, remaining: -1, limit: -1 };
  }
}

export function quotaMessage(q: QuotaResult, lang: 'el' | 'en') {
  const mins = Math.ceil((q.retryAfter ?? 3600) / 60);
  const when =
    mins < 90 ? (lang === 'el' ? `σε ${mins} λεπτά` : `in ${mins} minutes`) : lang === 'el' ? `σε ${Math.ceil(mins / 60)} ώρες` : `in ${Math.ceil(mins / 60)} hours`;
  if (q.reason === 'global-day')
    return lang === 'el'
      ? `Ο βοηθός έφτασε το ημερήσιο όριο για όλους. Δοκίμασε ξανά ${when}.`
      : `The assistant reached today's limit for everyone. Try again ${when}.`;
  return lang === 'el'
    ? `Έφτασες το όριο ερωτήσεων (${q.limit}). Δοκίμασε ξανά ${when}.`
    : `You reached the question limit (${q.limit}). Try again ${when}.`;
}

import { getDb, sql } from '@recycleiq/db';
import { DAILY_SCAN_CAP, PERIOD_DAYS, defaultNickname, type L10n } from '@recycleiq/engine';
import { z } from 'zod';
import { error } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Query = z.object({
  period: z.enum(['week', 'month']).default('week'),
  district: z.string().max(64).optional(),
  deviceId: z.string().max(64).optional(),
  lang: z.enum(['el', 'en']).default('el'),
});

/**
 * Who scans the most. Score = scans in the period, at most DAILY_SCAN_CAP per day.
 * Only nicknames and ranks leave the server: never another person's install id.
 */
export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return error(400, 'Invalid query', parsed.error.issues);
  const { period, district, deviceId, lang } = parsed.data;
  const days = PERIOD_DAYS[period];
  const inDistrict = district ? sql`and district_id = ${district}` : sql``;
  const db = getDb();

  const ranked = sql`
    with daily as (
      select device_id, least(count(*), ${DAILY_SCAN_CAP}) as n
      from decisions
      where device_id is not null and created_at >= now() - make_interval(days => ${days}) ${inDistrict}
      group by device_id, date_trunc('day', created_at)),
    scores as (select device_id, sum(n)::int as score from daily group by device_id)
    select s.device_id, s.score, p.nickname,
           rank() over (order by s.score desc)::int as rank,
           count(*) over ()::int as players
    from scores s left join players p on p.device_id = s.device_id`;

  const top = (await db.execute(sql`${ranked} order by s.score desc, s.device_id limit 20`)).rows;
  const me = deviceId
    ? (await db.execute(sql`select * from (${ranked}) r where r.device_id = ${deviceId}`)).rows[0]
    : undefined;
  const hoods = (
    await db.execute(sql`
      select d.id, d.name, count(*)::int as scans, count(distinct x.device_id)::int as people
      from decisions x join districts d on d.id = x.district_id
      where x.created_at >= now() - make_interval(days => ${days})
      group by d.id, d.name order by scans desc limit 10`)
  ).rows;

  const name = (r: Record<string, unknown>) => (r.nickname ? String(r.nickname) : defaultNickname(String(r.device_id), lang));
  return Response.json({
    period,
    district: district ?? null,
    dailyCap: DAILY_SCAN_CAP,
    players: Number(top[0]?.players ?? me?.players ?? 0),
    top: top.map((r) => ({ rank: Number(r.rank), nickname: name(r), score: Number(r.score), isMe: r.device_id === deviceId })),
    me: me ? { rank: Number(me.rank), nickname: name(me), score: Number(me.score) } : deviceId ? { rank: null, nickname: defaultNickname(deviceId, lang), score: 0 } : null,
    neighbourhoods: hoods.map((h) => ({ id: String(h.id), name: h.name as L10n, scans: Number(h.scans), people: Number(h.people) })),
  });
}

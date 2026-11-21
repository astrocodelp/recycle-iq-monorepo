import 'server-only';
import { binReports, eq, getDb, serviceRequests } from '@recycleiq/db';
import {
  CAR_KG_PER_KM,
  CATEGORIES,
  CATEGORY_IDS,
  getObject,
  haversine,
  impactFor,
  rankPoints,
  searchObjects,
  totalAvoidedKg,
  type AssistantChart,
  type AssistantMode,
  type CategoryId,
  type L10n,
} from '@recycleiq/engine';
import { categoryColors } from '@recycleiq/tokens';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { acknowledgeBinAlerts, resolveBinAlerts } from '@/lib/alerts';
import { CITY_STATUS_LABEL, getCityRequest, tryCity, type CityStatus } from '@/lib/athens';
import type { BinSource } from '@/lib/bins';
import { createBulkyRequest } from '@/lib/bulky';
import { getDistrictContext, getDistricts, getPoints, makeDecision } from '@/lib/data';
import { getLeaderboard } from '@/lib/leaderboard';
import {
  BIN_KINDS,
  getAlertStats,
  getBinsByKind,
  getBulkyRequests,
  getCategoryMix,
  getDailySeries,
  getDistrictStats,
  getKpis,
  getObjectCategoryCounts,
  getOpenAlerts,
  getTopItems,
} from '@/lib/queries';
import { createBinReport } from '@/lib/reports';
import { isRuleCode, listRules, setRuleEnabled } from '@/lib/rules';
import { scansInDistrict, storiesFor } from '@/lib/stories';

export interface AssistantContext {
  mode: AssistantMode;
  lang: 'el' | 'en';
  deviceId: string | null;
  districtId: string | null;
  binSource: BinSource;
}

const days = z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30).describe('Time window in days: 7, 30 or 90');
const district = z.string().max(64).optional().describe('Neighbourhood id, e.g. "kypseli" (from listNeighbourhoods). Omit for the whole city.');

/** Builds the tool set for one request. Municipal actions exist only in municipal mode. */
export function buildTools(ctx: AssistantContext) {
  const t = (l: L10n) => l[ctx.lang];
  const tx = (el: string, en: string) => (ctx.lang === 'el' ? el : en);
  const fmt = (n: number, d = 0) => n.toLocaleString(ctx.lang === 'el' ? 'el-GR' : 'en-GB', { maximumFractionDigits: d });
  const pct = (n: number) => `${fmt(n * 100)}%`;
  const dataSource = ctx.binSource;
  const districtName = async (id?: string | null) => {
    if (!id) return tx('όλη η Αθήνα', 'all of Athens');
    const d = (await getDistricts()).find((x) => x.id === id);
    return d ? t(d.name) : id;
  };
  const objName = (id: string) => (getObject(id) ? t(getObject(id)!.name) : id);

  const read = {
    findItems: tool({
      description: 'Find catalogue items matching a description in Greek or English (e.g. "κουτί πίτσας", "battery"). Returns item ids for whereDoesItGo.',
      inputSchema: z.object({ query: z.string().min(2).max(80) }),
      execute: async ({ query }) => {
        const hits = searchObjects(query).slice(0, 5);
        return {
          items: hits.map((h) => ({
            id: h.object.id,
            name: t(h.object.name),
            material: t(h.object.material),
            question: h.object.questions[0]
              ? { id: h.object.questions[0].id, prompt: t(h.object.questions[0].prompt), options: h.object.questions[0].options.map((o) => ({ id: o.id, label: t(o.label) })) }
              : null,
          })),
          note: hits.length ? undefined : tx('Δεν βρέθηκε στον κατάλογο.', 'Not in the catalogue.'),
        };
      },
    }),

    whereDoesItGo: tool({
      description:
        'Decide which bin an item goes in, with the municipal rules for a neighbourhood, and the nearest suitable bins. If the item has a clarifying question and no answer is given, returns the question to ask first.',
      inputSchema: z.object({
        objectId: z.string().describe('Item id from findItems'),
        answers: z.record(z.string(), z.string()).optional().describe('Answers to the item question: { questionId: optionId }'),
        districtId: district,
      }),
      execute: async ({ objectId, answers, districtId }) => {
        const obj = getObject(objectId);
        if (!obj) return { error: 'Unknown item id. Call findItems first.' };
        const q = obj.questions[0];
        if (q && !answers?.[q.id])
          return {
            needsAnswer: { questionId: q.id, prompt: t(q.prompt), options: q.options.map((o) => ({ id: o.id, label: t(o.label) })) },
          };
        const { decision, nearby } = await makeDecision({
          objectId,
          answers: answers ?? {},
          districtId: districtId ?? ctx.districtId,
          record: false,
          binSource: ctx.binSource,
        });
        const impact = impactFor(objectId, decision.category, decision.uncertain);
        const chart: AssistantChart | undefined = nearby.length
          ? {
              type: 'map-list',
              title: tx('Κοντινότερα σημεία', 'Nearest points'),
              items: nearby.map((p) => ({ id: p.id, label: t(p.name), detail: `${fmt(p.distance)} m`, status: p.status })),
            }
          : undefined;
        return {
          item: t(obj.name),
          destination: t(decision.destination),
          category: decision.category,
          why: t(decision.why),
          prep: decision.prep.map(t),
          warnings: decision.warnings.map(t),
          notes: decision.notes.map(t),
          confidence: Math.round(decision.confidence * 100),
          uncertain: decision.uncertain,
          rulesApplied: decision.rulesApplied,
          co2eAvoidedGrams: impact.counts ? impact.grams : null,
          impact: impact.counts ? t(impact.headline) : undefined,
          chart,
          dataSource,
        };
      },
    }),

    listNeighbourhoods: tool({
      description: 'List the 38 neighbourhoods of Athens with their ids, municipal community and brown-bin coverage.',
      inputSchema: z.object({}),
      execute: async () => ({
        neighbourhoods: (await getDistricts()).map((d) => ({ id: d.id, name: t(d.name), community: d.communityId, brownBin: d.organicService })),
      }),
    }),

    nearestBins: tool({
      description: 'Nearest bins and collection points to a neighbourhood centre, optionally for one waste category. Includes bin ids for reportFullBin.',
      inputSchema: z.object({
        districtId: district,
        category: z.enum(CATEGORY_IDS).optional().describe('packaging (blue), organic (brown), general (mixed), special, bulky'),
        limit: z.number().int().min(1).max(15).default(5),
      }),
      execute: async ({ districtId, category, limit }) => {
        const [{ centre }, points] = await Promise.all([getDistrictContext(districtId ?? ctx.districtId), getPoints(ctx.binSource)]);
        const ranked = category
          ? rankPoints(points, { category }, centre, limit)
          : points
              .map((p) => ({ ...p, distance: Math.round(haversine(p, centre)) }))
              .sort((a, b) => a.distance - b.distance)
              .slice(0, limit);
        const items = ranked.map((p) => ({
          id: p.id,
          name: t(p.name),
          kind: p.kind,
          distanceM: p.distance,
          status: p.status,
        }));
        return {
          from: await districtName(districtId ?? ctx.districtId),
          bins: items,
          chart: {
            type: 'map-list',
            title: tx('Κοντινότεροι κάδοι', 'Nearest bins'),
            items: items.map((p) => ({ id: p.id, label: p.name, detail: `${fmt(p.distanceM)} m`, status: p.status })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    kpis: tool({
      description: 'Headline figures for a period: requests (scans), change vs previous period, clarification rate, average confidence, active users, brown-bin requests.',
      inputSchema: z.object({ days, districtId: district }),
      execute: async ({ days: d, districtId }) => {
        const k = await getKpis(d, districtId);
        const change = k.requestsPrev ? (k.requests - k.requestsPrev) / k.requestsPrev : null;
        return {
          ...k,
          changeVsPrevious: change,
          chart: {
            type: 'kpis',
            title: `${await districtName(districtId)} · ${d} ${tx('ημέρες', 'days')}`,
            items: [
              { label: tx('Σαρώσεις', 'Scans'), value: fmt(k.requests), hint: change == null ? undefined : `${change >= 0 ? '+' : ''}${pct(change)}` },
              { label: tx('Ενεργοί χρήστες', 'Active users'), value: fmt(k.activeDevices) },
              { label: tx('Μέση βεβαιότητα', 'Avg confidence'), value: pct(k.avgConfidence) },
              { label: tx('Με διευκρίνιση', 'Clarified'), value: pct(k.clarificationRate) },
              { label: tx('Αιτήματα καφέ κάδου', 'Brown-bin requests'), value: fmt(k.brownBinRequests) },
            ],
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    scansPerDay: tool({
      description: 'Number of scans (recycling questions) per day, for a trend line.',
      inputSchema: z.object({ days, districtId: district }),
      execute: async ({ days: d, districtId }) => {
        const series = await getDailySeries(d, districtId);
        return {
          total: series.reduce((s, x) => s + x.n, 0),
          chart: {
            type: 'line',
            title: `${tx('Σαρώσεις ανά ημέρα', 'Scans per day')} · ${await districtName(districtId)}`,
            points: series.map((s) => ({ x: s.day, y: s.n })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    categoryMix: tool({
      description: 'Where scanned items ended up: share per bin category.',
      inputSchema: z.object({ days, districtId: district }),
      execute: async ({ days: d, districtId }) => {
        const mix = await getCategoryMix(d, districtId);
        const total = mix.reduce((s, m) => s + m.n, 0) || 1;
        return {
          categories: mix.map((m) => ({ category: m.category, label: t(CATEGORIES[m.category].short), n: m.n, share: m.n / total })),
          chart: {
            type: 'bar',
            title: `${tx('Πού καταλήγουν', 'Where items go')} · ${await districtName(districtId)}`,
            items: mix.map((m) => ({ label: t(CATEGORIES[m.category].short), value: m.n, color: categoryColors[m.category].solid, hint: pct(m.n / total) })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    topItems: tool({
      description: 'Most scanned items, with how often residents needed a clarifying question.',
      inputSchema: z.object({ days, districtId: district, limit: z.number().int().min(1).max(10).default(5) }),
      execute: async ({ days: d, districtId, limit }) => {
        const items = (await getTopItems(d, districtId)).slice(0, limit);
        return {
          items: items.map((i) => ({ id: i.objectId, name: objName(i.objectId), scans: i.n, clarificationRate: i.clarificationRate })),
          chart: {
            type: 'bar',
            title: `${tx('Συχνότερα αντικείμενα', 'Most scanned items')} · ${await districtName(districtId)}`,
            items: items.map((i) => ({ label: objName(i.objectId), value: i.n, hint: `${pct(i.clarificationRate)} ${tx('με ερώτηση', 'clarified')}` })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    neighbourhoodRanking: tool({
      description: 'Rank neighbourhoods by scans, brown-bin requests, number of bins or average confidence.',
      inputSchema: z.object({
        days,
        metric: z.enum(['scans', 'brownBinRequests', 'bins', 'avgConfidence']).default('scans'),
        order: z.enum(['desc', 'asc']).default('desc'),
        limit: z.number().int().min(1).max(38).default(5),
      }),
      execute: async ({ days: d, metric, order, limit }) => {
        const rows = await getDistrictStats(d, ctx.binSource);
        const val = (r: (typeof rows)[number]) =>
          metric === 'scans' ? r.requests : metric === 'brownBinRequests' ? r.brownBinRequests : metric === 'bins' ? r.points : Math.round(r.avgConfidence * 100);
        const sorted = [...rows].sort((a, b) => (order === 'desc' ? val(b) - val(a) : val(a) - val(b))).slice(0, limit);
        const label = { scans: tx('Σαρώσεις', 'Scans'), brownBinRequests: tx('Αιτήματα καφέ κάδου', 'Brown-bin requests'), bins: tx('Κάδοι', 'Bins'), avgConfidence: tx('Μέση βεβαιότητα %', 'Avg confidence %') }[metric];
        return {
          ranking: sorted.map((r, i) => ({ rank: i + 1, id: r.id, name: t(r.name), value: val(r), brownBin: r.organicService })),
          chart: { type: 'bar', title: `${label} · ${d} ${tx('ημέρες', 'days')}`, items: sorted.map((r) => ({ label: t(r.name), value: val(r) })) } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    binsByKind: tool({
      description: 'How many bins and collection points of each type, and how many have problems, for a neighbourhood or the city.',
      inputSchema: z.object({ districtId: district }),
      execute: async ({ districtId }) => {
        const rows = await getBinsByKind(districtId, ctx.binSource);
        const kinds = BIN_KINDS as Record<string, { el: string; en: string; category: CategoryId }>;
        return {
          bins: rows.map((r) => ({ kind: r.kind, label: kinds[r.kind] ? t(kinds[r.kind]!) : r.kind, n: r.n, withProblems: r.issues })),
          chart: {
            type: 'bar',
            title: `${tx('Κάδοι ανά τύπο', 'Bins by type')} · ${await districtName(districtId)}`,
            items: rows.map((r) => ({
              label: kinds[r.kind] ? t(kinds[r.kind]!) : r.kind,
              value: r.n,
              color: kinds[r.kind] ? categoryColors[kinds[r.kind]!.category].solid : undefined,
              hint: r.issues ? `${r.issues} ${tx('με πρόβλημα', 'with issues')}` : undefined,
            })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    environmentImpact: tool({
      description: 'Estimated CO2e avoided if scanned items are recycled correctly (UK DESNZ 2025 factors), as car-km equivalent and per item.',
      inputSchema: z.object({ days, districtId: district }),
      execute: async ({ days: d, districtId }) => {
        const rows = await getObjectCategoryCounts(d, districtId);
        const kg = totalAvoidedKg(rows);
        const per = new Map<string, number>();
        for (const r of rows) {
          const g = totalAvoidedKg([r]);
          if (g > 0) per.set(r.objectId, (per.get(r.objectId) ?? 0) + g);
        }
        const items = [...per.entries()].sort((a, b) => b[1] - a[1]);
        return {
          kgCo2eAvoided: Math.round(kg),
          carKmEquivalent: Math.round(kg / CAR_KG_PER_KM),
          estimate: true,
          source: 'UK DESNZ 2025 GHG conversion factors',
          chart: {
            type: 'bar',
            title: `${tx('Εκτιμώμενο όφελος', 'Estimated benefit')}: ${fmt(kg)} kg CO₂e ≈ ${fmt(kg / CAR_KG_PER_KM)} ${tx('χλμ. αυτοκινήτου', 'car km')}`,
            unit: 'kg CO₂e',
            items: items.map(([id, v]) => ({ label: objName(id), value: Math.round(v * 10) / 10 })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    openAlerts: tool({
      description: 'Bins residents reported as full, overflowing or damaged that are still open, with counts and city request status. Includes bin ids for municipal actions.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(10) }),
      execute: async ({ limit }) => {
        const [alerts, stats] = await Promise.all([getOpenAlerts(), getAlertStats()]);
        const kind = (k: string) => ({ full: tx('Γεμάτος', 'Full'), overflowing: tx('Ξεχειλίζει', 'Overflowing'), damaged: tx('Χαλασμένος', 'Damaged') })[k] ?? k;
        const city = (s: string | null) => (s && s in CITY_STATUS_LABEL ? t(CITY_STATUS_LABEL[s as CityStatus]) : '—');
        return {
          stats,
          alerts: alerts.slice(0, limit).map((a) => ({
            binId: a.pointId,
            bin: t(a.pointName),
            neighbourhood: a.district ? t(a.district) : null,
            problems: a.kinds.map(kind),
            reports: a.reports,
            status: a.status,
            cityRequest: a.cityRequestId,
            cityStatus: a.cityStatus,
            since: a.firstAt.toISOString(),
          })),
          chart: {
            type: 'table',
            title: `${tx('Ανοιχτές αναφορές', 'Open reports')}: ${fmt(stats.open)} ${tx('νέες', 'new')}, ${fmt(stats.acknowledged)} ${tx('σε εξέλιξη', 'in progress')}`,
            columns: [tx('Κάδος', 'Bin'), tx('Γειτονιά', 'Area'), tx('Πρόβλημα', 'Problem'), tx('Αναφορές', 'Reports'), tx('Δήμος', 'City')],
            rows: alerts.slice(0, limit).map((a) => [t(a.pointName), a.district ? t(a.district) : '—', a.kinds.map(kind).join(', '), a.reports, city(a.cityStatus)]),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    bulkyPickups: tool({
      description: 'Recent bulky-item pickup requests filed with the city, with their status.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
      execute: async ({ limit }) => {
        const rows = await getBulkyRequests(limit);
        const city = (s: string | null) => (s && s in CITY_STATUS_LABEL ? t(CITY_STATUS_LABEL[s as CityStatus]) : '—');
        return {
          requests: rows.map((r) => ({ cityRequest: r.cityRequestId, status: r.cityStatus, neighbourhood: r.district ? t(r.district) : null, at: r.createdAt.toISOString() })),
          chart: {
            type: 'table',
            title: tx('Παραλαβές ογκωδών', 'Bulky pickups'),
            columns: [tx('Αίτημα', 'Request'), tx('Γειτονιά', 'Area'), tx('Κατάσταση', 'Status')],
            rows: rows.map((r) => [r.cityRequestId ?? '—', r.district ? t(r.district) : '—', city(r.cityStatus)]),
          } satisfies AssistantChart,
        };
      },
    }),

    neighbourhoodStories: tool({
      description: 'Stories of a neighbourhood that residents unlock by scanning there (1, 5, 15, 30, 50 scans), and how many scans this user has there.',
      inputSchema: z.object({ districtId: z.string().max(64).optional() }),
      execute: async ({ districtId }) => {
        const id = districtId ?? ctx.districtId;
        if (!id) return { error: 'No neighbourhood. Ask the user which one, or call listNeighbourhoods.' };
        const [stories, scans] = await Promise.all([storiesFor(id, ctx.binSource), ctx.deviceId ? scansInDistrict(ctx.deviceId, id) : 0]);
        return {
          neighbourhood: await districtName(id),
          yourScans: scans,
          stories: stories.map((s) => ({ title: t(s.title), unlocksAt: s.threshold, unlocked: scans >= s.threshold, text: scans >= s.threshold ? t(s.body) : undefined })),
          note: tx('Ιστορίες σε μορφή πρόχειρου, προς επιβεβαίωση από τον Δήμο.', 'Draft stories, to be verified by the municipality.'),
        };
      },
    }),

    leaderboard: tool({
      description: 'Who scans the most this week or month (nicknames only), the user\'s own rank, and the busiest neighbourhoods.',
      inputSchema: z.object({ period: z.enum(['week', 'month']).default('week'), districtId: district }),
      execute: async ({ period, districtId }) => {
        const lb = await getLeaderboard({ period, district: districtId, deviceId: ctx.deviceId, lang: ctx.lang });
        return {
          ...lb,
          neighbourhoods: lb.neighbourhoods.map((n) => ({ ...n, name: t(n.name) })),
          chart: {
            type: 'bar',
            title: `${tx('Κατάταξη', 'Leaderboard')} · ${period === 'week' ? tx('εβδομάδα', 'week') : tx('μήνας', 'month')}`,
            items: lb.top.slice(0, 10).map((p) => ({ label: `${p.rank}. ${p.nickname}${p.isMe ? tx(' (εσύ)', ' (you)') : ''}`, value: p.score })),
          } satisfies AssistantChart,
          dataSource,
        };
      },
    }),

    listRules: tool({
      description: 'The municipal sorting rules, whether each is on, and what it says.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await listRules();
        return {
          rules: rows.map((r) => ({ code: r.code, enabled: r.enabled, title: t(r.title), text: t(r.body) })),
          chart: {
            type: 'table',
            title: tx('Κανόνες του Δήμου', 'Municipal rules'),
            columns: [tx('Κωδικός', 'Code'), tx('Κανόνας', 'Rule'), tx('Κατάσταση', 'Status')],
            rows: rows.map((r) => [r.code, t(r.title), r.enabled ? tx('Ενεργός', 'On') : tx('Ανενεργός', 'Off')]),
          } satisfies AssistantChart,
          note: tx('Ενδεικτικοί κανόνες demo.', 'Indicative demo rules.'),
        };
      },
    }),

    cityRequestStatus: tool({
      description: "Live status of a request RecycleIQ filed in the city's request system (AthensGov), by its id such as req-1001.",
      inputSchema: z.object({ requestId: z.string().min(3).max(64) }),
      execute: async ({ requestId }) => {
        const db = getDb();
        const [a] = await db.select({ id: serviceRequests.id }).from(serviceRequests).where(eq(serviceRequests.cityRequestId, requestId));
        const [b] = a ? [] : await db.select({ id: binReports.id }).from(binReports).where(eq(binReports.cityRequestId, requestId)).limit(1);
        if (!a && !b) return { error: tx('Δεν είναι αίτημα του RecycleIQ.', 'Not a request filed by RecycleIQ.') };
        const r = await tryCity(() => getCityRequest(requestId));
        if (!r) return { error: tx('Το σύστημα του Δήμου δεν απάντησε.', 'The city system did not answer.') };
        return { id: r.id, status: r.status, statusLabel: t(CITY_STATUS_LABEL[r.status]), history: r.history ?? [] };
      },
    }),
  };

  const citizen = {
    reportFullBin: tool({
      description: 'Report a bin as full, overflowing or damaged (the user approves first). Also filed with the city when connected. Needs a bin id from nearestBins.',
      inputSchema: z.object({ binId: z.string().min(1).max(64), problem: z.enum(['full', 'overflowing', 'damaged']) }),
      execute: async ({ binId, problem }) => {
        const r = await createBinReport({ pointId: binId, kind: problem, deviceId: ctx.deviceId });
        if (!r.ok) return { ok: false, error: r.status === 409 ? tx('Το έχεις ήδη αναφέρει τις τελευταίες 6 ώρες.', 'Already reported in the last 6 hours.') : r.error };
        return { ok: true, reportsOpenForBin: r.openForBin, cityRequest: r.city };
      },
    }),
    requestBulkyPickup: tool({
      description: "Ask the city to collect a bulky item from the user's door (the user approves first). The address goes only to the city and is not stored by RecycleIQ.",
      inputSchema: z.object({
        objectId: z.string().default('sofa').describe('Catalogue item id, e.g. sofa'),
        address: z.string().min(3).max(200).describe('Pickup street address the user gave'),
        note: z.string().max(300).optional(),
      }),
      execute: async ({ objectId, address, note }) => {
        const r = await createBulkyRequest({ objectId, address, note, districtId: ctx.districtId, deviceId: ctx.deviceId });
        if (!r.ok) return { ok: false, error: r.status === 503 ? tx('Η σύνδεση με τα αιτήματα του Δήμου δεν είναι ενεργή.', 'City requests are not connected.') : r.error };
        return { ok: true, cityRequest: r.city };
      },
    }),
  };

  const municipal = {
    acknowledgeAlerts: tool({
      description: 'Take on the open reports of a bin: a crew is on it (also updates the city request). Needs a bin id from openAlerts. The user approves first.',
      inputSchema: z.object({ binId: z.string().min(1).max(64) }),
      execute: async ({ binId }) => ({ ok: true, reportsTakenOn: await acknowledgeBinAlerts(binId) }),
    }),
    resolveAlerts: tool({
      description: 'Mark a bin as emptied or repaired: closes its reports and the city request. Needs a bin id from openAlerts. The user approves first.',
      inputSchema: z.object({ binId: z.string().min(1).max(64) }),
      execute: async ({ binId }) => ({ ok: true, reportsResolved: await resolveBinAlerts(binId) }),
    }),
    setRuleEnabled: tool({
      description: 'Switch a municipal rule on or off (takes effect on the next decision in the app; logged). Needs a rule code from listRules. The user approves first.',
      inputSchema: z.object({ code: z.string().min(2).max(32), enabled: z.boolean() }),
      execute: async ({ code, enabled }) => {
        if (!isRuleCode(code)) return { ok: false, error: 'Unknown rule code' };
        await setRuleEnabled(code, enabled, 'assistant');
        return { ok: true, code, enabled };
      },
    }),
  };

  return ctx.mode === 'municipal' ? { ...read, ...municipal } : { ...read, ...citizen };
}

export type AssistantTools = ReturnType<typeof buildTools> & ToolSet;

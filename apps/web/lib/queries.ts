import 'server-only';
import { getDb, sql } from '@recycleiq/db';
import type { CategoryId, L10n, OrganicService } from '@recycleiq/engine';

const since = (days: number) => sql`now() - make_interval(days => ${days})`;
const between = (from: number, to: number) =>
  sql`created_at >= now() - make_interval(days => ${from}) and created_at < now() - make_interval(days => ${to})`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

export interface Kpis {
  requests: number;
  requestsPrev: number;
  clarificationRate: number;
  avgConfidence: number;
  uncertainRate: number;
  checkins: number;
  coupons: number;
  brownBinRequests: number;
  activeDevices: number;
}

export async function getKpis(days: number, districtId?: string): Promise<Kpis> {
  const db = getDb();
  const d = districtId ? sql`and district_id = ${districtId}` : sql``;
  const [cur] = (
    await db.execute(sql`
      select count(*) as requests,
             avg(case when clarified then 1 else 0 end) as clar,
             avg(confidence) as conf,
             avg(case when uncertain then 1 else 0 end) as unc,
             count(distinct device_id) as devices
      from decisions where created_at >= ${since(days)} ${d}`)
  ).rows;
  const [prev] = (
    await db.execute(sql`select count(*) as n from decisions where ${between(days * 2, days)} ${d}`)
  ).rows;
  const [chk] = (
    await db.execute(sql`select count(*) as n, coalesce(sum(earned),0) as coupons from checkins where created_at >= ${since(days)} ${d}`)
  ).rows;
  const [req] = (
    await db.execute(sql`select count(*) as n from service_requests where kind = 'brown_bin' and created_at >= ${since(days)} ${d}`)
  ).rows;
  return {
    requests: num(cur?.requests),
    requestsPrev: num(prev?.n),
    clarificationRate: num(cur?.clar),
    avgConfidence: num(cur?.conf),
    uncertainRate: num(cur?.unc),
    activeDevices: num(cur?.devices),
    checkins: num(chk?.n),
    coupons: num(chk?.coupons),
    brownBinRequests: num(req?.n),
  };
}

export async function getDailySeries(days: number, districtId?: string) {
  const d = districtId ? sql`and d.district_id = ${districtId}` : sql``;
  const rows = (
    await getDb().execute(sql`
      select to_char(day, 'YYYY-MM-DD') as day, count(d.id) as n
      from generate_series(date_trunc('day', now()) - make_interval(days => ${days - 1}), date_trunc('day', now()), interval '1 day') as day
      left join decisions d on date_trunc('day', d.created_at) = day ${d}
      group by day order by day`)
  ).rows;
  return rows.map((r) => ({ day: String(r.day), n: num(r.n) }));
}

export async function getCategoryMix(days: number, districtId?: string) {
  const d = districtId ? sql`and district_id = ${districtId}` : sql``;
  const rows = (
    await getDb().execute(sql`
      select category, count(*) as n from decisions
      where created_at >= ${since(days)} and not uncertain ${d}
      group by category order by n desc`)
  ).rows;
  return rows.map((r) => ({ category: r.category as CategoryId, n: num(r.n) }));
}

export async function getTopItems(days: number, districtId?: string) {
  const d = districtId ? sql`and district_id = ${districtId}` : sql``;
  const rows = (
    await getDb().execute(sql`
      select object_id, count(*) as n,
             avg(case when clarified then 1 else 0 end) as clar,
             avg(confidence) as conf
      from decisions where created_at >= ${since(days)} ${d}
      group by object_id order by n desc`)
  ).rows;
  return rows.map((r) => ({
    objectId: String(r.object_id),
    n: num(r.n),
    clarificationRate: num(r.clar),
    avgConfidence: num(r.conf),
  }));
}

export interface DistrictRow {
  id: string;
  name: L10n;
  communityId: string;
  organicService: OrganicService;
  svgPath: string;
  svgCentroid: { x: number; y: number };
  requests: number;
  avgConfidence: number;
  clarificationRate: number;
  topCategory: CategoryId | null;
  brownBinRequests: number;
  points: number;
}

export async function getDistrictStats(days: number): Promise<DistrictRow[]> {
  const rows = (
    await getDb().execute(sql`
      with dec as (
        select district_id, count(*) as n, avg(confidence) as conf,
               avg(case when clarified then 1 else 0 end) as clar,
               mode() within group (order by category) as top
        from decisions where created_at >= ${since(days)} and district_id is not null
        group by district_id),
      req as (
        select district_id, count(*) as n from service_requests
        where kind = 'brown_bin' and created_at >= ${since(days)} group by district_id),
      pts as (select district_id, count(*) as n from collection_points group by district_id)
      select d.id, d.name, d.community_id, d.organic_service, d.svg_path, d.svg_centroid,
             coalesce(dec.n,0) as requests, dec.conf, dec.clar, dec.top,
             coalesce(req.n,0) as brown, coalesce(pts.n,0) as points
      from districts d
      left join dec on dec.district_id = d.id
      left join req on req.district_id = d.id
      left join pts on pts.district_id = d.id
      order by requests desc`)
  ).rows;
  return rows.map((r) => ({
    id: String(r.id),
    name: r.name as L10n,
    communityId: String(r.community_id),
    organicService: r.organic_service as OrganicService,
    svgPath: String(r.svg_path),
    svgCentroid: r.svg_centroid as { x: number; y: number },
    requests: num(r.requests),
    avgConfidence: num(r.conf),
    clarificationRate: num(r.clar),
    topCategory: (r.top as CategoryId | null) ?? null,
    brownBinRequests: num(r.brown),
    points: num(r.points),
  }));
}

export async function getRecentDecisions(limit = 8) {
  const rows = (
    await getDb().execute(sql`
      select d.id, d.created_at, d.object_id, d.decision_key, d.category, d.confidence,
             d.uncertain, d.via, d.synthetic, dist.name as district
      from decisions d left join districts dist on dist.id = d.district_id
      order by d.created_at desc limit ${limit}`)
  ).rows;
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: new Date(String(r.created_at)),
    objectId: String(r.object_id),
    key: String(r.decision_key),
    category: r.category as CategoryId,
    confidence: num(r.confidence),
    uncertain: Boolean(r.uncertain),
    via: String(r.via),
    synthetic: Boolean(r.synthetic),
    district: (r.district as L10n | null) ?? null,
  }));
}

export async function getRuleChanges(limit = 10) {
  const rows = (
    await getDb().execute(sql`
      select c.code, c.enabled, c.changed_at, c.changed_by, r.title
      from rule_changes c join rules r on r.code = c.code
      order by c.changed_at desc limit ${limit}`)
  ).rows;
  return rows.map((r) => ({
    code: String(r.code),
    enabled: Boolean(r.enabled),
    changedAt: new Date(String(r.changed_at)),
    changedBy: r.changed_by ? String(r.changed_by) : null,
    title: r.title as L10n,
  }));
}

export const BIN_KINDS = {
  blue_bin: { el: 'Μπλε κάδοι', en: 'Blue bins', category: 'packaging' },
  glass_bell: { el: 'Καμπάνες γυαλιού', en: 'Glass bells', category: 'packaging' },
  brown_bin: { el: 'Καφέ κάδοι', en: 'Brown bins', category: 'organic' },
  battery_point: { el: 'Σημεία μπαταριών', en: 'Battery points', category: 'special' },
  weee_point: { el: 'Σημεία συσκευών', en: 'WEEE points', category: 'special' },
  clothing_bin: { el: 'Κάδοι ρούχων', en: 'Clothing bins', category: 'special' },
  green_point: { el: 'Πράσινα σημεία', en: 'Green points', category: 'bulky' },
} as const satisfies Record<string, { el: string; en: string; category: CategoryId }>;

/** Bins and points by type, for one district or the whole city. */
export async function getBinsByKind(districtId?: string) {
  const d = districtId ? sql`where district_id = ${districtId}` : sql``;
  const rows = (
    await getDb().execute(sql`
      select kind, count(*) as n, count(*) filter (where status <> 'available') as issues
      from collection_points ${d} group by kind order by n desc`)
  ).rows;
  return rows.map((r) => ({ kind: String(r.kind) as keyof typeof BIN_KINDS, n: num(r.n), issues: num(r.issues) }));
}

export interface AlertRow {
  pointId: string;
  pointName: L10n;
  pointKind: string;
  district: L10n | null;
  reports: number;
  kinds: string[];
  firstAt: Date;
  lastAt: Date;
  status: 'open' | 'acknowledged';
}

/** Open full-bin alerts, one row per bin, oldest problem first. */
export async function getOpenAlerts(): Promise<AlertRow[]> {
  const rows = (
    await getDb().execute(sql`
      select r.point_id, p.name as point_name, p.kind as point_kind, d.name as district,
             count(*) as reports, array_agg(distinct r.kind) as kinds,
             min(r.created_at) as first_at, max(r.created_at) as last_at,
             case when bool_or(r.status = 'open') then 'open' else 'acknowledged' end as status
      from bin_reports r
      join collection_points p on p.id = r.point_id
      left join districts d on d.id = r.district_id
      where r.status in ('open', 'acknowledged')
      group by r.point_id, p.name, p.kind, d.name
      order by status desc, first_at asc`)
  ).rows;
  return rows.map((r) => ({
    pointId: String(r.point_id),
    pointName: r.point_name as L10n,
    pointKind: String(r.point_kind),
    district: (r.district as L10n | null) ?? null,
    reports: num(r.reports),
    kinds: (r.kinds as string[]) ?? [],
    firstAt: new Date(String(r.first_at)),
    lastAt: new Date(String(r.last_at)),
    status: r.status as 'open' | 'acknowledged',
  }));
}

export async function getAlertStats() {
  const [r] = (
    await getDb().execute(sql`
      select count(*) filter (where status = 'open') as open,
             count(*) filter (where status = 'acknowledged') as acknowledged,
             count(*) filter (where status = 'resolved' and resolved_at >= now() - interval '7 days') as resolved7,
             avg(extract(epoch from (resolved_at - created_at)) / 3600) filter (where status = 'resolved' and resolved_at >= now() - interval '7 days') as hours
      from bin_reports`)
  ).rows;
  return { open: num(r?.open), acknowledged: num(r?.acknowledged), resolved7: num(r?.resolved7), avgHoursToResolve: num(r?.hours) };
}

export async function getOpenAlertCount() {
  const [r] = (await getDb().execute(sql`select count(distinct point_id) as n from bin_reports where status = 'open'`)).rows;
  return num(r?.n);
}

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

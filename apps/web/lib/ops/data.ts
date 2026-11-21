import 'server-only';
import { getDb, sql } from '@recycleiq/db';
import type { L10n } from '@recycleiq/engine';
import type { BinSource } from '@/lib/bins';
import { getPoints } from '@/lib/data';
import type { BinKind, Stream } from './fleet-sim';

/** Our point kinds → the simulator's bin classes (capacity and filling rate). */
export function simKind(pointKind: string): BinKind {
  if (pointKind === 'litter_bin') return 'b';
  if (pointKind === 'general_bin') return 'd';
  return 'r';
}
export const streamOf = (pointKind: string): Stream => (simKind(pointKind) === 'r' ? 'recycling' : 'general');

/** Bins of the dashboard's current bin source, compact for the browser simulation. */
export async function getFleetBins(source: BinSource) {
  const points = await getPoints(source);
  return points.map((p) => ({ id: p.id, lat: p.lat, lon: p.lng, kind: simKind(p.kind), name: p.name }));
}

/** Open citizen reports (one per bin) with the bin's location, for the fleet map. */
export async function getOpenReportLocations() {
  const rows = (
    await getDb().execute(sql`
      select r.point_id, p.name, p.kind, p.lat, p.lng, count(*) as reports, min(r.created_at) as first_at
      from bin_reports r join collection_points p on p.id = r.point_id
      where r.status in ('open', 'acknowledged')
      group by r.point_id, p.name, p.kind, p.lat, p.lng
      order by first_at asc`)
  ).rows;
  return rows.map((r) => ({
    id: String(r.point_id),
    name: r.name as L10n,
    kind: String(r.kind),
    stream: streamOf(String(r.kind)),
    lat: Number(r.lat),
    lon: Number(r.lng),
    reports: Number(r.reports),
  }));
}

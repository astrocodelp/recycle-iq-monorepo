import type { CollectionPoint, DistrictContext, PointQuery, RankedPoint } from './types';

const EARTH_RADIUS_M = 6371008.8;
const rad = Math.PI / 180;

export interface LngLat {
  lng: number;
  lat: number;
}

/** Great-circle distance in metres. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Syntagma: the default location when the user has not picked a neighbourhood. */
export const DEFAULT_LOCATION: LngLat = { lng: 23.7336, lat: 37.97503 };

export function matchesQuery(point: CollectionPoint, q: PointQuery): boolean {
  if (!point.categories.includes(q.category)) return false;
  if (q.glassBell && !point.glassBell) return false;
  if (q.accepts === 'batteries' && !point.accepts.includes('batteries')) return false;
  if (q.accepts === 'textiles' && !point.accepts.includes('textiles')) return false;
  if (q.accepts === 'weee' && !point.accepts.some((a) => a === 'weee_small' || a === 'weee_large'))
    return false;
  return true;
}

/** Nearest matching points; closed points sink to the bottom (rule ATH-LOC-01 ranks by distance). */
export function rankPoints(
  points: readonly CollectionPoint[],
  query: PointQuery,
  from: LngLat,
  limit = 3,
): RankedPoint[] {
  return points
    .filter((p) => matchesQuery(p, query))
    .map((p) => ({ ...p, distance: haversine(p, from) }))
    .sort(
      (a, b) => +(a.status === 'closed') - +(b.status === 'closed') || a.distance - b.distance,
    )
    .slice(0, limit);
}

/** Whole-city context: organic service is full/none only if every district agrees. */
export function cityContext(districts: readonly Pick<DistrictContext, 'organicService'>[]): DistrictContext {
  const all = (s: string) => districts.length > 0 && districts.every((d) => d.organicService === s);
  return {
    id: 'athens',
    name: { el: 'Αθήνα', en: 'Athens' },
    organicService: all('full') ? 'full' : all('none') ? 'none' : 'partial',
  };
}

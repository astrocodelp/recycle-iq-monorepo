// Ported from github.com/Mike17K/recycleiq-delta-sort (ops/server/geo.js); see NOTICE.
/** Small geo helpers (WGS84, local equirectangular approximation: fine for city-scale distances). */
export interface LatLon {
  lat: number;
  lon: number;
}
const M_LAT = 111320;
const mLon = (lat: number) => M_LAT * Math.cos((lat * Math.PI) / 180);

export function distance(a: LatLon, b: LatLon): number {
  const dx = (b.lon - a.lon) * mLon((a.lat + b.lat) / 2);
  const dy = (b.lat - a.lat) * M_LAT;
  return Math.hypot(dx, dy);
}

/** Compass heading in degrees (0 = north, 90 = east) from a to b. */
export function bearing(a: LatLon, b: LatLon): number {
  const dx = (b.lon - a.lon) * mLon(a.lat);
  const dy = (b.lat - a.lat) * M_LAT;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

export function nearest<T>(p: LatLon, items: T[], key: (x: T) => LatLon = (x) => x as unknown as LatLon) {
  let best: T | null = null;
  let bd = Infinity;
  for (const it of items) {
    const d = distance(p, key(it));
    if (d < bd) {
      bd = d;
      best = it;
    }
  }
  return best ? { item: best, dist: bd } : null;
}

/** Deterministic k-means on points: returns k clusters (arrays of indices into `points`). */
export function kmeans(points: LatLon[], k: number, iterations = 12): number[][] {
  if (!points.length || k <= 0) return Array.from({ length: Math.max(0, k) }, () => []);
  const order = points.map((_, i) => i).sort((a, b) => points[a]!.lon - points[b]!.lon || points[a]!.lat - points[b]!.lat);
  let centers: LatLon[] = Array.from({ length: k }, (_, c) => ({ ...points[order[Math.floor(((c + 0.5) * points.length) / k)]!]! }));
  let groups: number[][] = [];
  for (let it = 0; it < iterations; it++) {
    groups = Array.from({ length: k }, () => []);
    points.forEach((p, i) => {
      let b = 0;
      let bd = Infinity;
      centers.forEach((c, j) => {
        const d = distance(p, c);
        if (d < bd) {
          bd = d;
          b = j;
        }
      });
      groups[b]!.push(i);
    });
    centers = groups.map((g, j) =>
      g.length
        ? { lat: g.reduce((s, i) => s + points[i]!.lat, 0) / g.length, lon: g.reduce((s, i) => s + points[i]!.lon, 0) / g.length }
        : centers[j]!,
    );
  }
  return groups;
}

/** Seeded PRNG (mulberry32), same as the sorter simulation's. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

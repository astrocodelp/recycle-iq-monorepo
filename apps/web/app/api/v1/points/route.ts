import { CATEGORY_IDS, DEFAULT_LOCATION, haversine, matchesQuery } from '@recycleiq/engine';
import { getDistrictContext, getPoints } from '@/lib/data';
import { z } from 'zod';
import { error } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Query = z.object({
  category: z.enum(CATEGORY_IDS).optional(),
  district: z.string().optional(),
  /** Sort by distance from this neighbourhood's centre. Coordinates are never accepted (GDPR). */
  near: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
  /** synthetic (default) or osm: real bins from OpenStreetMap, © OpenStreetMap contributors (ODbL). */
  source: z.enum(['synthetic', 'osm']).default('synthetic'),
});

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return error(400, 'Invalid query', parsed.error.issues);
  const q = parsed.data;
  const from = q.near ? (await getDistrictContext(q.near)).centre : DEFAULT_LOCATION;
  const points = (await getPoints(q.source))
    .filter((p) => !q.category || matchesQuery(p, { category: q.category }))
    .filter((p) => !q.district || p.districtId === q.district)
    .map((p) => ({ ...p, distance: Math.round(haversine(p, from)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, q.limit);
  return Response.json({
    points,
    meta:
      q.source === 'osm'
        ? { source: 'osm', illustrative: false, attribution: '© OpenStreetMap contributors, ODbL 1.0' }
        : { source: 'mock', illustrative: true, note: 'Ενδεικτικά σημεία για την παρουσίαση — όχι επίσημα δημοτικά δεδομένα' },
  });
}

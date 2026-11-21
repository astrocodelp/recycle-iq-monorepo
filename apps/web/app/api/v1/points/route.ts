import { CATEGORY_IDS, DEFAULT_LOCATION, haversine, matchesQuery } from '@recycleiq/engine';
import { z } from 'zod';
import { error } from '@/lib/api';
import { getPoints } from '@/lib/data';

export const dynamic = 'force-dynamic';

const Query = z.object({
  category: z.enum(CATEGORY_IDS).optional(),
  district: z.string().optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return error(400, 'Invalid query', parsed.error.issues);
  const q = parsed.data;
  const from = q.lng != null && q.lat != null ? { lng: q.lng, lat: q.lat } : DEFAULT_LOCATION;
  const points = (await getPoints())
    .filter((p) => !q.category || matchesQuery(p, { category: q.category }))
    .filter((p) => !q.district || p.districtId === q.district)
    .map((p) => ({ ...p, distance: Math.round(haversine(p, from)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, q.limit);
  return Response.json({
    points,
    meta: { source: 'mock', illustrative: true, note: 'Ενδεικτικά σημεία για την παρουσίαση — όχι επίσημα δημοτικά δεδομένα' },
  });
}

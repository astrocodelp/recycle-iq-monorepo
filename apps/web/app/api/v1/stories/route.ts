import { STORY_THRESHOLDS, nextLocked } from '@recycleiq/engine';
import { z } from 'zod';
import { error } from '@/lib/api';
import { scansInDistrict, storiesFor } from '@/lib/stories';

export const dynamic = 'force-dynamic';

const Query = z.object({
  district: z.string().min(1).max(64),
  deviceId: z.string().max(64).optional(),
  /** Bin inventory for the numbers story: synthetic (default) or osm. */
  source: z.enum(['synthetic', 'osm']).default('synthetic'),
});

/**
 * Neighbourhood stories: the reward for scanning. Each one unlocks after a number of scans in that
 * neighbourhood. Locked stories return only their title and the scans needed.
 */
export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return error(400, 'Invalid query', parsed.error.issues);
  const { district, deviceId, source } = parsed.data;
  const [stories, scans] = await Promise.all([storiesFor(district, source), deviceId ? scansInDistrict(deviceId, district) : 0]);
  if (!stories.length) return error(404, 'Unknown district');
  const next = nextLocked(scans, stories.length);
  return Response.json({
    district,
    scans,
    thresholds: STORY_THRESHOLDS,
    next: next == null ? null : { index: next, threshold: stories[next]!.threshold, remaining: stories[next]!.threshold - scans },
    stories: stories.map((s) => (scans >= s.threshold ? { ...s, unlocked: true } : { id: s.id, kind: s.kind, title: s.title, threshold: s.threshold, unlocked: false })),
    note: { el: 'Ιστορίες σε μορφή πρόχειρου, προς επιβεβαίωση από τον Δήμο', en: 'Draft stories, to be verified by the municipality' },
  });
}

import { z } from 'zod';
import { deviceIdFrom, parseBody } from '@/lib/api';
import { makeDecision } from '@/lib/data';

export const dynamic = 'force-dynamic';

const Body = z.object({
  objectId: z.string().min(1).max(64),
  answers: z.record(z.string(), z.string().max(32)).default({}),
  districtId: z.string().max(64).nullish(),
  deviceId: z.string().max(64).optional(),
  via: z.enum(['search', 'scan', 'api']).default('api'),
});

/**
 * Ask the engine where an item goes. The decision is logged for municipal analytics.
 * Privacy: only a neighbourhood (districtId) is accepted. GPS coordinates are resolved to a
 * neighbourhood on the phone and never sent; unknown fields such as `location` are discarded.
 */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const { id, decision, nearby, unlockedStory } = await makeDecision({
    ...body.data,
    deviceId: deviceIdFrom(req, body.data),
  });
  return Response.json({ id, decision, nearby, unlockedStory }, { status: 201 });
}

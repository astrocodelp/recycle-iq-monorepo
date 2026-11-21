import { z } from 'zod';
import { deviceIdFrom, parseBody } from '@/lib/api';
import { makeDecision } from '@/lib/data';

export const dynamic = 'force-dynamic';

const Body = z.object({
  objectId: z.string().min(1).max(64),
  answers: z.record(z.string(), z.string().max(32)).default({}),
  districtId: z.string().max(64).nullish(),
  location: z.object({ lng: z.number().min(-180).max(180), lat: z.number().min(-90).max(90) }).nullish(),
  deviceId: z.string().max(64).optional(),
  via: z.enum(['search', 'scan', 'api']).default('api'),
});

/** Ask the engine where an item goes. The decision is logged for municipal analytics. */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const { id, decision, nearby } = await makeDecision({
    ...body.data,
    deviceId: deviceIdFrom(req, body.data),
  });
  return Response.json({ id, decision, nearby }, { status: 201 });
}

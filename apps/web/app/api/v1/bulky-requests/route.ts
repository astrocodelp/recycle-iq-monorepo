import { z } from 'zod';
import { deviceIdFrom, error, parseBody } from '@/lib/api';
import { createBulkyRequest } from '@/lib/bulky';

export const dynamic = 'force-dynamic';

const Body = z.object({
  objectId: z.string().min(1).max(64),
  districtId: z.string().max(64).nullish(),
  /** Where to collect from. Sent to the city for the pickup only; RecycleIQ does not store it. */
  address: z.string().trim().min(3).max(200),
  note: z.string().trim().max(500).optional(),
  deviceId: z.string().max(64).optional(),
});

/** Ask the city to collect a bulky item (see lib/bulky.ts). */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const res = await createBulkyRequest({ ...body.data, deviceId: deviceIdFrom(req, body.data) });
  if (!res.ok) return error(res.status, res.error);
  return Response.json({ id: res.id, city: res.city }, { status: 201 });
}

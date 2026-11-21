import { getDb, serviceRequests } from '@recycleiq/db';
import { z } from 'zod';
import { deviceIdFrom, parseBody } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Body = z.object({
  districtId: z.string().max(64),
  kind: z.enum(['brown_bin']).default('brown_bin'),
  deviceId: z.string().max(64).optional(),
});

/** "Request a brown bin" — every request counts towards service planning. */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const [row] = await getDb()
    .insert(serviceRequests)
    .values({ districtId: body.data.districtId, kind: body.data.kind, deviceId: deviceIdFrom(req, body.data) })
    .returning();
  return Response.json({ request: row }, { status: 201 });
}

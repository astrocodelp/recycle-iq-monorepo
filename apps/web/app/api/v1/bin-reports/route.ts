import { z } from 'zod';
import { deviceIdFrom, error, parseBody } from '@/lib/api';
import { createBinReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const Body = z.object({
  pointId: z.string().min(1).max(64),
  kind: z.enum(['full', 'overflowing', 'damaged']),
  deviceId: z.string().max(64).optional(),
});

/** A resident reports a full, overflowing or damaged bin (see lib/reports.ts). */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const res = await createBinReport({ ...body.data, deviceId: deviceIdFrom(req, body.data) });
  if (!res.ok) return error(res.status, res.error, res.reportId ? { reportId: res.reportId } : undefined);
  return Response.json({ report: res.report, openForBin: res.openForBin, city: res.city }, { status: 201 });
}

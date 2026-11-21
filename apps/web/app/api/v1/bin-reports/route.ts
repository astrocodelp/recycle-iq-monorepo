import { and, binReports, collectionPoints, eq, getDb, gte, inArray, sql } from '@recycleiq/db';
import { z } from 'zod';
import { deviceIdFrom, error, parseBody } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Body = z.object({
  pointId: z.string().min(1).max(64),
  kind: z.enum(['full', 'overflowing', 'damaged']),
  deviceId: z.string().max(64).optional(),
});

/** Two open reports for one bin mark it as full on the map until the municipality resolves them. */
const MARK_FULL_AT = 2;
const DUPLICATE_WINDOW_H = 6;

/**
 * A resident reports a full, overflowing or damaged bin. The photo is checked on the phone and
 * not uploaded: we receive only the bin, the kind of problem and the time.
 */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const { pointId, kind } = body.data;
  const deviceId = deviceIdFrom(req, body.data);
  const db = getDb();

  const [point] = await db.select().from(collectionPoints).where(eq(collectionPoints.id, pointId));
  if (!point) return error(404, 'Unknown bin');

  if (deviceId) {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_H * 3_600_000);
    const [dup] = await db
      .select({ id: binReports.id })
      .from(binReports)
      .where(and(eq(binReports.pointId, pointId), eq(binReports.deviceId, deviceId), gte(binReports.createdAt, since)));
    if (dup) return error(409, 'Already reported', { reportId: dup.id });
  }

  const [report] = await db
    .insert(binReports)
    .values({ pointId, districtId: point.districtId, kind, deviceId })
    .returning();

  const [{ open } = { open: 0 }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(binReports)
    .where(and(eq(binReports.pointId, pointId), inArray(binReports.status, ['open', 'acknowledged'])));
  if (kind !== 'damaged' && open >= MARK_FULL_AT && point.status === 'available')
    await db.update(collectionPoints).set({ status: 'full' }).where(eq(collectionPoints.id, pointId));

  return Response.json({ report, openForBin: open }, { status: 201 });
}

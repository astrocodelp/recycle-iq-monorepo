import { checkins, desc, eq, getDb, sql } from '@recycleiq/db';
import { COUPONS_PER_EURO } from '@recycleiq/engine';
import { error } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get('deviceId') ?? req.headers.get('x-device-id');
  if (!deviceId) return error(400, 'deviceId is required');
  const db = getDb();
  const [totals] = await db
    .select({ balance: sql<number>`coalesce(sum(${checkins.earned}),0)::int`, count: sql<number>`count(*)::int` })
    .from(checkins)
    .where(eq(checkins.deviceId, deviceId));
  const history = await db
    .select()
    .from(checkins)
    .where(eq(checkins.deviceId, deviceId))
    .orderBy(desc(checkins.createdAt))
    .limit(20);
  return Response.json({
    balance: totals?.balance ?? 0,
    checkins: totals?.count ?? 0,
    couponsPerEuro: COUPONS_PER_EURO,
    history,
    meta: { note: 'Ενδεικτικές τιμές' },
  });
}

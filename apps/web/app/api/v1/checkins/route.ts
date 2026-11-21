import { checkins, decisions, desc, eq, getDb } from '@recycleiq/db';
import { checkinReward } from '@recycleiq/engine';
import { z } from 'zod';
import { error, parseBody } from '@/lib/api';

export const dynamic = 'force-dynamic';

const Body = z.object({
  deviceId: z.string().min(8).max(64),
  decisionId: z.uuid().optional(),
  districtId: z.string().max(64).nullish(),
});

const DAY = 86_400_000;
const dayIndex = (d: Date) => Math.floor(d.getTime() / DAY);

/**
 * Daily bin check-in. The photo check (bin detected, location, liveness, unique photo) happens
 * on the device/vision service in the pilot; this endpoint applies the reward rules.
 * One check-in per device per 24 hours.
 */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const { deviceId, decisionId, districtId } = body.data;
  const db = getDb();

  const recent = await db
    .select({ createdAt: checkins.createdAt })
    .from(checkins)
    .where(eq(checkins.deviceId, deviceId))
    .orderBy(desc(checkins.createdAt))
    .limit(60);
  const now = new Date();
  if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < DAY)
    return error(429, 'One check-in every 24 hours', {
      nextAt: new Date(recent[0].createdAt.getTime() + DAY).toISOString(),
    });

  // Consecutive days with a check-in, ending yesterday.
  const days = new Set(recent.map((r) => dayIndex(r.createdAt)));
  let streakBefore = 0;
  for (let d = dayIndex(now) - 1; days.has(d); d--) streakBefore++;

  const decision = decisionId
    ? (await db.select().from(decisions).where(eq(decisions.id, decisionId)))[0]
    : undefined;
  const reward = checkinReward({
    streakBefore,
    matchesScan: !!decision && !decision.uncertain,
    specialDropOff: decision?.category === 'special',
  });
  const [row] = await db
    .insert(checkins)
    .values({
      deviceId,
      decisionId: decision?.id,
      districtId: districtId ?? decision?.districtId ?? null,
      earned: reward.earned,
      breakdown: reward.breakdown,
    })
    .returning();
  return Response.json({ checkin: row, reward, streak: streakBefore + 1 }, { status: 201 });
}

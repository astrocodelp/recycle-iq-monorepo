import { eq, getDb, players } from '@recycleiq/db';
import { defaultNickname, isValidNickname } from '@recycleiq/engine';
import { z } from 'zod';
import { error, parseBody } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const deviceId = sp.get('deviceId');
  if (!deviceId) return error(400, 'deviceId is required');
  const [row] = await getDb().select().from(players).where(eq(players.deviceId, deviceId));
  return Response.json({ nickname: row?.nickname ?? defaultNickname(deviceId, sp.get('lang') === 'en' ? 'en' : 'el'), custom: !!row });
}

const Body = z.object({ deviceId: z.string().min(8).max(64), nickname: z.string().max(40) });

/** Set (or, with an empty nickname, clear) the leaderboard nickname for an install. */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const { deviceId } = body.data;
  const nickname = body.data.nickname.trim().replace(/\s+/g, ' ');
  const db = getDb();
  if (!nickname) {
    await db.delete(players).where(eq(players.deviceId, deviceId));
    return Response.json({ nickname: defaultNickname(deviceId), custom: false });
  }
  if (!isValidNickname(nickname)) return error(400, 'Nickname must be 2–24 letters, digits or spaces');
  await db
    .insert(players)
    .values({ deviceId, nickname })
    .onConflictDoUpdate({ target: players.deviceId, set: { nickname, updatedAt: new Date() } });
  return Response.json({ nickname, custom: true });
}

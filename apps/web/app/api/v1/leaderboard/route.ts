import { z } from 'zod';
import { error } from '@/lib/api';
import { getLeaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

const Query = z.object({
  period: z.enum(['week', 'month']).default('week'),
  district: z.string().max(64).optional(),
  deviceId: z.string().max(64).optional(),
  lang: z.enum(['el', 'en']).default('el'),
});

/** Who scans the most (see lib/leaderboard.ts). Only nicknames and ranks leave the server. */
export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return error(400, 'Invalid query', parsed.error.issues);
  return Response.json(await getLeaderboard(parsed.data));
}

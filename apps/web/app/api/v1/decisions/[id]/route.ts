import { decisions, eq, getDb } from '@recycleiq/db';
import { error } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: RouteContext<'/api/v1/decisions/[id]'>) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error(404, 'Not found');
  const [row] = await getDb().select().from(decisions).where(eq(decisions.id, id));
  if (!row) return error(404, 'Not found');
  return Response.json({ id: row.id, createdAt: row.createdAt, decision: row.payload });
}

import { error } from '@/lib/api';
import { pointById } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** One collection point. Used by bin QR codes (recycleiq://bin/<id>). */
export async function GET(_req: Request, ctx: RouteContext<'/api/v1/points/[id]'>) {
  const { id } = await ctx.params;
  const p = await pointById(id);
  if (!p) return error(404, 'Not found');
  return Response.json({ point: p });
}

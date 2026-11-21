import { binReports, eq, getDb, serviceRequests } from '@recycleiq/db';
import { error } from '@/lib/api';
import { getCityRequest, tryCity } from '@/lib/athens';

export const dynamic = 'force-dynamic';

/** Live status of a city request that RecycleIQ filed (bulky pickup or full-bin report). */
export async function GET(_req: Request, ctx: RouteContext<'/api/v1/city-requests/[id]'>) {
  const { id } = await ctx.params;
  const db = getDb();
  const [ours] = await db.select({ id: serviceRequests.id }).from(serviceRequests).where(eq(serviceRequests.cityRequestId, id));
  const [report] = ours ? [] : await db.select({ id: binReports.id }).from(binReports).where(eq(binReports.cityRequestId, id)).limit(1);
  if (!ours && !report) return error(404, 'Unknown request');
  const city = await tryCity(() => getCityRequest(id));
  if (!city) return error(502, 'The city request system did not answer');
  const now = new Date();
  await Promise.all([
    db.update(serviceRequests).set({ cityStatus: city.status, citySyncedAt: now }).where(eq(serviceRequests.cityRequestId, id)),
    db.update(binReports).set({ cityStatus: city.status, citySyncedAt: now }).where(eq(binReports.cityRequestId, id)),
  ]);
  return Response.json({ id: city.id, status: city.status, updatedAt: city.updated_at ?? null, history: city.history ?? [] });
}

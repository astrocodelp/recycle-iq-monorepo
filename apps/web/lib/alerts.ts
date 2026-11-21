import 'server-only';
import { and, binReports, collectionPoints, eq, getDb, inArray } from '@recycleiq/db';
import { tryCity, updateCityRequest, type CityStatus } from '@/lib/athens';

/** Mirror our status on the city's request(s) for this bin, best effort. */
async function mirrorToCity(pointId: string, status: CityStatus, note: string) {
  const rows = await getDb()
    .selectDistinct({ id: binReports.cityRequestId })
    .from(binReports)
    .where(and(eq(binReports.pointId, pointId), inArray(binReports.status, ['open', 'acknowledged'])));
  const ids = rows.map((r) => r.id).filter((x): x is string => !!x);
  await Promise.all(
    ids.map(async (id) => {
      const r = await tryCity(() => updateCityRequest(id, status, note));
      if (r) await getDb().update(binReports).set({ cityStatus: r.status, citySyncedAt: new Date() }).where(eq(binReports.cityRequestId, id));
    }),
  );
}

/** A crew is on it: open reports for this bin become acknowledged. Returns how many changed. */
export async function acknowledgeBinAlerts(pointId: string): Promise<number> {
  await mirrorToCity(pointId, 'in_progress', 'Ανάληψη από συνεργείο (RecycleIQ)');
  const rows = await getDb()
    .update(binReports)
    .set({ status: 'acknowledged', acknowledgedAt: new Date() })
    .where(and(eq(binReports.pointId, pointId), eq(binReports.status, 'open')))
    .returning({ id: binReports.id });
  return rows.length;
}

/** Emptied or repaired: close every report for the bin and show it as available again. Returns how many closed. */
export async function resolveBinAlerts(pointId: string): Promise<number> {
  await mirrorToCity(pointId, 'resolved', 'Ο κάδος αδειάστηκε ή επισκευάστηκε (RecycleIQ)');
  const db = getDb();
  const rows = await db
    .update(binReports)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(and(eq(binReports.pointId, pointId), inArray(binReports.status, ['open', 'acknowledged'])))
    .returning({ id: binReports.id });
  await db.update(collectionPoints).set({ status: 'available', lastVerifiedAt: new Date() }).where(eq(collectionPoints.id, pointId));
  return rows.length;
}

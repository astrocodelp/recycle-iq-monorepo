'use server';

import { and, binReports, collectionPoints, eq, getDb, inArray } from '@recycleiq/db';
import { revalidatePath } from 'next/cache';

/** A crew is on it: open reports for this bin become acknowledged. */
export async function acknowledgeBin(formData: FormData) {
  const pointId = String(formData.get('pointId'));
  await getDb()
    .update(binReports)
    .set({ status: 'acknowledged', acknowledgedAt: new Date() })
    .where(and(eq(binReports.pointId, pointId), eq(binReports.status, 'open')));
  revalidatePath('/alerts');
}

/** Emptied or repaired: close every report for the bin and show it as available again. */
export async function resolveBin(formData: FormData) {
  const pointId = String(formData.get('pointId'));
  const db = getDb();
  await db
    .update(binReports)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(and(eq(binReports.pointId, pointId), inArray(binReports.status, ['open', 'acknowledged'])));
  await db.update(collectionPoints).set({ status: 'available', lastVerifiedAt: new Date() }).where(eq(collectionPoints.id, pointId));
  revalidatePath('/alerts');
}

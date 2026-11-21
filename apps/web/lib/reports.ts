import 'server-only';
import { and, binReports, collectionPoints, desc, districts, eq, getDb, gte, inArray, isNull, sql } from '@recycleiq/db';
import { cityDistrict, createCityRequest, tryCity, upvoteCityRequest } from '@/lib/athens';

/** Two open reports for one bin mark it as full on the map until the municipality resolves them. */
const MARK_FULL_AT = 2;
const DUPLICATE_WINDOW_H = 6;

export type BinReportKind = 'full' | 'overflowing' | 'damaged';
export type BinReportResult =
  | {
      ok: true;
      report: typeof binReports.$inferSelect;
      openForBin: number;
      city: { id: string; status: string; upvoted: boolean } | null;
    }
  | { ok: false; status: 404 | 409; error: string; reportId?: string };

/**
 * A resident reports a full, overflowing or damaged bin. The photo is checked on the phone and
 * not uploaded: we receive only the bin, the kind of problem and the time. Also filed with the
 * city (AthensGov) when connected. Used by the API route and the assistant.
 */
export async function createBinReport({ pointId, kind, deviceId }: { pointId: string; kind: BinReportKind; deviceId?: string | null }): Promise<BinReportResult> {
  const db = getDb();
  const [point] = await db.select().from(collectionPoints).where(eq(collectionPoints.id, pointId));
  if (!point) return { ok: false, status: 404, error: 'Unknown bin' };

  if (deviceId) {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_H * 3_600_000);
    const [dup] = await db
      .select({ id: binReports.id })
      .from(binReports)
      .where(and(eq(binReports.pointId, pointId), eq(binReports.deviceId, deviceId), gte(binReports.createdAt, since)));
    if (dup) return { ok: false, status: 409, error: 'Already reported', reportId: dup.id };
  }

  const [report] = await db
    .insert(binReports)
    .values({ pointId, districtId: point.districtId, kind, deviceId: deviceId ?? null })
    .returning();

  const [{ open } = { open: 0 }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(binReports)
    .where(and(eq(binReports.pointId, pointId), inArray(binReports.status, ['open', 'acknowledged'])));
  if (kind !== 'damaged' && open >= MARK_FULL_AT && point.status === 'available')
    await db.update(collectionPoints).set({ status: 'full' }).where(eq(collectionPoints.id, pointId));

  const city = await fileWithCity(report!.id, point, kind);
  return { ok: true, report: report!, openForBin: open, city };
}

const TITLE = { full: 'Γεμάτος κάδος', overflowing: 'Ξεχειλισμένος κάδος', damaged: 'Χαλασμένος κάδος' } as const;

/**
 * File the report in the city's request system (AthensGov, category "garbage"). If this bin already
 * has an open city request, upvote it instead of opening a duplicate. Only the bin is described:
 * its location and street, never the resident's.
 */
async function fileWithCity(reportId: string, point: typeof collectionPoints.$inferSelect, kind: keyof typeof TITLE) {
  const db = getDb();
  const [existing] = await db
    .select({ cityRequestId: binReports.cityRequestId })
    .from(binReports)
    .where(
      and(
        eq(binReports.pointId, point.id),
        inArray(binReports.status, ['open', 'acknowledged']),
        sql`${binReports.cityRequestId} is not null`,
      ),
    )
    .orderBy(desc(binReports.createdAt))
    .limit(1);
  const [district] = point.districtId ? await db.select().from(districts).where(eq(districts.id, point.districtId)) : [];
  const where = point.street?.el ?? `${point.name.el}${district ? ` · ${district.name.el}` : ''}`;
  const res = await tryCity(() =>
    existing?.cityRequestId
      ? upvoteCityRequest(existing.cityRequestId)
      : createCityRequest({
          category: 'garbage',
          title: `${TITLE[kind]}: ${point.name.el}`.slice(0, 200),
          description: [
            'Αναφορά από την εφαρμογή RecycleIQ.',
            `Κάδος: ${point.name.el} (κωδικός ${point.id}).`,
            'Η φωτογραφία ελέγχθηκε στο κινητό του κατοίκου και δεν στάλθηκε.',
          ].join(' '),
          address: `${where}, Αθήνα`,
          lat: point.lat,
          lng: point.lng,
          district: cityDistrict(district?.communityId),
        }),
  );
  if (!res) return null;
  await db
    .update(binReports)
    .set({ cityRequestId: res.id, cityStatus: res.status, citySyncedAt: new Date() })
    .where(and(eq(binReports.id, reportId), isNull(binReports.cityRequestId)));
  return { id: res.id, status: res.status, upvoted: !!existing?.cityRequestId };
}

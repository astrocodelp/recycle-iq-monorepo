import 'server-only';
import { districts, eq, getDb, serviceRequests } from '@recycleiq/db';
import { getObject } from '@recycleiq/engine';
import { athensEnabled, cityDistrict, createCityRequest, tryCity } from '@/lib/athens';

export type BulkyResult =
  | { ok: true; id: string; city: { id: string; status: string } }
  | { ok: false; status: 502 | 503; error: string };

/**
 * Ask the city to collect a bulky item (category "bulky_waste" in AthensGov citizen requests).
 * The address goes to the city for the pickup and is not kept by RecycleIQ: we store only the
 * neighbourhood, the city's request id and its status. Used by the API route and the assistant.
 */
export async function createBulkyRequest(input: {
  objectId: string;
  districtId?: string | null;
  address: string;
  note?: string;
  deviceId?: string | null;
}): Promise<BulkyResult> {
  if (!athensEnabled()) return { ok: false, status: 503, error: 'City requests are not connected' };
  const db = getDb();
  const object = getObject(input.objectId);
  const [district] = input.districtId ? await db.select().from(districts).where(eq(districts.id, input.districtId)) : [];
  const address = input.address.trim();
  const city = await tryCity(() =>
    createCityRequest({
      category: 'bulky_waste',
      title: `Παραλαβή ογκώδους: ${object?.name.el ?? 'αντικείμενο'}`.slice(0, 200),
      description: ['Αίτημα από την εφαρμογή RecycleIQ.', input.note ? `Σημείωση: ${input.note}` : ''].filter(Boolean).join(' '),
      address: address.includes('Αθήνα') ? address : `${address}, Αθήνα`,
      district: cityDistrict(district?.communityId),
    }),
  );
  if (!city) return { ok: false, status: 502, error: 'The city request system did not answer. Try again later.' };
  const [row] = await db
    .insert(serviceRequests)
    .values({
      kind: 'bulky_pickup',
      districtId: district?.id ?? null,
      deviceId: input.deviceId ?? null,
      cityRequestId: city.id,
      cityStatus: city.status,
      citySyncedAt: new Date(),
    })
    .returning({ id: serviceRequests.id });
  return { ok: true, id: row!.id, city: { id: city.id, status: city.status } };
}

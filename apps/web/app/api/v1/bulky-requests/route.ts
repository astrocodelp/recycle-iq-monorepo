import { districts, eq, getDb, serviceRequests } from '@recycleiq/db';
import { getObject } from '@recycleiq/engine';
import { z } from 'zod';
import { deviceIdFrom, error, parseBody } from '@/lib/api';
import { athensEnabled, cityDistrict, createCityRequest, tryCity } from '@/lib/athens';

export const dynamic = 'force-dynamic';

const Body = z.object({
  objectId: z.string().min(1).max(64),
  districtId: z.string().max(64).nullish(),
  /** Where to collect from. Sent to the city for the pickup only; RecycleIQ does not store it. */
  address: z.string().trim().min(3).max(200),
  note: z.string().trim().max(500).optional(),
  deviceId: z.string().max(64).optional(),
});

/**
 * Ask the city to collect a bulky item (category "bulky_waste" in AthensGov citizen requests).
 * The address goes to the city for the pickup and is not kept by RecycleIQ: we store only the
 * neighbourhood, the city's request id and its status.
 */
export async function POST(req: Request) {
  if (!athensEnabled()) return error(503, 'City requests are not connected');
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const { objectId, districtId, address, note } = body.data;
  const db = getDb();
  const object = getObject(objectId);
  const [district] = districtId ? await db.select().from(districts).where(eq(districts.id, districtId)) : [];
  const city = await tryCity(() =>
    createCityRequest({
      category: 'bulky_waste',
      title: `Παραλαβή ογκώδους: ${object?.name.el ?? 'αντικείμενο'}`.slice(0, 200),
      description: ['Αίτημα από την εφαρμογή RecycleIQ.', note ? `Σημείωση: ${note}` : ''].filter(Boolean).join(' '),
      address: address.includes('Αθήνα') ? address : `${address}, Αθήνα`,
      district: cityDistrict(district?.communityId),
    }),
  );
  if (!city) return error(502, 'The city request system did not answer. Try again later.');
  const [row] = await db
    .insert(serviceRequests)
    .values({
      kind: 'bulky_pickup',
      districtId: district?.id ?? null,
      deviceId: deviceIdFrom(req, body.data) ?? null,
      cityRequestId: city.id,
      cityStatus: city.status,
      citySyncedAt: new Date(),
    })
    .returning({ id: serviceRequests.id });
  return Response.json({ id: row!.id, city: { id: city.id, status: city.status } }, { status: 201 });
}

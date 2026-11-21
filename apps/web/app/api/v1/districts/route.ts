import { asc, districts, getDb } from '@recycleiq/db';

export const dynamic = 'force-dynamic';

/**
 * The 38 districts with brown-bin coverage, centre and outline (svgPath, in the stylised Athens
 * projection). The app uses the outlines to turn a GPS fix into a neighbourhood on the device,
 * so coordinates never leave the phone.
 */
export async function GET() {
  const rows = await getDb()
    .select({
      id: districts.id,
      name: districts.name,
      communityId: districts.communityId,
      organicService: districts.organicService,
      lng: districts.lng,
      lat: districts.lat,
      svgPath: districts.svgPath,
    })
    .from(districts)
    .orderBy(asc(districts.id));
  return Response.json({ districts: rows });
}

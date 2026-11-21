import { getDistricts } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ districts: await getDistricts() });
}

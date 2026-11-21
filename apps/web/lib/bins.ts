import { cookies } from 'next/headers';

/** Which bin inventory the dashboard shows. Activity (scans, reports) is demo data either way. */
export type BinSource = 'synthetic' | 'osm';
export const BIN_SOURCE_COOKIE = 'riq_bins';

export async function getBinSource(): Promise<BinSource> {
  return (await cookies()).get(BIN_SOURCE_COOKIE)?.value === 'osm' ? 'osm' : 'synthetic';
}

/** Value of collection_points.source for a bin source. */
export const dbSource = (s: BinSource) => (s === 'osm' ? 'osm' : 'mock');

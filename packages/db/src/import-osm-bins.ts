// Converts an OpenStreetMap export of bins (GeoJSON points with osm_id, kind, recycling_type, tags)
// into seed/osm-bins.json: only points inside the 38 Athens districts, mapped to RecycleIQ point kinds.
//
//   pnpm --filter @recycleiq/db import:osm path/to/bins.geojson
//
// Data © OpenStreetMap contributors, ODbL 1.0. Keep the attribution wherever these points are shown.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { locateDistrict } from '@recycleiq/engine';

type Kind =
  | 'blue_bin'
  | 'glass_bell'
  | 'brown_bin'
  | 'battery_point'
  | 'weee_point'
  | 'clothing_bin'
  | 'green_point'
  | 'general_bin'
  | 'litter_bin';
type Category = 'packaging' | 'organic' | 'general' | 'special' | 'bulky';

interface Feature {
  geometry: { type: string; coordinates: [number, number] };
  properties: { osm_id: number; kind: string; recycling_type: string; tags: string };
}

export interface OsmBin {
  id: string;
  k: Kind;
  lng: number;
  lat: number;
  d: string;
  /** OSM name, if any: [el, en]. */
  n: [string, string] | null;
  acc: string[];
  cat: Category[];
  /** OSM check_date (YYYY-MM-DD), if any. */
  v: string | null;
}

const yes = (t: Record<string, string>, ...keys: string[]) => keys.some((k) => t[`recycling:${k}`] === 'yes');

const ACCEPTS: Record<Kind, string[]> = {
  blue_bin: ['paper', 'plastic', 'metal', 'cartons', 'glass'],
  glass_bell: ['glass'],
  brown_bin: ['food', 'garden'],
  battery_point: ['batteries'],
  weee_point: ['weee_small'],
  clothing_bin: ['textiles', 'shoes'],
  green_point: ['bulky', 'weee_large', 'garden'],
  general_bin: ['mixed'],
  litter_bin: ['litter'],
};
const CATEGORY: Record<Kind, Category> = {
  blue_bin: 'packaging',
  glass_bell: 'packaging',
  brown_bin: 'organic',
  battery_point: 'special',
  weee_point: 'special',
  clothing_bin: 'special',
  green_point: 'bulky',
  general_bin: 'general',
  litter_bin: 'general',
};

/** OSM tags → RecycleIQ point kind. Specific streams first, the blue packaging bin as the fallback. */
export function kindFor(osmKind: string, recyclingType: string, t: Record<string, string>): Kind {
  if (osmKind === 'waste_basket') return 'litter_bin';
  if (osmKind === 'waste_disposal') return 'general_bin';
  const name = (t.name ?? '').toLowerCase();
  if (recyclingType === 'centre') return 'green_point';
  if (yes(t, 'clothes', 'shoes')) return 'clothing_bin';
  if (yes(t, 'batteries')) return 'battery_point';
  if (yes(t, 'electrical_appliances', 'small_appliances') || name.includes('συσκευ')) return 'weee_point';
  if (yes(t, 'food_waste', 'green_waste', 'organic')) return 'brown_bin';
  const packaging = yes(t, 'paper', 'plastic', 'plastic_packaging', 'cans', 'cartons', 'beverage_cartons', 'paper_packaging', 'plastic_bottles');
  if (!packaging && yes(t, 'glass_bottles', 'glass')) return 'glass_bell';
  return 'blue_bin';
}

export function convert(geojson: { features: Feature[] }, districts: { id: string; svgPath: string }[]): OsmBin[] {
  const out: OsmBin[] = [];
  for (const f of geojson.features) {
    if (f.geometry?.type !== 'Point') continue;
    const [lng, lat] = f.geometry.coordinates;
    const d = locateDistrict(lng, lat, districts);
    if (!d) continue; // outside the Municipality of Athens
    let tags: Record<string, string> = {};
    try {
      tags = JSON.parse(f.properties.tags || '{}');
    } catch {}
    const k = kindFor(f.properties.kind, f.properties.recycling_type, tags);
    const nameEl = tags['name:el'] ?? tags.name;
    out.push({
      id: `osm-${f.properties.osm_id}`,
      k,
      lng: Math.round(lng * 1e7) / 1e7,
      lat: Math.round(lat * 1e7) / 1e7,
      d,
      n: nameEl ? [nameEl, tags['name:en'] ?? nameEl] : null,
      acc: ACCEPTS[k],
      cat: [CATEGORY[k]],
      v: /^\d{4}-\d{2}-\d{2}$/.test(tags.check_date ?? '') ? tags.check_date! : null,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const src = process.argv[2];
  if (!src) {
    console.error('usage: import:osm <bins.geojson>');
    process.exit(1);
  }
  const seedDir = new URL('../seed/', import.meta.url);
  const raw = JSON.parse(readFileSync(new URL('districts.json', seedDir), 'utf8')) as { id: string; path: string }[];
  const geojson = JSON.parse(readFileSync(src, 'utf8'));
  const bins = convert(geojson, raw.map((d) => ({ id: d.id, svgPath: d.path })));
  writeFileSync(new URL('osm-bins.json', seedDir), JSON.stringify(bins) + '\n');
  const byKind = bins.reduce<Record<string, number>>((m, b) => ((m[b.k] = (m[b.k] ?? 0) + 1), m), {});
  console.log(`${bins.length} of ${geojson.features.length} points are inside Athens:`, byKind);
}

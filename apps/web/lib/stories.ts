import 'server-only';
import { getDb, sql } from '@recycleiq/db';
import { districtStories, storyThreshold, type L10n, type Story } from '@recycleiq/engine';
import { dbSource, type BinSource } from './bins';

/** The first story of every neighbourhood, built from live data. */
export async function numbersStory(districtId: string, source: BinSource = 'synthetic'): Promise<Story | null> {
  const [r] = (
    await getDb().execute(sql`
      select d.name, d.area_km2, d.organic_service,
        (select count(*) from collection_points p where p.district_id = d.id and p.source = ${dbSource(source)}) as bins,
        (select count(*) from decisions x where x.district_id = d.id and x.created_at >= now() - interval '30 days') as scans,
        (select count(distinct x.device_id) from decisions x where x.district_id = d.id and x.created_at >= now() - interval '30 days') as people
      from districts d where d.id = ${districtId}`)
  ).rows;
  if (!r) return null;
  const name = r.name as L10n;
  const area = Number(r.area_km2).toFixed(2);
  const brown = { full: ['έχει καφέ κάδο παντού', 'has brown bins everywhere'], partial: ['έχει καφέ κάδο σε μέρος της', 'has brown bins in part of it'], none: ['δεν έχει ακόμη καφέ κάδο', 'has no brown bins yet'] }[
    String(r.organic_service) as 'full' | 'partial' | 'none'
  ];
  return {
    id: 'numbers',
    kind: 'numbers',
    title: { el: `${name.el} σε αριθμούς`, en: `${name.en} in numbers` },
    body: {
      el: `${area.replace('.', ',')} τ.χλμ., ${r.bins} κάδοι και σημεία συλλογής, και ${brown[0]}. Τον τελευταίο μήνα ${r.people} γείτονές σου έκαναν ${r.scans} σαρώσεις.`,
      en: `${area} km², ${r.bins} bins and collection points, and it ${brown[1]}. In the last month ${r.people} neighbours made ${r.scans} scans.`,
    },
  };
}

export async function scansInDistrict(deviceId: string, districtId: string): Promise<number> {
  const [r] = (await getDb().execute(sql`select count(*) as n from decisions where device_id = ${deviceId} and district_id = ${districtId}`)).rows;
  return Number(r?.n ?? 0);
}

export async function storiesFor(districtId: string, source: BinSource = 'synthetic') {
  const first = await numbersStory(districtId, source);
  const all = [...(first ? [first] : []), ...districtStories(districtId)];
  return all.map((s, i) => ({ ...s, threshold: storyThreshold(i) }));
}

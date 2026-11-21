// Seeds reference data (communities, districts, collection points, rules) and synthetic activity
// (decisions, check-ins, brown-bin requests) so the municipal dashboard has something to show.
//
// Safe to re-run: reference data is upserted, rule `enabled` flags set by staff are preserved,
// and only rows marked `synthetic` are replaced. Real user activity is never touched.
//
//   pnpm db:seed                 reference data + synthetic activity
//   pnpm db:seed --no-synthetic  reference data only (and removes synthetic rows)
import './env';
import {
  CATEGORY_IDS,
  DEFAULT_RULES,
  checkinReward,
  evaluate,
  type CategoryId,
  type DistrictContext,
  type L10n,
  type OrganicService,
} from '@recycleiq/engine';
import { eq, sql } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { scriptDb } from './client';
import {
  checkins,
  collectionPoints,
  communities,
  decisions,
  districts,
  rules,
  serviceRequests,
  type OpeningHours,
} from './schema';

const json = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../seed/${name}`, import.meta.url), 'utf8')) as T;

interface RawCommunity {
  id: string;
  el: string;
  en: string;
}
interface RawDistrict {
  id: string;
  geo: string;
  el: string;
  en: string;
  community: string;
  area: number;
  c: [number, number];
  path: string;
  organic: OrganicService;
  lnglat: [number, number];
}
interface RawHours {
  label_el: string;
  label_en: string;
  periods: OpeningHours['periods'];
}
interface RawPoint {
  id: string;
  k: (typeof collectionPoints.$inferInsert)['kind'];
  lng: number;
  lat: number;
  n: [string, string];
  a: [string, string];
  d: string;
  s: 'ok' | 'full' | 'out_of_service';
  age: number;
  h: number | null;
  acc: string[];
  cat: CategoryId[];
  staffed?: boolean;
}
type DistrictStats = Record<string, { shares?: number[] }>;

const synthetic = !process.argv.includes('--no-synthetic');
const now = Date.now();
const DAY = 86_400_000;

// Deterministic PRNG so every environment gets the same synthetic data.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) if ((r -= w) <= 0) return item;
  return items[items.length - 1]![0];
}

async function insertBatched<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 500) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

const { db, close } = scriptDb();
try {
  // --- reference data -------------------------------------------------------------------------
  const rawCommunities = json<RawCommunity[]>('communities.json');
  await db
    .insert(communities)
    .values(rawCommunities.map((c) => ({ id: c.id, name: { el: c.el, en: c.en } })))
    .onConflictDoUpdate({ target: communities.id, set: { name: sql`excluded.name` } });

  const rawDistricts = json<RawDistrict[]>('districts.json');
  await db
    .insert(districts)
    .values(
      rawDistricts.map((d) => ({
        id: d.id,
        geoId: d.geo,
        name: { el: d.el, en: d.en },
        communityId: d.community,
        areaKm2: d.area,
        organicService: d.organic,
        lng: d.lnglat[0],
        lat: d.lnglat[1],
        svgPath: d.path,
        svgCentroid: { x: d.c[0], y: d.c[1] },
      })),
    )
    .onConflictDoUpdate({
      target: districts.id,
      set: {
        geoId: sql`excluded.geo_id`,
        name: sql`excluded.name`,
        communityId: sql`excluded.community_id`,
        areaKm2: sql`excluded.area_km2`,
        organicService: sql`excluded.organic_service`,
        lng: sql`excluded.lng`,
        lat: sql`excluded.lat`,
        svgPath: sql`excluded.svg_path`,
        svgCentroid: sql`excluded.svg_centroid`,
      },
    });

  const hours = json<RawHours[]>('hours.json');
  const districtIds = new Set(rawDistricts.map((d) => d.id));
  const rawPoints = json<RawPoint[]>('points.json');
  const pointName = (p: RawPoint): L10n => {
    if (p.k !== 'clothing_bin' || !p.n[0].includes(' · ')) return { el: p.n[0], en: p.n[1] };
    const rest = (s: string) => s.split(' · ').slice(1).join(' · ');
    return { el: `Κάδος ρούχων · ${rest(p.n[0])}`, en: `Clothing bin · ${rest(p.n[1])}` };
  };
  const pointRows = rawPoints.map((p) => {
    const h = p.h == null ? undefined : hours[p.h];
    return {
      id: p.id,
      kind: p.k,
      name: pointName(p),
      street: p.a[0] ? { el: p.a[0], en: p.a[1] || p.a[0] } : null,
      districtId: districtIds.has(p.d) ? p.d : null,
      lng: p.lng,
      lat: p.lat,
      categories: p.cat,
      accepts: p.acc,
      glassBell: p.k !== 'blue_bin' && p.acc.includes('glass'),
      staffed: !!p.staffed,
      hours: h ? { label: { el: h.label_el, en: h.label_en }, periods: h.periods } : null,
      status: p.s === 'ok' ? ('available' as const) : p.s === 'full' ? ('full' as const) : ('closed' as const),
      lastVerifiedAt: new Date(now - p.age * DAY),
      source: 'mock',
      illustrative: true,
    };
  });
  await insertBatched(pointRows, (chunk) =>
    db
      .insert(collectionPoints)
      .values(chunk)
      .onConflictDoUpdate({
        target: collectionPoints.id,
        set: {
          kind: sql`excluded.kind`,
          name: sql`excluded.name`,
          street: sql`excluded.street`,
          districtId: sql`excluded.district_id`,
          lng: sql`excluded.lng`,
          lat: sql`excluded.lat`,
          categories: sql`excluded.categories`,
          accepts: sql`excluded.accepts`,
          glassBell: sql`excluded.glass_bell`,
          staffed: sql`excluded.staffed`,
          hours: sql`excluded.hours`,
          status: sql`excluded.status`,
          lastVerifiedAt: sql`excluded.last_verified_at`,
        },
      }),
  );

  // Rules: refresh text, keep the enabled flag staff may have changed.
  await db
    .insert(rules)
    .values(
      DEFAULT_RULES.map((r) => ({
        code: r.code,
        slug: r.id,
        enabled: r.enabled,
        version: r.version,
        title: r.title,
        body: r.text,
        appliesTo: r.appliesTo,
        source: r.source,
        updatedAt: new Date(r.updatedAt),
      })),
    )
    .onConflictDoUpdate({
      target: rules.code,
      set: {
        slug: sql`excluded.slug`,
        version: sql`excluded.version`,
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        appliesTo: sql`excluded.applies_to`,
        source: sql`excluded.source`,
      },
    });

  console.log(
    `reference: ${rawCommunities.length} communities, ${rawDistricts.length} districts, ${pointRows.length} points, ${DEFAULT_RULES.length} rules`,
  );

  // --- synthetic activity ---------------------------------------------------------------------
  await db.delete(checkins).where(eq(checkins.synthetic, true));
  await db.delete(serviceRequests).where(eq(serviceRequests.synthetic, true));
  await db.delete(decisions).where(eq(decisions.synthetic, true));

  if (synthetic) {
    const stats = json<DistrictStats>('district_stats.json');
    const pointsPerDistrict = new Map<string, number>();
    for (const p of pointRows)
      if (p.districtId) pointsPerDistrict.set(p.districtId, (pointsPerDistrict.get(p.districtId) ?? 0) + 1);

    const ctx = new Map<string, DistrictContext>(
      rawDistricts.map((d) => [d.id, { id: d.id, name: { el: d.el, en: d.en }, organicService: d.organic }]),
    );
    const cityCtx: DistrictContext = { id: 'athens', name: { el: 'Αθήνα', en: 'Athens' }, organicService: 'partial' };
    const districtWeights = rawDistricts.map(
      (d) => [d.id, (0.5 + Math.pow(pointsPerDistrict.get(d.id) ?? 0, 0.7)) * (0.7 + 0.6 * rand())] as const,
    );
    const defaultShares = [0.42, 0.12, 0.23, 0.13, 0.1];
    const scenariosByCategory: Record<CategoryId, (readonly [[string, Record<string, string>], number])[]> = {
      packaging: [
        [['plastic-bottle', {}], 0.5],
        [['pizza-box', { greasy: 'no' }], 0.15],
        [['glass-bottle', { form: 'bottle' }], 0.3],
        [['glass-bottle', {}], 0.05],
      ],
      organic: [
        [['food-scraps', { content: 'plant' }], 0.65],
        [['food-scraps', { content: 'cooked' }], 0.15],
        [['food-scraps', { content: 'meat' }], 0.1],
        [['food-scraps', {}], 0.1],
      ],
      general: [
        [['pizza-box', { greasy: 'yes' }], 0.5],
        [['pizza-box', { greasy: 'unsure' }], 0.2],
        [['pizza-box', {}], 0.05],
        [['glass-bottle', { form: 'broken' }], 0.25],
      ],
      special: [
        [['battery', { kind: 'small' }], 0.45],
        [['battery', { kind: 'rechargeable' }], 0.2],
        [['battery', { kind: 'damaged' }], 0.05],
        [['coffee-maker', { works: 'works' }], 0.1],
        [['coffee-maker', { works: 'broken' }], 0.2],
      ],
      bulky: [[['sofa', {}], 1]],
    };
    const ruleStates = DEFAULT_RULES.map((r) => ({ code: r.code, enabled: true }));
    const devices = Array.from({ length: 900 }, (_, i) => `synthetic-device-${i.toString().padStart(4, '0')}`);
    const DAYS = 90;
    const TOTAL = 15_000;

    const decisionRows: (typeof decisions.$inferInsert)[] = [];
    for (let i = 0; i < TOTAL; i++) {
      // Growing usage: more requests in recent days.
      const age = Math.floor(DAYS * Math.pow(rand(), 1.35));
      const hour = weighted([[8, 1], [10, 2], [12, 2], [14, 2], [17, 2], [19, 3], [21, 2], [23, 0.5]] as const);
      const createdAt = new Date(now - age * DAY - (24 - hour) * 3_600_000 + Math.floor(rand() * 3_600_000));
      const districtId = rand() < 0.08 ? null : weighted(districtWeights);
      const shares = (districtId && stats[districtId]?.shares) || defaultShares;
      const [objectId, answers] =
        rand() < 0.03
          ? (['unknown', {}] as const)
          : weighted(scenariosByCategory[weighted(CATEGORY_IDS.map((c, j) => [c, shares[j] ?? 0.1] as const))]);
      const o = evaluate(
        { objectId, answers },
        { district: (districtId && ctx.get(districtId)) || cityCtx, rules: ruleStates },
      );
      decisionRows.push({
        createdAt,
        deviceId: devices[Math.floor(rand() * devices.length)]!,
        objectId: o.objectId,
        decisionKey: o.key,
        answers: o.answers,
        districtId,
        category: o.category,
        confidence: o.confidence,
        certainty: o.certainty,
        uncertain: o.uncertain,
        clarified: Object.keys(o.answers).length > 0,
        rulesApplied: o.rulesApplied,
        via: rand() < 0.62 ? 'scan' : 'search',
        payload: null,
        synthetic: true,
      });
    }
    await insertBatched(decisionRows, (chunk) => db.insert(decisions).values(chunk));

    const checkinRows: (typeof checkins.$inferInsert)[] = [];
    for (let i = 0; i < 2_600; i++) {
      const age = Math.floor(30 * Math.pow(rand(), 1.2));
      const reward = checkinReward({
        streakBefore: weighted([[0, 4], [1, 2], [2, 1.5], [3, 1], [5, 0.7], [8, 0.4]] as const),
        matchesScan: rand() < 0.7,
        specialDropOff: rand() < 0.08,
      });
      checkinRows.push({
        createdAt: new Date(now - age * DAY - Math.floor(rand() * DAY)),
        deviceId: devices[Math.floor(rand() * devices.length)]!,
        districtId: rand() < 0.1 ? null : weighted(districtWeights),
        earned: reward.earned,
        breakdown: reward.breakdown,
        synthetic: true,
      });
    }
    await insertBatched(checkinRows, (chunk) => db.insert(checkins).values(chunk));

    const noBrownBin = rawDistricts.filter((d) => d.organic !== 'full');
    const requestRows = Array.from({ length: 420 }, () => {
      const d = weighted(noBrownBin.map((x) => [x, x.organic === 'none' ? 2 : 1] as const));
      return {
        createdAt: new Date(now - Math.floor(DAYS * rand()) * DAY - Math.floor(rand() * DAY)),
        deviceId: devices[Math.floor(rand() * devices.length)]!,
        districtId: d.id,
        kind: 'brown_bin',
        synthetic: true,
      };
    });
    await insertBatched(requestRows, (chunk) => db.insert(serviceRequests).values(chunk));

    console.log(
      `synthetic: ${decisionRows.length} decisions, ${checkinRows.length} check-ins, ${requestRows.length} brown-bin requests`,
    );
  } else {
    console.log('synthetic activity removed');
  }
} finally {
  await close();
}

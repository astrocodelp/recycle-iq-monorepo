// Precomputes the sorting-plant summary shown on the dashboard's "Διαλογή" page.
// Port of ops/server/plant-sim.js + ops/server/config.js from github.com/Mike17K/recycleiq-delta-sort (see NOTICE):
// it runs the same headless delta-robot sorter (src/core) per plant, seeded, and turns item counts into kilograms.
//
//   pnpm --filter @recycleiq/sortsim summarize        # writes data/summary.json
//
// Deterministic: same seed and duration give the same JSON. Everything here is a simulation.
import { writeFileSync } from 'node:fs';
import { Plant, DT, MATERIALS } from '../src/core/index.js';
import { getScene } from '../src/scenes/index.js';

const SIM_MINUTES = 10; // the duration BUSINESS_CASE.md uses ("10 simulated minutes, seed 1")
const SEED = 7;

/** Demo plants (coordinates are not real facility locations). */
const PLANTS = [
  { id: 'P1', name: { el: 'Μονάδα διαλογής Α', en: 'Sorting plant A' }, scene: 'single-line' },
  { id: 'P2', name: { el: 'Μονάδα διαλογής Β', en: 'Sorting plant B' }, scene: 'twin-lines' },
];
/** Typical item weight in kg, to turn the sorter's item counts into mass. */
const ITEM_KG = { PET_CLEAR: 0.028, PET_COLOR: 0.03, HDPE: 0.045, PP: 0.02, PS: 0.012, ALU: 0.015, GLASS: 0.3, CARTON: 0.06, STEEL: 0.08, RESIDUE: 0.04 };
const DESTINATIONS = {
  PET_CLEAR: { el: 'Ανακυκλωτής PET', en: 'PET recycler' }, PET_COLOR: { el: 'Ανακυκλωτής PET', en: 'PET recycler' },
  HDPE: { el: 'Ανακυκλωτής πολυολεφινών', en: 'Polyolefin recycler' }, PP: { el: 'Ανακυκλωτής πολυολεφινών', en: 'Polyolefin recycler' },
  PS: { el: 'Ανακυκλωτής PS', en: 'PS recycler' }, ALU: { el: 'Χυτήριο αλουμινίου', en: 'Aluminium smelter' },
  GLASS: { el: 'Υαλουργία', en: 'Glassworks' }, CARTON: { el: 'Χαρτοβιομηχανία', en: 'Paper mill' },
  STEEL: { el: 'Χαλυβουργία', en: 'Steelworks' }, RESIDUE: { el: 'ΧΥΤΑ', en: 'Landfill' },
};
const r2 = (v) => Math.round(v * 100) / 100;

const plants = PLANTS.map((site) => {
  const scene = getScene(site.scene);
  const plant = Plant.fromScene(scene, { seed: SEED + site.id.charCodeAt(1) });
  const steps = Math.round((SIM_MINUTES * 60) / DT);
  for (let i = 0; i < steps; i++) plant.step();
  const s = plant.summary();
  const kg = {};
  for (const l of s.lines) for (const [m, n] of Object.entries(l.bins)) kg[m] = (kg[m] ?? 0) + n * ITEM_KG[m];
  const sortedKg = Object.values(kg).reduce((a, b) => a + b, 0);
  const items = s.totals.spawned;
  const picked = s.totals.picked;
  // Everything not picked (misses and the residue class itself) ends in the residue stream.
  const residueKg = Math.max(0, items - picked) * ITEM_KG.RESIDUE;
  const inputKg = sortedKg + residueKg;
  const simHours = plant.t / 3600;
  const flows = Object.entries({ ...kg, RESIDUE: residueKg })
    .filter(([, v]) => v > 0)
    .map(([material, v]) => ({ material, kg: r2(v), destination: DESTINATIONS[material] }));
  const outbound = {};
  for (const f of flows) (outbound[f.destination.en] ??= { destination: f.destination, kg: 0 }).kg += f.kg;
  return {
    id: site.id,
    name: site.name,
    scene: site.scene,
    lines: s.lines.length,
    robots: scene.lines.reduce((n, l) => n + (l.robots?.length ?? 0), 0),
    simMinutes: r2(plant.t / 60),
    items,
    picked,
    itemsPerMin: r2(s.totals.itemsPerMin ?? items / (plant.t / 60)),
    sortedPerMin: r2(picked / (plant.t / 60)),
    materials: Object.fromEntries(Object.entries(kg).map(([m, v]) => [m, r2(v)])),
    sortedKg: r2(sortedKg),
    residueKg: r2(residueKg),
    inputKg: r2(inputKg),
    kgPerHour: r2(sortedKg / simHours),
    recovery: inputKg ? r2(sortedKg / inputKg) : null,
    purity: 1,
    flows,
    outbound: Object.values(outbound).map((o) => ({ destination: o.destination, kg: r2(o.kg) })),
  };
});

const out = {
  generatedBy: 'packages/sortsim/scripts/summarize.mjs',
  source: 'github.com/Mike17K/recycleiq-delta-sort (src/core, ops/server/plant-sim.js)',
  seed: SEED,
  simMinutes: SIM_MINUTES,
  itemKg: ITEM_KG,
  materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, { color: v.color, label: v.label }])),
  plants,
};
writeFileSync(new URL('../data/summary.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
for (const p of plants)
  console.log(`${p.id} ${p.scene}: ${p.items} items, ${p.picked} picked (${p.sortedPerMin}/min), sorted ${p.sortedKg} kg, residue ${p.residueKg} kg, recovery ${p.recovery}`);

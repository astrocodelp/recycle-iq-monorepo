// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/line-config.js); see NOTICE.
/** Builds and validates the complete configuration of one sorting line from a (partial) definition. */
import { DEFAULT_DELTA, reachRadius, isReachable } from './kinematics.js';
import { RESIDUE } from './materials.js';

export const DEFAULT_LINE = {
  id: 'line',
  origin: { x: 0, y: 0 },                                 // placement of the line in the plant (m)
  belt: { length: 5.4, width: 1.0, speed: 0.5 },          // m, m, m/s
  spawn: { rate: 2, seed: 1, mix: {} },                   // items/s; mix = { material: weight }
  robots: [],                                             // [{ x }] along the belt, centred on it
  bins: {},                                               // { material: { x, y } } relative to the line
  delta: DEFAULT_DELTA,
  motion: { vmax: 2.5, amax: 25, tGrip: 0.28, tRelease: 0.06, lift: 0.15, baseGap: 0.14 },
};

const floor3 = v => Math.floor(v * 1000) / 1000;
const BAY_GAP = 0.4;           // standby bay sits this far beside the active bay on the carousel (m)

/** Bin defaults: unlimited capacity, 2 s switch; `standby: true` puts the standby bay beside the active one (+x). */
function normaliseBin(b) {
  const n = { capacity: null, tSwitch: 2, ...b };
  if (n.standby === true) n.standby = { x: n.x + BAY_GAP, y: n.y };
  else if (!n.standby) n.standby = null;
  return n;
}

/** Fills defaults, adds the residue bin at the belt end and derives R (pick radius) and binReach (carry radius). */
export function createLineConfig(def) {
  const c = {
    ...DEFAULT_LINE, ...def,
    origin: { ...DEFAULT_LINE.origin, ...def.origin },
    belt: { ...DEFAULT_LINE.belt, ...def.belt },
    spawn: { ...DEFAULT_LINE.spawn, ...def.spawn },
    delta: { ...DEFAULT_LINE.delta, ...def.delta },
    motion: { ...DEFAULT_LINE.motion, ...def.motion },
  };
  c.robots = def.robots.map((r, i) => ({ id: i + 1, x: r.x }));
  c.bins = Object.fromEntries(Object.entries({ [RESIDUE]: { x: c.belt.length - 0.3, y: 0 }, ...def.bins }).map(([k, b]) => [k, normaliseBin(b)]));
  c.R = def.R ?? floor3(reachRadius(c.delta));
  c.binReach = def.binReach ?? floor3(reachRadius(c.delta, c.delta.zPick + c.motion.lift)) - 0.02;
  return c;
}

/** Human-readable problems with a line configuration (empty array = valid). */
export function validateLineConfig(c) {
  const problems = [];
  if (!c.robots.length) problems.push(`${c.id}: no robots`);
  if (c.R < c.belt.width / 2 + 0.05) problems.push(`${c.id}: pick radius ${c.R} m does not cover the belt width`);
  const carryZ = c.delta.zPick + c.motion.lift;
  for (const [material, weight] of Object.entries(c.spawn.mix)) {
    if (material === RESIDUE || !(weight > 0)) continue;
    const bin = c.bins[material];
    if (!bin) { problems.push(`${c.id}: ${material} is spawned but has no bin`); continue; }
    const bays = [bin.x, ...(bin.standby ? [bin.standby.x] : [])];
    if (bays.some(bx => c.robots.some(r => Math.abs(bx - r.x) < 0.25))) problems.push(`${c.id}: ${material} bay is too close to a robot gantry post`);
    const served = c.robots.some(r => Math.hypot(bin.x - r.x, bin.y) <= c.binReach && isReachable(bin.x - r.x, bin.y, carryZ, c.delta));
    if (!served) problems.push(`${c.id}: no robot reaches the ${material} bin`);
  }
  return problems;
}

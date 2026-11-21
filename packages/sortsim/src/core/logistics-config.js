// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/logistics-config.js); see NOTICE.
/** Configuration of the mobile-robot logistics layer (aisles, mobile robots, containers) of a plant. */
import { Graph } from './navigation.js';

export const DEFAULT_LOGISTICS = {
  speed: { vmax: 1.5, amax: 1.2 },          // mobile robot motion (m/s, m/s^2)
  tTransfer: 1, tEmpty: 1,                  // slide a bin between bay and robot, tip it into a container (s)
  minGap: 0.75,                             // mobile robots never get closer than this, centre to centre (m)
  zoneRadius: 1.0,                          // junction zone: only one robot may be inside (or entering) at a time (m)
  dockReach: 1.2,                           // max distance from a bin bay / container to its aisle node (m)
};

/** @param def scene `logistics` block; @param lineConfigs configs from createLineConfig (for validation context) */
export function createLogisticsConfig(def) {
  const c = { ...DEFAULT_LOGISTICS, ...def, speed: { ...DEFAULT_LOGISTICS.speed, ...def.speed } };
  const nodeIds = Object.keys(def.aisles.nodes).sort();
  const n = typeof def.amrs === 'number' ? def.amrs : def.amrs.length;
  c.amrs = Array.from({ length: n }, (_, i) => ({ id: i + 1, node: def.amrs[i]?.node ?? nodeIds[Math.min(i, nodeIds.length - 1)] }));
  c.containers = def.containers.map(k => ({ capacity: 120, ...k }));
  return c;
}

/** Problems that would stop the logistics from working (empty array = valid). */
export function validateLogisticsConfig(c, lineConfigs) {
  const problems = [], graph = new Graph(c.aisles);
  if (!graph.connected()) problems.push('aisle graph is not strongly connected (mobile robots could get stuck)');
  const homes = new Set(c.amrs.map(a => a.node));
  for (const h of homes) for (const id of graph.ids) {
    const d = Math.hypot(graph.nodes[id].x - graph.nodes[h].x, graph.nodes[id].y - graph.nodes[h].y);
    if (id !== h && !homes.has(id) && d < c.zoneRadius + 0.1) problems.push(`siding ${h} is too close to aisle node ${id} (${d.toFixed(2)} m): parked robots would block the lane`);
    if (id !== h && homes.has(id) && d < c.minGap + 0.1) problems.push(`sidings ${h} and ${id} are too close`);
  }
  const reachable = (p, what) => { const d = graph.nearest(p).dist; if (d > c.dockReach) problems.push(`${what} is ${d.toFixed(2)} m from the nearest aisle node (max ${c.dockReach})`); };
  c.containers.forEach(k => reachable(k, `container ${k.id}`));
  for (const lc of lineConfigs) {
    for (const [m, b] of Object.entries(lc.bins)) {
      if (b.capacity == null) continue;
      reachable({ x: lc.origin.x + b.x, y: lc.origin.y + b.y }, `bin ${lc.id}:${m}`);
      if (b.standby) reachable({ x: lc.origin.x + b.standby.x, y: lc.origin.y + b.standby.y }, `standby of ${lc.id}:${m}`);
      if (!c.containers.some(k => !k.materials || k.materials.includes(m))) problems.push(`no container accepts ${m}`);
    }
  }
  return problems;
}

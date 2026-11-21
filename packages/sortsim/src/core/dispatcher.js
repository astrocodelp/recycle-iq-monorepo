// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/dispatcher.js); see NOTICE.
/** Chooses which idle mobile robot collects which full bin, and which container it empties into (pure: reads state). */
const PRIORITY = { blocked: 0, urgent: 1, routine: 2 };

function priorityOf(slot, bin) {
  if (bin === slot.active) return PRIORITY.blocked;                          // slot cannot accept anything
  return slot.active && slot.active.ratio > 0.7 ? PRIORITY.urgent : PRIORITY.routine;   // standby gets full soon
}

/** @returns {{amr, slot, bin, container, reason}[]} */
export function assignServices(fleet, plant) {
  const idle = fleet.amrs.filter(a => a.enabled && !a.plan);
  if (!idle.length) return [];

  const requests = [];
  for (const line of plant.lines) for (const slot of Object.values(line.slots)) for (const bin of slot.serviceable()) {
    requests.push({ slot, bin, priority: priorityOf(slot, bin) });
  }
  requests.sort((a, b) => a.priority - b.priority || (a.bin.fullAt ?? 0) - (b.bin.fullAt ?? 0) || (a.slot.id < b.slot.id ? -1 : 1));

  const out = [];
  for (const { slot, bin, priority } of requests) {
    if (!idle.length) break;
    const spot = slot.spot(bin.loc);
    const containers = fleet.containers.filter(c => c.accepts(slot.material) && c.hasRoom(bin.fill));
    if (!containers.length) continue;                                         // wait: every suitable container is full
    const container = containers.reduce((a, b) => (Math.hypot(b.x - spot.x, b.y - spot.y) < Math.hypot(a.x - spot.x, a.y - spot.y) - 1e-9 ? b : a));
    const dock = fleet.graph.nearest(spot).id;
    let best = null;
    for (const amr of idle) {
      const p = fleet.graph.path(amr.node, dock);
      if (p && (!best || p.length < best.len - 1e-9)) best = { amr, len: p.length };
    }
    if (!best) continue;
    idle.splice(idle.indexOf(best.amr), 1);
    out.push({
      amr: best.amr, slot, bin, container,
      reason: `${['blocked', 'urgent', 'routine'][priority]}: ${bin.id} ${bin.fill}/${bin.capacity} -> ${container.id}; AMR${best.amr.id} nearest (${best.len.toFixed(1)} m)`,
    });
  }
  return out;
}

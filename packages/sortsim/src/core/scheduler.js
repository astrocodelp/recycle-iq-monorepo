// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/scheduler.js); see NOTICE.
/** Earliest-deadline-first assignment of items to idle robots (pure: reads the line, returns decisions). */
import { exitTime, isInside, planPick } from './planner.js';
import { RESIDUE } from './materials.js';

/** @returns {{robot, item, plan, reason}[]} assignments to commit this tick */
export function planAssignments(line) {
  const idle = line.robots.filter(r => r.enabled && !r.plan);
  if (!idle.length) return [];

  const candidates = [];
  for (const item of line.items) {
    if (item.state !== 'belt' || item.claimed || item.type === RESIDUE) continue;
    const feasible = [];
    for (const robot of idle) {
      if (!isInside(line.cfg, robot, item.x, item.y)) continue;
      const plan = planPick(line, robot, item);
      if (plan) feasible.push({ robot, plan, exit: exitTime(line, robot, item) });
    }
    if (feasible.length) candidates.push({ item, feasible, deadline: Math.min(...feasible.map(f => f.exit)) });
  }
  candidates.sort((a, b) => a.deadline - b.deadline || a.item.id - b.item.id);

  const taken = new Set(), out = [];
  for (const { item, feasible, deadline } of candidates) {
    const free = feasible.filter(f => !taken.has(f.robot.id));
    if (!free.length) continue;
    const binX = line.cfg.bins[item.type].x;
    const best = free.reduce((a, b) => (Math.abs(b.robot.x - binX) < Math.abs(a.robot.x - binX) - 1e-9 ? b : a));
    taken.add(best.robot.id);
    out.push({
      robot: best.robot, item, plan: best.plan,
      reason: `EDF: leaves workspace in ${(deadline - line.t).toFixed(2)}s; feasible R${free.map(f => f.robot.id).join(',R')}; ` +
        `R${best.robot.id} nearest to bin (dx ${Math.abs(best.robot.x - binX).toFixed(2)}m)`,
    });
  }
  return out;
}

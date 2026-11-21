// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/planner.js); see NOTICE.
/** Pick planning for one robot and one item: belt intercept point + the timed phases of the full cycle. */
import { dist, profileBetween } from './motion.js';

export const isInside = (cfg, robot, x, y) => (x - robot.x) ** 2 + (y - robot.y) ** 2 <= cfg.R ** 2;

/** Seconds from now until the item leaves the robot's pick workspace. */
export function exitTime(line, robot, item) {
  if (line.v <= 0) return Infinity;
  const dy = item.y - robot.y;
  const xExit = robot.x + Math.sqrt(Math.max(0, line.cfg.R ** 2 - dy * dy));
  return line.t + (xExit - item.x) / line.v;
}

/**
 * Cycle: move (to intercept) -> grip (tracks the belt) -> carry -> release -> return.
 * Returns { phases, pick, end } or null if the item cannot be picked in time / the bin is out of reach.
 */
export function planPick(line, robot, item) {
  const { cfg, v, t } = line, m = cfg.motion, bin = cfg.bins[item.type];
  if (!line.slots[item.type].canAccept()) return null;                       // bin missing, full, switching or claimed
  if (Math.hypot(bin.x - robot.x, bin.y - robot.y) > cfg.binReach) return null;

  const home = { x: robot.x, y: robot.y };
  const moveProfileTo = target => profileBetween(home, target, m);
  let tMove = moveProfileTo(item).T;                       // fixed point: item moves while the robot does
  for (let i = 0; i < 10; i++) tMove = moveProfileTo({ x: item.x + v * tMove, y: item.y }).T;

  const arrive = { x: item.x + v * tMove, y: item.y };
  const pick = { x: arrive.x + v * m.tGrip, y: item.y };
  if (!isInside(cfg, robot, arrive.x, arrive.y) || !isInside(cfg, robot, pick.x, pick.y)) return null;

  const phases = [];
  let clock = t;
  const add = (name, from, to, profile, duration = profile.T) => {
    phases.push({ name, t0: clock, t1: clock + duration, from, to, prof: profile });
    clock += duration;
  };
  add('move', home, arrive, moveProfileTo(arrive));
  add('grip', arrive, pick, null, m.tGrip);
  add('carry', pick, bin, profileBetween(pick, bin, m));
  add('release', bin, bin, null, m.tRelease);
  add('return', bin, home, profileBetween(bin, home, m));
  return { phases, pick, end: clock };
}

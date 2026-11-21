// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/service-planner.js); see NOTICE.
/**
 * Timed phases of one bin-service trip. The robot never enters the bin area: it stops in the aisle at the node in
 * front of the bay and the bin slides across ("pull" / "push"). Phases are built lazily so they see live state, and
 * each carries its own progress (tau): a blocked robot simply stops advancing it.
 */
import { makePath } from './navigation.js';
import { trapezoid } from './motion.js';

/** goto bay dock -> pull bin onto the robot -> haul to container dock -> empty -> return -> push bin back */
export const STAGES = ['goto', 'pull', 'haul', 'empty', 'return', 'push'];
export const PARK_STAGES = ['park'];
export const MOVING = new Set(['goto', 'haul', 'return', 'park']);

/** ctx = { fleet, amr, slot, bin, container } (service) or { fleet, amr } (park). ctx.spot / destSpot / docks are filled in en route. */
export function buildPhase(stage, ctx) {
  const { fleet, amr, slot, bin, container } = ctx, { graph, cfg } = fleet;
  const nodeAt = p => graph.nearest(p).id;
  const route = (from, to) => {
    const p = graph.path(from, to);
    if (!p) throw new Error(`no aisle route ${from} -> ${to}`);
    return graph.points(p.ids);
  };
  const moving = points => {
    const path = makePath(points), prof = trapezoid(path.length, cfg.speed.vmax, cfg.speed.amax);
    return { path, prof, dur: prof.T };
  };
  const still = (p, dur) => ({ path: makePath([p]), prof: { s: () => 1 }, dur });

  let m;
  switch (stage) {
    case 'goto':
      ctx.spot = slot.spot(bin.loc); ctx.dock = nodeAt(ctx.spot);
      m = moving(route(amr.node, ctx.dock)); break;
    case 'pull': m = still(graph.nodes[ctx.dock], cfg.tTransfer); break;
    case 'haul':
      ctx.cdock = nodeAt(container);
      m = moving(route(ctx.dock, ctx.cdock)); break;
    case 'empty': m = still(graph.nodes[ctx.cdock], cfg.tEmpty); break;
    case 'return':
      ctx.destSpot = slot.spot(slot.placeSpot()); ctx.destDock = nodeAt(ctx.destSpot);
      m = moving(route(ctx.cdock, ctx.destDock)); break;
    case 'push': m = still(graph.nodes[ctx.destDock], cfg.tTransfer); break;
    case 'park': m = moving(route(amr.node, amr.home)); break;
    default: throw new Error(`unknown stage ${stage}`);
  }
  return { name: stage, path: m.path, prof: m.prof, dur: m.dur, tau: 0 };
}

export const phasePos = ph => ph.path.at(ph.prof.s(ph.tau) * ph.path.length);
export const phaseDir = ph => ph.path.dirAt(ph.prof.s(ph.tau) * ph.path.length);

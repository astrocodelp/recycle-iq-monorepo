// Copied from github.com/Mike17K/recycleiq-delta-sort (src/scenes/single-line.js); see NOTICE.
/** Scene: one line, 3 robots, 6 material classes, 3 mobile robots serving the bins. */
import { evenXs, binRows, bayXs, aisleGraph } from './layout.js';

const BINS = binRows(['PET_CLEAR', 'PET_COLOR', 'HDPE', 'PS', 'PP', 'ALU'], [2.0, 3.2, 4.4], 0.68, { capacity: 30, standby: true });

export default {
  id: 'single-line',
  name: { en: 'Single line · 3 robots', el: 'Μία γραμμή · 3 ρομπότ' },
  seed: 42,
  lines: [{
    id: 'A',
    origin: { x: 0, y: 0 },
    belt: { length: 5.4, width: 1.0, speed: 0.5 },
    spawn: { rate: 1.6, mix: { PET_CLEAR: 0.22, PET_COLOR: 0.12, HDPE: 0.18, PP: 0.16, PS: 0.10, ALU: 0.12, RESIDUE: 0.10 } },
    robots: evenXs(3, 1.4, 1.2).map(x => ({ x })),
    bins: BINS,
  }],
  logistics: {           // one-way loop: top lane east, bottom lane west; sidings at the west end; containers at the east end
    amrs: [{ node: 'H0' }, { node: 'H1' }, { node: 'H2' }],
    aisles: aisleGraph({
      lanes: [{ y: 1.6, dir: 1 }, { y: -1.6, dir: -1 }], xs: bayXs(BINS), x0: -0.4, x1: 6.2,
      links: [{ from: 0, to: 1, at: 'x1' }, { from: 1, to: 0, at: 'x0' }],
      homes: [{ x: -1.6, y: 1.6, lane: 0 }, { x: -1.6, y: -1.6, lane: 1 }, { x: -1.6, y: 2.6, lane: 0 }],
    }),
    containers: [
      { id: 'C1', x: 7.1, y: 1.6, capacity: 600, materials: ['PET_CLEAR', 'PET_COLOR', 'HDPE', 'PP', 'PS'] },
      { id: 'C2', x: 7.1, y: -1.6, capacity: 400, materials: ['ALU'] },
    ],
  },
  demo: {
    duration: 90,
    steps: [
      { t: 0,  caption: { en: 'Belt starts, items stream in', el: 'Ο ιμάντας ξεκινά, τα αντικείμενα εισέρχονται' } },
      { t: 10, caption: { en: '3 robots pick in parallel — the Gantt fills', el: 'Τα 3 ρομπότ ταξινομούν παράλληλα — το Gantt γεμίζει' } },
      { t: 20, caption: { en: 'Bin almost full: the carousel swaps in the standby bin', el: 'Ο κάδος γεμίζει: ο περιστρεφόμενος δίσκος φέρνει τον εφεδρικό' }, controls: [{ type: 'fillBin', line: 'A', material: 'PET_CLEAR', fraction: 0.95 }] },
      { t: 32, caption: { en: 'A mobile robot slides the full bin aboard and hauls it to the container', el: 'Κινητό ρομπότ τραβά τον γεμάτο κάδο και τον μεταφέρει στο container' },
        controls: [{ type: 'fillBin', line: 'A', material: 'HDPE', fraction: 0.95 }, { type: 'fillBin', line: 'A', material: 'ALU', fraction: 0.95 }] },
      { t: 45, caption: { en: 'Surge: more misses', el: 'Κορύφωση ροής: περισσότερες αστοχίες' }, controls: [{ type: 'surge', mult: 2.2, dur: 15 }] },
      { t: 62, caption: { en: 'Robot 2 disabled: the scheduler redistributes', el: 'Απενεργοποίηση ρομπότ 2: ο scheduler ανακατανέμει' }, controls: [{ type: 'robot', line: 'A', id: 2, enabled: false }] },
      { t: 76, caption: { en: 'Robot 2 back online', el: 'Ρομπότ 2 ξανά ενεργό' }, controls: [{ type: 'robot', line: 'A', id: 2, enabled: true }] },
      { t: 84, caption: { en: 'Closing stats and JSON export', el: 'Τελικά στατιστικά και εξαγωγή JSON' } },
    ],
  },
};

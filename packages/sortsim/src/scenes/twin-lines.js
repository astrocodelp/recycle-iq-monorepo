// Copied from github.com/Mike17K/recycleiq-delta-sort (src/scenes/twin-lines.js); see NOTICE.
/** Scene: two parallel lines, 6 robots each, same material classes but different layout, speed and mix. */
import { evenXs, binRows, bayXs, aisleGraph } from './layout.js';

const A_XS = evenXs(5, 2.0, 1.2), B_XS = evenXs(5, 1.7, 1.0);     // bin slots at robot mid-points
const BIN = { capacity: 40, standby: true };
const ALL = ['PET_CLEAR', 'PET_COLOR', 'HDPE', 'PP', 'PS', 'ALU', 'GLASS', 'CARTON', 'STEEL'];
// Line A: bottom-row bins have their active bay on the right, and so does the last top slot, so all 6 robots have a bin in reach
const BINS_A = binRows(ALL, A_XS, 0.68, { ...BIN, side: i => (i % 2 === 1 || i === 8 ? 1 : -1) });
const BINS_B = binRows(['ALU', 'STEEL', 'GLASS', 'PET_CLEAR', 'PET_COLOR', 'HDPE', 'PP', 'PS', 'CARTON'], B_XS, 0.68, BIN);

export default {
  id: 'twin-lines',
  name: { en: 'Twin lines · 2 × 6 robots', el: 'Δύο γραμμές · 2 × 6 ρομπότ' },
  seed: 7,
  video: { width: 1600, height: 900 },      // capture-video default size (12 Gantt lanes need room)
  lines: [
    {   // Line A: long and slow, robots 1.2 m apart
      id: 'A',
      origin: { x: 0, y: 1.8 },
      belt: { length: 9.0, width: 1.0, speed: 0.5 },
      spawn: { rate: 4.4, mix: { PET_CLEAR: 0.09, PET_COLOR: 0.07, HDPE: 0.10, PP: 0.08, PS: 0.08, ALU: 0.10, GLASS: 0.12, CARTON: 0.14, STEEL: 0.14, RESIDUE: 0.08 } },
      robots: evenXs(6, 1.4, 1.2).map(x => ({ x })),
      bins: BINS_A,
    },
    {   // Line B: shorter and faster, robots 1.0 m apart, different class order and mix
      id: 'B',
      origin: { x: 0, y: -1.8 },
      belt: { length: 7.6, width: 1.0, speed: 0.7 },
      spawn: { rate: 4.0, mix: { PET_CLEAR: 0.14, PET_COLOR: 0.10, HDPE: 0.10, PP: 0.10, PS: 0.10, ALU: 0.09, GLASS: 0.09, CARTON: 0.20, STEEL: 0.08, RESIDUE: 0.00 } },
      robots: evenXs(6, 1.2, 1.0).map(x => ({ x })),
      bins: BINS_B,
    },
  ],
  logistics: {           // 5 mobile robots on one-way loops: top lane east, middle lane west, bottom lane east
    amrs: [{ node: 'H0' }, { node: 'H1' }, { node: 'H2' }, { node: 'H3' }, { node: 'H4' }],
    aisles: aisleGraph({
      lanes: [{ y: 3.4, dir: 1 }, { y: 0, dir: -1 }, { y: -3.4, dir: 1 }], xs: bayXs(BINS_A, BINS_B), x0: -0.5, x1: 9.8,
      links: [{ from: 0, to: 1, at: 'x1' }, { from: 2, to: 1, at: 'x1' }, { from: 1, to: 0, at: 'x0' }, { from: 1, to: 2, at: 'x0' }],
      homes: [{ x: -1.7, y: 3.4, lane: 0 }, { x: -1.7, y: 4.4, lane: 0 }, { x: -1.7, y: 0, lane: 1 }, { x: -1.7, y: -3.4, lane: 2 }, { x: -1.7, y: -4.4, lane: 2 }],
    }),
    containers: [
      { id: 'C1', x: 10.9, y: 3.4, capacity: 1000, materials: ['PET_CLEAR', 'PET_COLOR', 'HDPE', 'PP', 'PS'] },
      { id: 'C2', x: 10.9, y: 0, capacity: 700, materials: ['GLASS', 'CARTON'] },
      { id: 'C3', x: 10.9, y: -3.4, capacity: 700, materials: ['ALU', 'STEEL'] },
    ],
  },
  demo: {
    duration: 90,
    steps: [
      { t: 0,  caption: { en: 'Two parallel lines, 12 robots', el: 'Δύο παράλληλες γραμμές, 12 ρομπότ' } },
      { t: 12, caption: { en: 'Same 9 classes, different layout and belt speed', el: 'Ίδιες 9 κατηγορίες, διαφορετική διάταξη και ταχύτητα ιμάντα' } },
      { t: 18, caption: { en: 'Bins fill and the carousels swap in standby bins automatically', el: 'Οι κάδοι γεμίζουν και αλλάζουν αυτόματα σε εφεδρικούς' }, controls: [{ type: 'fillBin', line: 'A', material: 'PET_CLEAR', fraction: 0.95 }, { type: 'fillBin', line: 'B', material: 'ALU', fraction: 0.95 }] },
      { t: 30, caption: { en: 'Five mobile robots shuttle full bins along one-way aisles to the big containers', el: 'Πέντε κινητά ρομπότ μεταφέρουν τους γεμάτους κάδους σε μονόδρομους διαδρόμους' },
        controls: [{ type: 'fillBin', line: 'A', material: 'GLASS', fraction: 0.95 }, { type: 'fillBin', line: 'B', material: 'PET_COLOR', fraction: 0.95 }, { type: 'fillBin', line: 'A', material: 'STEEL', fraction: 0.95 }, { type: 'fillBin', line: 'B', material: 'CARTON', fraction: 0.95 }] },
      { t: 42, caption: { en: 'Surge on both lines', el: 'Κορύφωση ροής και στις δύο γραμμές' }, controls: [{ type: 'surge', line: 'all', mult: 1.8, dur: 15 }] },
      { t: 58, caption: { en: 'Line A loses robot 3 — the scheduler redistributes', el: 'Η γραμμή Α χάνει το ρομπότ 3 — ανακατανομή' }, controls: [{ type: 'robot', line: 'A', id: 3, enabled: false }] },
      { t: 70, caption: { en: 'Robot A3 back online', el: 'Το ρομπότ Α3 ξανά ενεργό' }, controls: [{ type: 'robot', line: 'A', id: 3, enabled: true }] },
      { t: 77, caption: { en: 'Line B slows its belt', el: 'Η γραμμή Β μειώνει την ταχύτητα ιμάντα' }, controls: [{ type: 'belt', line: 'B', value: 0.5 }] },
      { t: 85, caption: { en: 'Closing stats and JSON export', el: 'Τελικά στατιστικά και εξαγωγή JSON' } },
    ],
  },
};

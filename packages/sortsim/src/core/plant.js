// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/plant.js); see NOTICE.
/** A plant = one or more independent lines stepped together, with shared controls, export and replay. */
import { Line, DT } from './line.js';
import { createLineConfig } from './line-config.js';
import { createLogisticsConfig } from './logistics-config.js';
import { Fleet } from './fleet.js';

export const FORMAT = 'recycleiq-delta-sort';
const SEED_STRIDE = 7919;   // keeps lines statistically independent but reproducible from one seed

export class Plant {
  /** @param configs line configs from createLineConfig; @param replay optional { controls, lines:{id:{decisions}} } */
  constructor({ id, name, configs, logistics = null, replay = null }) {
    this.id = id; this.name = name; this.configs = configs; this.logistics = logistics; this.replay = replay;
    this.n = 0;
    this.controlLog = [];
    this.decisions = [];                       // all lines, in decision order
    this.lines = configs.map(cfg => {
      const line = new Line(cfg, { replay: replay && { decisions: replay.lines[cfg.id]?.decisions ?? [] } });
      line.onDecision = d => this.decisions.push(d);
      return line;
    });
    this.logisticsLog = [];                    // mobile-robot dispatch decisions
    this.onLogistics = d => this.logisticsLog.push(d);
    this.fleet = logistics ? new Fleet(logistics, this, { replay: replay && { decisions: replay.logistics ?? [] } }) : null;
  }

  /** Build from a scene definition (see src/scenes). Seed drives every line. */
  static fromScene(scene, { seed = scene.seed ?? 1 } = {}) {
    const configs = scene.lines.map((def, i) =>
      createLineConfig({ ...def, spawn: { ...def.spawn, seed: seed + i * SEED_STRIDE } }));
    const logistics = scene.logistics ? createLogisticsConfig(scene.logistics) : null;
    return new Plant({ id: scene.id, name: scene.name, configs, logistics });
  }

  get t() { return this.n * DT; }
  line(id) { return this.lines.find(l => l.id === id); }
  /** World position of a bin at time t (follows its mobile robot while carried). */
  binPos(bin, t) { return this.fleet ? this.fleet.binPos(bin, t) : bin.slot.binPos(bin, t); }
  get slots() { return this.lines.flatMap(l => Object.values(l.slots)); }
  get robotCount() { return this.lines.reduce((s, l) => s + l.robots.length, 0); }

  /** Controls: { type: rate|belt|robot|surge, line?: id|'all', ... }. Logged by step so a run can be replayed. */
  control(evt) {
    this.controlLog.push({ step: this.n, t: this.t, ...evt });
    this._apply(evt);
  }
  _apply(e) {
    if (e.type === 'amr') { this.fleet?.applyControl(e); return; }
    for (const l of this.lines) if (!e.line || e.line === 'all' || e.line === l.id) l.applyControl(e);
  }

  step() {
    if (this.replay) for (const e of this.replay.controls) if (e.step === this.n) this._apply(e);
    for (const l of this.lines) l.step();
    this.fleet?.step((this.n + 1) * DT);
    this.n++;
  }
  run(seconds) { for (let i = 0, k = Math.round(seconds / DT); i < k; i++) this.step(); }

  /** World-space rectangle covering every line (m), for camera framing and 2D scaling. */
  bounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const { cfg } of this.lines) {
      const ys = Object.values(cfg.bins).map(b => Math.abs(b.y) + 0.3);
      const halfDepth = Math.max(cfg.belt.width / 2 + 0.3, ...ys);
      minX = Math.min(minX, cfg.origin.x - 0.3); maxX = Math.max(maxX, cfg.origin.x + cfg.belt.length + 0.3);
      minY = Math.min(minY, cfg.origin.y - halfDepth); maxY = Math.max(maxY, cfg.origin.y + halfDepth);
    }
    if (this.fleet) {   // aisles and containers extend the plant
      const pts = [...Object.values(this.logistics.aisles.nodes), ...this.logistics.containers];
      for (const p of pts) { minX = Math.min(minX, p.x - 0.5); maxX = Math.max(maxX, p.x + 0.7); minY = Math.min(minY, p.y - 0.6); maxY = Math.max(maxY, p.y + 0.6); }
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, depth: maxY - minY };
  }

  summary() {
    const lines = this.lines.map(l => l.summary());
    const sum = key => lines.reduce((s, l) => s + l[key], 0);
    return {
      steps: this.n, lines,
      totals: { spawned: sum('spawned'), picked: sum('picked'), misses: sum('misses'), missBinUnavailable: sum('missBinUnavailable'), violations: sum('violations'), itemsPerMin: sum('itemsPerMin') },
      logistics: this.fleet ? this.fleet.summary() : null,
    };
  }

  exportJSON() {
    const lines = Object.fromEntries(this.lines.map(l => [l.id, { decisions: l.decisions }]));
    return { format: FORMAT, version: 3, scene: { id: this.id, name: this.name }, configs: this.configs, logistics: this.logistics,
      dt: DT, steps: this.n, controls: this.controlLog, lines, logisticsDecisions: this.logisticsLog, summary: this.summary() };
  }
  static fromJSON(obj) {
    if (obj.format !== FORMAT) throw new Error('not a RecycleIQ delta-sort file');
    const plant = new Plant({ id: obj.scene.id, name: obj.scene.name, configs: obj.configs.map(createLineConfig), logistics: obj.logistics ?? null,
      replay: { controls: obj.controls, lines: obj.lines, logistics: obj.logisticsDecisions } });
    plant.targetSteps = obj.steps;
    return plant;
  }
  /** True if replaying the file reproduces its recorded summary exactly. */
  static verify(obj) {
    const plant = Plant.fromJSON(obj);
    for (let i = 0; i < obj.steps; i++) plant.step();
    return JSON.stringify(plant.summary()) === JSON.stringify(obj.summary);
  }
}

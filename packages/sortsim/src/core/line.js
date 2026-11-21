// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/line.js); see NOTICE.
/** One sorting line: belt, spawner, robots and their state machine. Deterministic fixed-step simulation. */
import { mulberry32 } from './rng.js';
import { lerp } from './motion.js';
import { planPick } from './planner.js';
import { planAssignments } from './scheduler.js';
import { RESIDUE } from './materials.js';
import { BinSlot } from './bin-slot.js';

export const DT = 0.02;   // fixed timestep (s)

export class Line {
  /** @param cfg from createLineConfig; @param replay optional { decisions } to follow instead of scheduling */
  constructor(cfg, { replay = null } = {}) {
    this.cfg = cfg;
    this.id = cfg.id;
    this.replay = replay;
    this.rng = mulberry32(cfg.spawn.seed);
    this.n = 0;
    this.rate = cfg.spawn.rate;
    this.v = cfg.belt.speed;
    this.beltDist = 0;
    this.nextId = 1;
    this.items = [];
    this.timers = [];
    this.decisions = [];
    this.onDecision = null;
    this.robots = cfg.robots.map(r => ({ id: r.id, x: r.x, y: 0, enabled: true, plan: null, busy: 0, segs: [], done: 0 }));
    this.slots = Object.fromEntries(Object.entries(cfg.bins).map(([m, b]) => [m, new BinSlot(cfg.id, m, b, cfg.origin)]));
    this.stats = { spawned: 0, picked: 0, misses: 0, missBinUnavailable: 0, violations: 0, residueExpected: 0, bins: {} };
    Object.keys(cfg.bins).forEach(k => (this.stats.bins[k] = 0));
    this.nextSpawn = this._interval(this.rate);
  }

  get t() { return this.n * DT; }
  _interval(rate) { return -Math.log(1 - this.rng()) / rate; }

  // ---------- controls ----------
  applyControl(e) {
    switch (e.type) {
      case 'rate': this._setRate(e.value); break;
      case 'belt': this.v = e.value; break;
      case 'fillBin': this.slots[e.material]?.forceFill(e.fraction); break;
      case 'robot': { const r = this.robots[e.id - 1]; if (r) r.enabled = !!e.enabled; break; }
      case 'surge': {
        const base = this.rate;
        this._setRate(base * e.mult);
        this.timers.push({ step: this.n + Math.round(e.dur / DT), evt: { type: 'rate', value: base } });
        break;
      }
    }
  }
  _setRate(rate) {   // rescale the pending inter-arrival time so a rate change takes effect immediately
    this.nextSpawn = this.t + Math.max(0, this.nextSpawn - this.t) * (this.rate / rate);
    this.rate = rate;
  }

  // ---------- one step ----------
  step() {
    const tEnd = (this.n + 1) * DT;
    this._fireTimers();
    this._dispatch();
    this._advance(tEnd);
    this._spawn(tEnd);
    for (const slot of Object.values(this.slots)) slot.update(tEnd, DT);
    this._collectMisses();
    this.items = this.items.filter(it => it.state !== 'done');
    this._pruneSegments(tEnd);
    this.n++;
  }

  _fireTimers() {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.timers[i].step <= this.n) { this.applyControl(this.timers[i].evt); this.timers.splice(i, 1); }
    }
  }

  _dispatch() {
    if (this.replay) {
      for (const d of this.replay.decisions) {
        if (d.step !== this.n) continue;
        const robot = this.robots[d.robot - 1], item = this.items.find(i => i.id === d.item);
        const plan = robot && item && planPick(this, robot, item);
        if (plan) this._commit(robot, item, plan, d.reason);
      }
      return;
    }
    for (const a of planAssignments(this)) this._commit(a.robot, a.item, a.plan, a.reason);
  }

  _commit(robot, item, plan, reason) {
    robot.plan = { item, phases: plan.phases, idx: 0, pick: plan.pick, bin: this.slots[item.type].reserve() };   // reserve room
    item.claimed = true; item.holder = robot;
    plan.phases.forEach(p => robot.segs.push({ name: p.name, t0: p.t0, t1: p.t1 }));
    const d = { step: this.n, t: this.t, line: this.id, robot: robot.id, item: item.id, type: item.type,
      pickXY: [+plan.pick.x.toFixed(4), +plan.pick.y.toFixed(4)], bin: item.type, reason };
    this.decisions.push(d);
    if (this.onDecision) this.onDecision(d);
  }

  _advance(tEnd) {
    this.beltDist += this.v * DT;
    for (const it of this.items) if (it.state === 'belt') it.x += this.v * DT;
    for (const r of this.robots) {
      if (r.plan) r.busy += DT;
      while (r.plan) {
        const phase = r.plan.phases[r.plan.idx];
        if (phase.t1 > tEnd + 1e-9) break;
        this._endPhase(r, phase);
        if (++r.plan.idx >= r.plan.phases.length) r.plan = null;
      }
    }
  }

  _endPhase(robot, phase) {
    const item = robot.plan.item;
    if (phase.name === 'grip') { item.state = 'carried'; item.x = phase.to.x; item.y = phase.to.y; }
    if (phase.name === 'release') {
      item.state = 'done'; item.holder = null;
      if (this.slots[item.type].deposit(robot.plan.bin)) { this.stats.bins[item.type]++; this.stats.picked++; robot.done++; }
      else this.stats.violations++;                                   // must never happen: dropped where no bin is present
    }
  }

  _spawn(tEnd) {
    const { mix } = this.cfg.spawn, kinds = Object.keys(mix), total = kinds.reduce((s, k) => s + mix[k], 0);
    const halfLane = this.cfg.belt.width / 2 - 0.1;
    while (this.nextSpawn < tEnd) {
      let u = this.rng() * total, type = kinds[kinds.length - 1];
      for (const k of kinds) { if ((u -= mix[k]) < 0) { type = k; break; } }
      const y = +((this.rng() * 2 - 1) * halfLane).toFixed(4);
      this.items.push({ id: this.nextId++, type, x: this.v * (tEnd - this.nextSpawn), y, state: 'belt', claimed: false, holder: null });
      this.stats.spawned++;
      this.nextSpawn += this._interval(this.rate);
    }
  }

  _collectMisses() {   // unpicked items reaching the belt end fall into the residue bin
    for (const it of this.items) {
      if (it.state !== 'belt' || it.claimed || it.x <= this.cfg.belt.length) continue;
      it.state = 'done';
      if (it.type === RESIDUE) this.stats.residueExpected++;
      else { this.stats.misses++; if (!this.slots[it.type].canAccept()) this.stats.missBinUnavailable++; }
    }
  }

  _pruneSegments(tEnd) {
    for (const r of this.robots) while (r.segs.length && r.segs[0].t1 < tEnd - 40) r.segs.shift();
  }

  // ---------- read model for views ----------
  /** Effector position at time t: x/y in line coordinates, z = dip fraction (0 hover .. 1 at the belt). */
  robotPos(robot, t) {
    if (!robot.plan) return { x: robot.x, y: robot.y, z: 0 };
    const ph = robot.plan.phases[robot.plan.idx], tau = t - ph.t0;
    if (ph.name === 'grip') {
      const k = Math.min(1, Math.max(0, tau / (ph.t1 - ph.t0)));
      return { ...lerp(ph.from, ph.to, k), z: Math.sin(Math.PI * k) };
    }
    if (ph.name === 'release') return { x: ph.to.x, y: ph.to.y, z: 0 };
    return { ...lerp(ph.from, ph.to, ph.prof.s(tau)), z: 0 };
  }
  /** Effector height relative to the robot base (negative = below). */
  effectorZ(pos) { return this.cfg.delta.zPick + this.cfg.motion.lift * (1 - pos.z); }
  itemPos(item, t) {
    if (item.state === 'carried' && item.holder) { const p = this.robotPos(item.holder, t); return { x: p.x, y: p.y }; }
    return { x: item.x, y: item.y };
  }

  summary() {
    const t = this.t || 1e-9, s = this.stats, r6 = x => Math.round(x * 1e6) / 1e6;
    return {
      id: this.id, spawned: s.spawned, picked: s.picked, misses: s.misses, missBinUnavailable: s.missBinUnavailable, violations: s.violations,
      residueExpected: s.residueExpected,
      slots: Object.fromEntries(Object.entries(this.slots).filter(([, sl]) => sl.capacity != null).map(([m, sl]) => [m, sl.summary()])),
      bins: { ...s.bins }, itemsPerMin: r6(s.picked / (t / 60)), utilisation: this.robots.map(r => r6(r.busy / t)),
    };
  }
}

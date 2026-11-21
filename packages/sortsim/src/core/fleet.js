// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/fleet.js); see NOTICE.
/**
 * Mobile robots (AMRs) that swap out full bins. Per robot: a state machine over service stages, plus traffic control:
 * a robot never moves closer than `minGap` to another robot (it waits instead), and when two robots block each other
 * the lower-priority one (higher id) backs up along its own path. Junctions (merges, siding entrances) are single-
 * occupancy zones, so merging traffic queues instead of meeting. Idle robots park on sidings so they never block an
 * aisle; the aisles are one-way loops, so head-on traffic can only happen on a siding spur.
 */
import { Graph } from './navigation.js';
import { Container } from './containers.js';
import { assignServices } from './dispatcher.js';
import { buildPhase, phasePos, phaseDir, MOVING, STAGES, PARK_STAGES } from './service-planner.js';
import { lerp } from './motion.js';
import { DT } from './line.js';

export class Fleet {
  constructor(cfg, plant, { replay = null } = {}) {
    this.cfg = cfg; this.plant = plant; this.replay = replay;
    this.graph = new Graph(cfg.aisles);
    this.containers = cfg.containers.map(c => new Container(c));
    const caps = plant.configs.flatMap(c => Object.values(c.bins).map(b => b.capacity)).filter(x => x != null);
    this.containers.forEach(c => (c.minRoom = caps.length ? Math.max(...caps) : 1));
    this.amrs = cfg.amrs.map(a => ({ id: a.id, node: a.node, home: a.node, ...this.graph.nodes[a.node], enabled: true, plan: null, busy: 0, waited: 0, segs: [], serviced: 0 }));
    this.junctions = this.graph.junctions().map(id => ({ id, ...this.graph.nodes[id] }));
    this.decisions = [];
    this.stats = { serviced: 0, itemsMoved: 0, minDistance: Infinity };
  }

  applyControl(e) {
    if (e.type === 'amr') { const a = this.amrs[e.id - 1]; if (a) a.enabled = !!e.enabled; }
  }

  /** Called once per plant step after the lines. `tEnd` = end of this step, plant.n = index of the step. */
  step(tEnd) {
    for (const c of this.containers) c.update(tEnd);
    const moves = this._decideMoves();
    this.amrs.forEach((a, i) => this._advance(a, tEnd, moves[i]));
    this._dispatch();
    for (const a of this.amrs) if (a.enabled && !a.plan && a.node !== a.home) this._startPlan(a, { fleet: this, amr: a }, PARK_STAGES);
    this._trackDistance();
  }

  // ---------- dispatch ----------
  _dispatch() {
    const n = this.plant.n;
    if (this.replay) {
      for (const d of this.replay.decisions) {
        if (d.step !== n) continue;
        const amr = this.amrs[d.amr - 1], slot = this.slot(d.slot), bin = slot?.bins.find(b => b.id === d.bin);
        const container = this.containers.find(c => c.id === d.container);
        if (amr && !amr.plan && bin && container) this._commit({ amr, slot, bin, container, reason: d.reason });
      }
      return;
    }
    for (const a of assignServices(this, this.plant)) this._commit(a);
  }

  slot(id) {
    for (const line of this.plant.lines) { const s = line.slots[id.slice(line.id.length + 1)]; if (s && s.id === id) return s; }
    return null;
  }

  _commit({ amr, slot, bin, container, reason }) {
    bin.claimed = true; bin.carrier = amr; container.incoming += bin.fill;
    this._startPlan(amr, { fleet: this, amr, slot, bin, container }, STAGES);
    const d = { step: this.plant.n, t: this.plant.t, amr: amr.id, slot: slot.id, bin: bin.id, container: container.id, reason };
    this.decisions.push(d);
    this.plant.onLogistics?.(d);
  }

  _startPlan(amr, ctx, stages) {
    amr.plan = { ctx, stages, stage: 0, phase: null };
    amr.plan.phase = buildPhase(stages[0], ctx);
  }

  // ---------- motion ----------
  /**
   * Traffic control, decided on the state at the start of the step. Per moving robot:
   *   go    - the next position does not bring it closer than `minGap` to another robot (or it is moving apart)
   *   wait  - it would approach a robot inside the gap: stand still (queues behind a docked robot form this way)
   *   back  - it and the robot it would approach block each other and it has the lower priority (higher id): retrace
   *           its own path one step, which breaks head-on and merge deadlocks without ever touching anyone.
   */
  _decideMoves() {
    const gap = this.cfg.minGap, pos = this.amrs.map(a => this.amrPos(a));
    const moving = this.amrs.map(a => a.plan && MOVING.has(a.plan.phase.name));
    const approached = (i, dTau) => {                                  // robots that moving robot i would get too close to
      const ph = this.amrs[i].plan.phase, nxt = phasePos({ ...ph, tau: Math.max(0, ph.tau + dTau) }), hit = [];
      pos.forEach((o, j) => {
        if (j === i) return;
        const dn = Math.hypot(nxt.x - o.x, nxt.y - o.y), dc = Math.hypot(pos[i].x - o.x, pos[i].y - o.y);
        if (dn < gap && dn < dc - 1e-9) hit.push(j);
      });
      return hit;
    };
    const ahead = this.amrs.map((_, i) => (moving[i] ? approached(i, DT) : []));
    const R = this.cfg.zoneRadius, claims = new Set();
    const inZone = (p, j) => Math.hypot(p.x - j.x, p.y - j.y) < R;
    return this.amrs.map((a, i) => {
      if (!moving[i]) return 'go';
      if (ahead[i].length) {
        const mutual = ahead[i].filter(j => ahead[j].includes(i));
        const yields = mutual.length > 0 && mutual.every(j => a.id > this.amrs[j].id);
        return yields && a.plan.phase.tau > 0 && !approached(i, -DT).length ? 'back' : 'wait';
      }
      const nxt = phasePos({ ...a.plan.phase, tau: a.plan.phase.tau + DT });
      for (const j of this.junctions) {                                 // entering a zone someone is in (or entering) -> wait
        if (!inZone(nxt, j) || inZone(pos[i], j)) continue;
        if (claims.has(j.id) || pos.some((o, k) => k !== i && inZone(o, j))) return 'wait';
        claims.add(j.id);
      }
      return 'go';
    });
  }

  _mark(amr, name, tEnd) {
    const last = amr.segs[amr.segs.length - 1];
    if (last && last.name === name && last.t1 >= tEnd - DT - 1e-9) last.t1 = tEnd;
    else amr.segs.push({ name, t0: tEnd - DT, t1: tEnd });
    while (amr.segs.length && amr.segs[0].t1 < tEnd - 60) amr.segs.shift();
  }

  _advance(amr, tEnd, move) {
    if (!amr.plan) return;
    amr.busy += DT;
    if (move !== 'go') {                                               // wait, or back up along our own path
      amr.waited += DT; this._mark(amr, 'wait', tEnd);
      if (move === 'back') amr.plan.phase.tau = Math.max(0, amr.plan.phase.tau - DT);
      return;
    }
    amr.plan.phase.tau += DT;
    this._mark(amr, amr.plan.phase.name, tEnd);
    while (amr.plan && amr.plan.phase.tau >= amr.plan.phase.dur - 1e-9) {
      const p = amr.plan, ph = p.phase, ctx = p.ctx;
      if (ph.name === 'push' && !ctx.slot.placeBin(ctx.bin)) { ph.dur = ph.tau + 0.1; break; }   // a switch is running: wait and retry
      this._finishPhase(amr, ph, ctx);
      if (++p.stage >= p.stages.length) { amr.plan = null; break; }
      p.phase = buildPhase(p.stages[p.stage], ctx);
    }
  }

  _finishPhase(amr, ph, ctx) {
    const arrive = id => { amr.node = id; Object.assign(amr, this.graph.nodes[id]); };
    switch (ph.name) {
      case 'goto': arrive(ctx.dock); break;
      case 'pull': ctx.slot.takeBin(ctx.bin); break;
      case 'haul': arrive(ctx.cdock); break;
      case 'empty': {
        const { bin, container } = ctx;
        container.fill += bin.fill; container.incoming -= bin.fill;
        this.stats.itemsMoved += bin.fill; bin.fill = 0; amr.serviced++; this.stats.serviced++;
        break;
      }
      case 'return': arrive(ctx.destDock); break;
      case 'park': arrive(amr.home); break;
    }
  }

  _trackDistance() {
    for (let i = 0; i < this.amrs.length; i++) for (let j = i + 1; j < this.amrs.length; j++) {
      const a = this.amrPos(this.amrs[i]), b = this.amrPos(this.amrs[j]);
      this.stats.minDistance = Math.min(this.stats.minDistance, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }

  // ---------- read model ----------
  amrPos(amr) { return amr.plan ? phasePos(amr.plan.phase) : { x: amr.x, y: amr.y }; }
  heading(amr) { return amr.plan ? phaseDir(amr.plan.phase) : { x: 0, y: 0 }; }
  /** World position of a bin (follows its mobile robot; slides between bay and robot during pull/push). */
  binPos(bin, t) {
    const amr = bin.carrier, plan = amr?.plan;
    if (plan && plan.ctx.bin === bin) {
      const ph = plan.phase, a = this.amrPos(amr), k = ph.dur > 0 ? Math.min(1, ph.tau / ph.dur) : 1;
      if (ph.name === 'pull') return lerp(plan.ctx.spot, a, k);
      if (ph.name === 'push') return lerp(a, plan.ctx.destSpot, k);
      if (bin.loc === 'carried') return a;
    }
    return bin.slot.binPos(bin, t);
  }

  summary() {
    const t = this.plant.t || 1e-9, r6 = x => Math.round(x * 1e6) / 1e6;
    return {
      serviced: this.stats.serviced, itemsMoved: this.stats.itemsMoved,
      utilisation: this.amrs.map(a => r6(a.busy / t)), waited: this.amrs.map(a => r6(a.waited)), servicedBy: this.amrs.map(a => a.serviced),
      containers: this.containers.map(c => ({ id: c.id, fill: c.fill, emptied: c.emptied })),
    };
  }
}

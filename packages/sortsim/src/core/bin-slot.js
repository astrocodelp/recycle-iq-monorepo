// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/bin-slot.js); see NOTICE.
/**
 * A bin slot = one collection point of a line. It owns up to two physical bins on a small carousel, side by side: the
 * ACTIVE bin (under the robots' drop point) and an optional PARKING bin (standby, or a full bin waiting for a mobile
 * robot). Both bays have a clear outward path to the aisle; a switch rotates the pair half a turn, so bins never cross.
 *
 * Availability rule (hard): items may only be reserved/deposited while a bin is physically present at the active spot,
 * not full, not being switched and not claimed for removal. A bin with reservations is never removed.
 */
export class Bin {
  constructor(id, slot, capacity) {
    this.id = id; this.slot = slot; this.capacity = capacity;       // capacity null = unlimited
    this.fill = 0; this.reserved = 0;
    this.loc = 'active';                                            // active | parking | carried
    this.claimed = false;                                           // a mobile robot is responsible for it
    this.carrier = null; this.fullAt = null;
  }
  get full() { return this.capacity != null && this.fill >= this.capacity; }
  get ratio() { return this.capacity ? Math.min(1, this.fill / this.capacity) : 0; }
}

export class BinSlot {
  /** @param bin line-config bin { x, y, capacity, standby:{x,y}|null, tSwitch }; @param origin line origin in the plant */
  constructor(lineId, material, bin, origin) {
    this.id = `${lineId}:${material}`; this.lineId = lineId; this.material = material;
    this.capacity = bin.capacity ?? null; this.tSwitch = bin.tSwitch ?? 2;
    this.outward = Math.sign(bin.y || 1);                           // side of the belt the bays face away from
    this.spots = {
      active: { x: origin.x + bin.x, y: origin.y + bin.y },
      parking: bin.standby ? { x: origin.x + bin.standby.x, y: origin.y + bin.standby.y } : null,
    };
    this.bins = [new Bin(`${this.id}#1`, this, this.capacity)];
    if (bin.standby) { this.bins.push(new Bin(`${this.id}#2`, this, this.capacity)); this.bins[1].loc = 'parking'; }
    this.active = this.bins[0];
    this.parking = bin.standby ? this.bins[1] : null;
    this.switching = null;                                          // { t0, t1, from, to } while the bins exchange places
    this.swaps = 0; this.blockedTime = 0;
  }

  /** open | closing (full or filling up, waits for in-flight items) | switching | gap (no bin present) */
  get state() {
    if (this.switching) return 'switching';
    if (!this.active) return 'gap';
    return this.canAccept() ? 'open' : 'closing';
  }
  spot(which) { return this.spots[which]; }
  /** Where a returning (emptied) bin is put down. */
  placeSpot() { return this.active ? 'parking' : 'active'; }

  canAccept() {
    const a = this.active;
    if (this.switching || !a || a.claimed) return false;
    return this.capacity == null || a.fill + a.reserved < this.capacity;
  }
  reserve() { this.active.reserved++; return this.active; }
  /** Returns false (a violation the caller must record) if the bin is no longer at the active spot. */
  deposit(bin) {
    if (this.active !== bin || this.switching) return false;
    bin.reserved--; bin.fill++;
    return true;
  }

  /** Per-step housekeeping: finish a switch, start one when the active bin is full and a usable standby exists. */
  update(t, dt) {
    if (this.switching && t + 1e-9 >= this.switching.t1) this._finishSwitch();
    if (!this.switching) {
      const spare = this.parking && !this.parking.full && !this.parking.claimed;
      const a = this.active;
      if (a && a.full && a.reserved === 0 && !a.claimed && spare) this._beginSwitch(t, a, this.parking);
      else if (!a && spare) this._beginSwitch(t, null, this.parking);
    }
    if (this.active && this.active.full && this.active.fullAt == null) this.active.fullAt = t;
    if (this.parking && this.parking.full && this.parking.fullAt == null) this.parking.fullAt = t;
    if (!this.canAccept()) this.blockedTime += dt;
  }
  _beginSwitch(t, from, to) { this.switching = { t0: t, t1: t + this.tSwitch, from, to }; }
  _finishSwitch() {
    const { from, to } = this.switching;
    this.switching = null;
    to.loc = 'active'; this.active = to;
    this.parking = from; if (from) from.loc = 'parking';
    this.swaps++;
  }

  /** Full bins a mobile robot may collect now (nothing in flight towards them, no usable standby for an active one). */
  serviceable() {
    if (this.switching) return [];
    const full = b => b && b.full && b.reserved === 0 && !b.claimed;
    const out = [];
    if (full(this.parking)) out.push(this.parking);
    if (full(this.active) && !this.parking) out.push(this.active);   // a full active bin leaves only when its neighbour bay is empty
    return out;
  }
  takeBin(bin) {
    if (this.active === bin) this.active = null; else if (this.parking === bin) this.parking = null; else return false;
    bin.loc = 'carried';
    return true;
  }
  /** Put an emptied bin back. Refuses while a switch is running (the robot waits) or if both spots are taken. */
  placeBin(bin) {
    if (this.switching) return false;
    if (!this.active) { this.active = bin; bin.loc = 'active'; }
    else if (!this.parking) { this.parking = bin; bin.loc = 'parking'; }
    else return false;
    bin.claimed = false; bin.carrier = null; bin.fullAt = null;
    return true;
  }
  /** Demo/test control: fill the active bin to `fraction` of capacity. */
  forceFill(fraction) {
    if (this.active && this.capacity != null) this.active.fill = Math.max(this.active.fill, Math.min(this.capacity, Math.ceil(this.capacity * fraction)));
  }
  /** Position of a bin of this slot at time t; during a switch both bins ride the carousel half a turn about its centre. */
  binPos(bin, t) {
    const sw = this.switching;
    if (sw && (bin === sw.from || bin === sw.to)) {
      const k = Math.min(1, Math.max(0, (t - sw.t0) / (sw.t1 - sw.t0))), A = this.spots.active, P = this.spots.parking;
      const cx = (A.x + P.x) / 2, cy = (A.y + P.y) / 2, start = bin === sw.from ? A : P;
      const th = -this.outward * Math.PI * k, c = Math.cos(th), s = Math.sin(th), vx = start.x - cx, vy = start.y - cy;
      return { x: cx + vx * c - vy * s, y: cy + vx * s + vy * c };
    }
    return this.spots[bin.loc === 'parking' ? 'parking' : 'active'];
  }
  summary() {
    return { swaps: this.swaps, blockedTime: Math.round(this.blockedTime * 1e3) / 1e3, state: this.state,
      fill: this.active ? this.active.fill : null, bins: this.bins.map(b => ({ loc: b.loc, fill: b.fill })) };
  }
}

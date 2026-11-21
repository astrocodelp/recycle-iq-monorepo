// Ported from github.com/Mike17K/recycleiq-delta-sort (ops/server/{config,store,fleet-sim}.js); see NOTICE.
/**
 * Simulated garbage-truck fleet, run in the browser. Each truck owns a sector of bins (k-means = how the fleet is allocated),
 * collects the fullest nearby ones along real OpenStreetMap streets, unloads at a plant when nearly full, and serves citizen
 * reports the operator assigns to it. Every tick each truck produces the same GPS message a real on-board unit would send
 * ({ truckId, lat, lon, speed, heading, ts }), so a real feed can replace the movement model without changing the rest.
 */
import { bearing, distance, kmeans, mulberry32, nearest, type LatLon } from './geo';
import type { RoadGraph } from './router';

export type BinKind = 'b' | 'd' | 'r';
export type Stream = 'general' | 'recycling';
export type TruckState = 'route' | 'idle' | 'collecting' | 'unloading' | 'breakdown';

/** Bin classes: capacity in kg of material and how many kg/h it receives (simulated). */
export const BIN_KINDS: Record<BinKind, { capacityKg: number; kgPerHour: number; stream: Stream }> = {
  b: { capacityKg: 15, kgPerHour: 2.4, stream: 'general' }, // street litter basket
  d: { capacityKg: 120, kgPerHour: 12, stream: 'general' }, // mixed-waste container
  r: { capacityKg: 150, kgPerHour: 14, stream: 'recycling' }, // recycling container
};

export const CONFIG = {
  fillPerScale: 1.5, // bin filling speed-up at scale 1
  collectSeconds: 30, // dwell per bin
  unloadSeconds: 120, // dwell at a plant
  repairSeconds: 900, // breakdown duration
};

export interface Site extends LatLon {
  id: string;
  kind: 'sorting' | 'transfer';
  name: { el: string; en: string };
}
/** Demo coordinates only (not real facility locations). */
export const SITES: Site[] = [
  { id: 'P1', kind: 'sorting', name: { el: 'Μονάδα διαλογής Α', en: 'Sorting plant A' }, lat: 37.9792, lon: 23.6905 },
  { id: 'P2', kind: 'sorting', name: { el: 'Μονάδα διαλογής Β', en: 'Sorting plant B' }, lat: 38.0123, lon: 23.7655 },
  { id: 'T1', kind: 'transfer', name: { el: 'Σταθμός μεταφόρτωσης', en: 'Transfer station' }, lat: 37.956, lon: 23.713 },
];

/** Distinct truck colours; identity is never colour alone (id and plate are always shown). */
export const TRUCK_COLORS = ['#1C7A44', '#2563EB', '#B45309', '#7C3AED', '#0E7490', '#BE185D', '#4D7C0F', '#C2410C', '#334155', '#A16207'];

export interface SimBin extends LatLon {
  id: string;
  kind: BinKind;
  fill: number;
  rate: number;
  truck: string | null;
}
export interface SimReport extends LatLon {
  /** Our collection point id (the dashboard groups reports per bin). */
  id: string;
  name: string;
  stream: Stream;
  binIdx?: number;
  status: 'new' | 'assigned' | 'collected';
  assignedTruck: string | null;
  createdSim: number;
  collectedSim: number | null;
}
interface Target extends LatLon {
  kind: 'bin' | 'site';
  binIdx?: number;
  reportId?: string;
  site?: Site;
}
export interface Truck extends LatLon {
  id: string;
  plate: string;
  type: Stream;
  color: string;
  capacityKg: number;
  sector: number[];
  loadKg: number;
  state: TruckState;
  target: Target | null;
  route: { nodes: number[]; seg: number; off: number } | null;
  stops: { reportId: string; lat: number; lon: number; binIdx?: number }[];
  dwell: number;
  speed: number;
  heading: number;
  repairLeft: number;
  km: number;
  collectedKg: number;
}
export interface GpsMessage {
  truckId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ts: number;
}

export class FleetSim {
  bins: SimBin[];
  reports: SimReport[];
  trucks: Truck[] = [];
  sites = SITES;
  simT = 0;
  counters = { collectedKg: { general: 0, recycling: 0 }, unloadedKg: { sorting: 0, transfer: 0 }, km: 0, reportsCollected: 0, responseSecSum: 0 };
  /** Called when a truck has emptied a reported bin (the page closes the report for real). */
  onReportCollected: ((r: SimReport) => void) | null = null;
  /** Latest GPS message per truck (the message a real tracker would send). */
  gps = new Map<string, GpsMessage>();
  private claimed = new Set<number>();
  private snapCache = new Map<string, number>();

  constructor(
    private graph: RoadGraph,
    bins: { id: string; lat: number; lon: number; kind: BinKind }[],
    reports: Omit<SimReport, 'status' | 'assignedTruck' | 'createdSim' | 'collectedSim' | 'binIdx'>[],
    { trucks = { general: 7, recycling: 3 }, seed = 7 }: { trucks?: Record<Stream, number>; seed?: number } = {},
  ) {
    const rng = mulberry32(seed);
    this.bins = bins.map((b) => ({ ...b, fill: 0.05 + rng() * 0.6, rate: 0.5 + rng(), truck: null }));
    const byId = new Map(this.bins.map((b, i) => [b.id, i]));
    this.reports = reports.map((r) => ({ ...r, binIdx: byId.get(r.id), status: 'new', assignedTruck: null, createdSim: 0, collectedSim: null }));
    for (const r of this.reports) if (r.binIdx !== undefined) this.bins[r.binIdx]!.fill = Math.max(this.bins[r.binIdx]!.fill, 0.95);

    // A stream with no bins gives its trucks to the other stream.
    const idxOf = (s: Stream) => this.bins.map((_, i) => i).filter((i) => BIN_KINDS[this.bins[i]!.kind].stream === s);
    const streams: Record<Stream, number[]> = { general: idxOf('general'), recycling: idxOf('recycling') };
    const total = trucks.general + trucks.recycling;
    const count: Record<Stream, number> = !streams.general.length
      ? { general: 0, recycling: total }
      : !streams.recycling.length
        ? { general: total, recycling: 0 }
        : trucks;
    for (const stream of ['general', 'recycling'] as const) {
      const idx = streams[stream];
      const groups = kmeans(
        idx.map((i) => this.bins[i]!),
        count[stream],
      );
      groups.forEach((g, n) => {
        const sector = g.map((j) => idx[j]!);
        const c0 = sector.length
          ? { lat: sector.reduce((s, i) => s + this.bins[i]!.lat, 0) / sector.length, lon: sector.reduce((s, i) => s + this.bins[i]!.lon, 0) / sector.length }
          : this.sites[0]!;
        const c = graph.pos(graph.nearestNode(c0)!.node);
        const id = `${stream === 'general' ? 'GT' : 'RT'}-${String(n + 1).padStart(2, '0')}`;
        const color = TRUCK_COLORS[this.trucks.length % TRUCK_COLORS.length]!;
        for (const i of sector) this.bins[i]!.truck = id;
        this.trucks.push({
          id,
          plate: `${stream === 'general' ? 'ΖΑΒ' : 'ΖΑΓ'}-${1000 + this.trucks.length * 37}`,
          type: stream,
          color,
          capacityKg: stream === 'general' ? 3000 : 2000,
          sector,
          lat: c.lat,
          lon: c.lon,
          loadKg: 0,
          state: 'idle',
          target: null,
          route: null,
          stops: [],
          dwell: 0,
          speed: 0,
          heading: 0,
          repairLeft: 0,
          km: 0,
          collectedKg: 0,
        });
      });
    }
    this.tick(0, 1);
  }

  truck(id: string) {
    return this.trucks.find((t) => t.id === id) ?? null;
  }

  /** Remaining route of a truck as [lat, lon] pairs (for the map). */
  routeOf(id: string): [number, number][] {
    const t = this.truck(id);
    if (!t?.route) return [];
    return [[t.lat, t.lon], ...t.route.nodes.slice(t.route.seg + 1).map((n): [number, number] => [this.graph.lat[n]!, this.graph.lon[n]!])];
  }

  /** Nearest able truck of the stream that serves this report's bin class. */
  nearestTruck(p: LatLon, stream: Stream) {
    const able = this.trucks.filter((t) => t.state !== 'breakdown' && t.loadKg < t.capacityKg * 0.8);
    const sameStream = able.filter((t) => t.type === stream);
    return nearest(p, sameStream.length ? sameStream : able)?.item ?? null;
  }

  /** Operator: give a citizen report to the nearest able truck, which reroutes to it. Returns the truck or null. */
  assign(reportId: string): Truck | null {
    const r = this.reports.find((x) => x.id === reportId);
    if (!r || r.status !== 'new') return null;
    const t = this.nearestTruck(r, r.stream);
    if (!t) return null;
    r.status = 'assigned';
    r.assignedTruck = t.id;
    t.stops.push({ reportId: r.id, lat: r.lat, lon: r.lon, binIdx: r.binIdx });
    if (t.state === 'idle' || (t.state === 'route' && t.target?.kind === 'bin')) {
      if (t.target?.binIdx !== undefined) this.claimed.delete(t.target.binIdx);
      t.target = null;
      t.route = null;
      t.state = 'idle';
    }
    return t;
  }

  /** Demo: a truck breaks down; its assigned reports go back to "new". */
  breakdown(id: string) {
    const t = this.truck(id);
    if (!t || t.state === 'breakdown') return false;
    for (const s of t.stops) {
      const r = this.reports.find((x) => x.id === s.reportId);
      if (r && r.status === 'assigned') Object.assign(r, { status: 'new', assignedTruck: null });
    }
    if (t.target?.binIdx !== undefined) this.claimed.delete(t.target.binIdx);
    Object.assign(t, { state: 'breakdown', stops: [], target: null, route: null, speed: 0, repairLeft: CONFIG.repairSeconds });
    return true;
  }

  /** Advance everything by dtReal real seconds at clock multiplier `scale`. */
  tick(dtReal: number, scale = 1) {
    const simDt = dtReal * scale;
    const fillHours = (simDt * CONFIG.fillPerScale) / 3600;
    this.simT += simDt;
    for (const b of this.bins) {
      const k = BIN_KINDS[b.kind];
      b.fill = Math.min(1, b.fill + (b.rate * k.kgPerHour * fillHours) / k.capacityKg);
    }
    for (const t of this.trucks) this.step(t, simDt);
    const ts = Date.now();
    for (const t of this.trucks) this.gps.set(t.id, { truckId: t.id, lat: t.lat, lon: t.lon, speed: t.speed, heading: t.heading, ts });
  }

  kpi() {
    const c = this.counters;
    const collected = c.collectedKg.general + c.collectedKg.recycling;
    const available = this.trucks.filter((t) => t.state !== 'breakdown').length;
    return {
      availability: this.trucks.length ? available / this.trucks.length : 0,
      km: c.km,
      collectedKg: collected,
      collectedGeneralKg: c.collectedKg.general,
      collectedRecyclingKg: c.collectedKg.recycling,
      kgPerKm: c.km > 0.01 ? collected / c.km : null,
      binsOver80: this.bins.filter((b) => b.fill > 0.8).length,
      openReports: this.reports.filter((r) => r.status !== 'collected').length,
      avgResponseMin: c.reportsCollected ? c.responseSecSum / c.reportsCollected / 60 : null,
      unloadedKg: c.unloadedKg.sorting + c.unloadedKg.transfer,
    };
  }

  private snap(p: LatLon) {
    const key = `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
    if (!this.snapCache.has(key)) this.snapCache.set(key, this.graph.nearestNode(p)!.node);
    return this.snapCache.get(key)!;
  }

  private step(t: Truck, simDt: number) {
    if (t.state === 'breakdown') {
      t.repairLeft -= simDt;
      t.speed = 0;
      if (t.repairLeft <= 0) t.state = 'idle';
      return;
    }
    if (t.state === 'collecting' || t.state === 'unloading') {
      t.speed = 0;
      t.dwell -= simDt;
      if (t.dwell <= 0) {
        if (t.state === 'collecting') this.collect(t);
        else this.unload(t);
      }
      return;
    }
    if (t.state === 'idle') {
      this.choose(t);
      if (!t.target) {
        t.speed = 0;
        return;
      }
      if (!this.plan(t)) return;
      t.state = 'route';
    }
    // Drive along the road route.
    const r = t.route!;
    const g = this.graph;
    let left = simDt;
    let sp = 0;
    while (left > 1e-9 && r.seg < r.nodes.length - 1) {
      const a = r.nodes[r.seg]!;
      const b = r.nodes[r.seg + 1]!;
      const len = distance(g.pos(a), g.pos(b));
      sp = g.speedOn(a, b);
      const need = (len - r.off) / sp;
      if (need <= left) {
        left -= need;
        const km = (len - r.off) / 1000;
        this.counters.km += km;
        t.km += km;
        r.seg++;
        r.off = 0;
      } else {
        r.off += sp * left;
        const km = (sp * left) / 1000;
        this.counters.km += km;
        t.km += km;
        left = 0;
      }
    }
    if (r.seg >= r.nodes.length - 1) {
      const p = g.pos(r.nodes[r.nodes.length - 1]!);
      t.lat = p.lat;
      t.lon = p.lon;
      t.speed = 0;
      t.route = null;
      if (t.target!.kind === 'site') {
        t.state = 'unloading';
        t.dwell = CONFIG.unloadSeconds;
      } else {
        t.state = 'collecting';
        t.dwell = CONFIG.collectSeconds;
      }
      return;
    }
    const a = g.pos(r.nodes[r.seg]!);
    const b = g.pos(r.nodes[r.seg + 1]!);
    const f = r.off / Math.max(distance(a, b), 1e-9);
    t.lat = a.lat + (b.lat - a.lat) * f;
    t.lon = a.lon + (b.lon - a.lon) * f;
    t.heading = bearing(a, b);
    t.speed = sp;
  }

  /** Road route from the truck's position to its target; on failure the target is dropped. */
  private plan(t: Truck) {
    const from = this.graph.nearestNode(t)!.node;
    const to = this.snap(t.target!);
    const route = this.graph.route(from, to);
    if (!route) {
      if (t.target!.binIdx !== undefined) this.claimed.delete(t.target!.binIdx);
      t.stops = t.stops.filter((s) => s.reportId !== t.target!.reportId);
      t.target = null;
      return false;
    }
    t.route = { nodes: route.nodes, seg: 0, off: 0 };
    return true;
  }

  private choose(t: Truck) {
    if (t.loadKg >= t.capacityKg * 0.85) {
      // Full: go to the nearest suitable site.
      const kind = t.type === 'recycling' ? 'sorting' : 'transfer';
      const site = nearest(t, this.sites.filter((s) => s.kind === kind))?.item;
      if (site) {
        t.target = { kind: 'site', site, lat: site.lat, lon: site.lon };
        return;
      }
    }
    if (t.stops.length) {
      // Operator-assigned citizen reports first.
      const s = t.stops[0]!;
      t.target = { kind: 'bin', reportId: s.reportId, binIdx: s.binIdx, lat: s.lat, lon: s.lon };
      if (s.binIdx !== undefined) this.claimed.add(s.binIdx);
      return;
    }
    // Fullest-and-close bin of the sector.
    let best = -1;
    let bs = -Infinity;
    for (const i of t.sector) {
      const b = this.bins[i]!;
      if (b.fill < 0.6 || this.claimed.has(i)) continue;
      const score = b.fill - distance(t, b) / 4000;
      if (score > bs) {
        bs = score;
        best = i;
      }
    }
    if (best >= 0) {
      this.claimed.add(best);
      const b = this.bins[best]!;
      t.target = { kind: 'bin', binIdx: best, lat: b.lat, lon: b.lon };
    }
  }

  private collect(t: Truck) {
    const tg = t.target!;
    let kg = 20;
    if (tg.binIdx !== undefined) {
      const b = this.bins[tg.binIdx]!;
      kg = b.fill * BIN_KINDS[b.kind].capacityKg;
      b.fill = 0;
      this.claimed.delete(tg.binIdx);
    }
    t.loadKg += kg;
    t.collectedKg += kg;
    t.stops = t.stops.filter((s) => s.reportId !== tg.reportId);
    this.counters.collectedKg[t.type] += kg;
    if (tg.reportId) {
      const r = this.reports.find((x) => x.id === tg.reportId);
      if (r && r.status !== 'collected') {
        r.status = 'collected';
        r.collectedSim = this.simT;
        this.counters.reportsCollected++;
        this.counters.responseSecSum += this.simT - r.createdSim;
        this.onReportCollected?.(r);
      }
    }
    t.target = null;
    t.state = 'idle';
  }

  private unload(t: Truck) {
    const kind = t.target!.site!.kind;
    this.counters.unloadedKg[kind] += t.loadKg;
    t.loadKg = 0;
    t.target = null;
    t.state = 'idle';
  }
}

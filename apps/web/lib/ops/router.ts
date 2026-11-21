// Ported from github.com/Mike17K/recycleiq-delta-sort (ops/server/router.js); see NOTICE.
/**
 * Road network and routing for the fleet. Graph built from OpenStreetMap ways (public/ops/roads.json, © OpenStreetMap
 * contributors, ODbL). Directed edges honour one-way streets; only the largest strongly connected component is kept, so
 * every route exists. Edge cost is travel time using a speed per road class (garbage trucks in a city), found with A*.
 */
import { distance, type LatLon } from './geo';

/** m/s for a heavy vehicle, by road class index (motorway, trunk, primary, secondary, tertiary, residential, service). */
export const CLASS_SPEED = [14, 10, 8, 7, 5.5, 4.5, 3];
const M_LAT = 111320;

export interface RoadData {
  classes: string[];
  /** Flat [lat0, lon0, lat1, lon1, ...]. */
  nodes: number[];
  /** [classIndex, oneway(0|1), ...nodeIds]. */
  ways: number[][];
}
export interface Route {
  nodes: number[];
  lengthM: number;
  seconds: number;
}
type Edge = [to: number, lengthM: number, speed: number];

export class RoadGraph {
  lat: Float64Array;
  lon: Float64Array;
  adj: Edge[][];
  ok!: Uint8Array;
  size = 0;
  private cell = 0.002;
  private grid = new Map<string, number[]>();

  constructor(data: RoadData) {
    const n = data.nodes.length / 2;
    this.lat = new Float64Array(n);
    this.lon = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      this.lat[i] = data.nodes[2 * i]!;
      this.lon[i] = data.nodes[2 * i + 1]!;
    }
    const adj: Edge[][] = Array.from({ length: n }, () => []);
    for (const [cls, ow, ...ids] of data.ways) {
      const sp = CLASS_SPEED[cls!] ?? CLASS_SPEED[5]!;
      for (let k = 0; k + 1 < ids.length; k++) {
        const a = ids[k]!;
        const b = ids[k + 1]!;
        const len = distance(this.pos(a), this.pos(b));
        adj[a]!.push([b, len, sp]);
        if (!ow) adj[b]!.push([a, len, sp]);
      }
    }
    this.adj = adj;
    this.keepLargestComponent();
    this.buildGrid();
  }

  pos(i: number): LatLon {
    return { lat: this.lat[i]!, lon: this.lon[i]! };
  }

  /** Kosaraju (iterative) on the directed graph; keeps the largest strongly connected component. */
  private keepLargestComponent() {
    const n = this.adj.length;
    const order: number[] = [];
    const seen = new Uint8Array(n);
    for (let s = 0; s < n; s++) {
      if (seen[s]) continue;
      const st: [number, number][] = [[s, 0]];
      seen[s] = 1;
      while (st.length) {
        const top = st[st.length - 1]!;
        const u = top[0];
        if (top[1] < this.adj[u]!.length) {
          const v = this.adj[u]![top[1]]![0];
          top[1]++;
          if (!seen[v]) {
            seen[v] = 1;
            st.push([v, 0]);
          }
        } else {
          order.push(u);
          st.pop();
        }
      }
    }
    const radj: number[][] = Array.from({ length: n }, () => []);
    for (let u = 0; u < n; u++) for (const [v] of this.adj[u]!) radj[v]!.push(u);
    const comp = new Int32Array(n).fill(-1);
    const sizes: number[] = [];
    for (let k = n - 1; k >= 0; k--) {
      const s = order[k]!;
      if (comp[s]! >= 0) continue;
      const c = sizes.length;
      let size = 0;
      const st = [s];
      comp[s] = c;
      while (st.length) {
        const u = st.pop()!;
        size++;
        for (const v of radj[u]!)
          if (comp[v]! < 0) {
            comp[v] = c;
            st.push(v);
          }
      }
      sizes.push(size);
    }
    const best = sizes.indexOf(Math.max(...sizes));
    this.ok = Uint8Array.from(comp, (c) => (c === best ? 1 : 0));
    this.size = sizes[best] ?? 0;
  }

  /** ~200 m cells for nearest-node queries. */
  private buildGrid() {
    for (let i = 0; i < this.lat.length; i++) {
      if (!this.ok[i]) continue;
      const key = this.key(this.lat[i]!, this.lon[i]!);
      const list = this.grid.get(key);
      if (list) list.push(i);
      else this.grid.set(key, [i]);
    }
  }
  private key(lat: number, lon: number) {
    return `${Math.floor(lat / this.cell)},${Math.floor(lon / this.cell)}`;
  }

  /** Nearest routable node to a point (searches growing rings of grid cells). */
  nearestNode(p: LatLon): { node: number; dist: number } | null {
    const cy = Math.floor(p.lat / this.cell);
    const cx = Math.floor(p.lon / this.cell);
    let best = -1;
    let bd = Infinity;
    for (let r = 0; r < 40; r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          for (const i of this.grid.get(`${cy + dy},${cx + dx}`) ?? []) {
            const d = distance(p, this.pos(i));
            if (d < bd) {
              bd = d;
              best = i;
            }
          }
        }
      if (best >= 0 && bd < (r + 0.5) * this.cell * M_LAT * 0.7) break;
    }
    return best >= 0 ? { node: best, dist: bd } : null;
  }

  /** Fastest route between two nodes (A* on travel time), or null. */
  route(from: number, to: number): Route | null {
    if (from === to) return { nodes: [from], lengthM: 0, seconds: 0 };
    const g = new Map<number, number>([[from, 0]]);
    const prev = new Map<number, number>();
    const closed = new Set<number>();
    const vmax = CLASS_SPEED[0]!;
    const goal = this.pos(to);
    const h = (i: number) => distance(this.pos(i), goal) / vmax;
    const heap: [number, number][] = [[h(from), from]];
    const push = (e: [number, number]) => {
      heap.push(e);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p]![0] <= heap[i]![0]) break;
        [heap[p], heap[i]] = [heap[i]!, heap[p]!];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
          if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i]!, heap[m]!];
          i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [, u] = pop();
      if (closed.has(u)) continue;
      closed.add(u);
      if (u === to) break;
      for (const [v, len, sp] of this.adj[u]!) {
        if (!this.ok[v] || closed.has(v)) continue;
        const nd = g.get(u)! + len / sp;
        if (nd < (g.get(v) ?? Infinity)) {
          g.set(v, nd);
          prev.set(v, u);
          push([nd + h(v), v]);
        }
      }
    }
    if (!prev.has(to)) return null;
    const nodes = [to];
    while (nodes[0] !== from) nodes.unshift(prev.get(nodes[0]!)!);
    let lengthM = 0;
    for (let k = 1; k < nodes.length; k++) lengthM += distance(this.pos(nodes[k - 1]!), this.pos(nodes[k]!));
    return { nodes, lengthM, seconds: g.get(to)! };
  }

  /** Speed (m/s) on the edge a -> b (best of parallel edges). */
  speedOn(a: number, b: number) {
    let s = 0;
    for (const [v, , sp] of this.adj[a]!) if (v === b && sp > s) s = sp;
    return s || CLASS_SPEED[5]!;
  }
}

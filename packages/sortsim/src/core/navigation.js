// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/navigation.js); see NOTICE.
/** Aisle graph for mobile robots: shortest paths over a (partly one-way) waypoint graph, and polylines with position/direction at distance. */
import { dist } from './motion.js';

export class Graph {
  /** @param { nodes: {id:{x,y}}, edges } edge [a, b] is two-way, [a, b, '>'] is one-way a -> b; length = euclidean distance */
  constructor({ nodes, edges }) {
    this.nodes = nodes;
    this.ids = Object.keys(nodes).sort();                  // sorted: deterministic tie-breaking
    this.adj = Object.fromEntries(this.ids.map(id => [id, []]));
    for (const [a, b, dir] of edges) {
      const w = dist(nodes[a], nodes[b]);
      this.adj[a].push([b, w]);
      if (dir !== '>') this.adj[b].push([a, w]);
    }
  }
  nearest(p) {
    let best = null;
    for (const id of this.ids) { const d = dist(p, this.nodes[id]); if (!best || d < best.dist - 1e-9) best = { id, dist: d }; }
    return best;
  }
  /** Dijkstra. Returns { ids, length } or null if unreachable. */
  path(from, to) {
    const d = Object.fromEntries(this.ids.map(i => [i, Infinity])), prev = {}, done = new Set();
    d[from] = 0;
    for (;;) {
      let u = null;
      for (const i of this.ids) if (!done.has(i) && d[i] < Infinity && (u === null || d[i] < d[u])) u = i;
      if (u === null || u === to) break;
      done.add(u);
      for (const [v, w] of this.adj[u]) if (d[u] + w < d[v] - 1e-12) { d[v] = d[u] + w; prev[v] = u; }
    }
    if (d[to] === Infinity) return null;
    const ids = [to];
    while (ids[0] !== from) ids.unshift(prev[ids[0]]);
    return { ids, length: d[to] };
  }
  points(ids) { return ids.map(i => ({ ...this.nodes[i] })); }
  /** Ids of nodes where three or more aisle segments meet (merges, splits, siding entrances). */
  junctions() {
    const nb = Object.fromEntries(this.ids.map(i => [i, new Set()]));
    for (const a of this.ids) for (const [b] of this.adj[a]) { nb[a].add(b); nb[b].add(a); }
    return this.ids.filter(i => nb[i].size >= 3);
  }
  /** Strongly connected: every node can reach every other node following edge directions. */
  connected() { return this.ids.every(i => this.path(this.ids[0], i) && this.path(i, this.ids[0])); }
}

/** Polyline through points; at(s) gives the position after travelling distance s along it. */
export function makePath(points) {
  const pts = points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 1e-9);   // drop zero-length legs
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]));
  const length = cum[cum.length - 1];
  return {
    points: pts, length,
    /** Unit direction of travel at distance s (zero vector for a single point). */
    dirAt(s) {
      if (pts.length < 2) return { x: 0, y: 0 };
      let i = 1; while (i < pts.length - 1 && cum[i] < s) i++;
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      return { x: (pts[i].x - pts[i - 1].x) / d, y: (pts[i].y - pts[i - 1].y) / d };
    },
    at(s) {
      if (pts.length === 1 || s <= 0) return { ...pts[0] };
      if (s >= length) return { ...pts[pts.length - 1] };
      let i = 1; while (cum[i] < s) i++;
      const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    },
  };
}

// Copied from github.com/Mike17K/recycleiq-delta-sort (src/scenes/layout.js); see NOTICE.
/** Small helpers so scene files describe *intent* (counts, spacing, classes) instead of raw coordinates. */

/** n x-positions starting at `first`, `spacing` apart. */
export const evenXs = (n, first, spacing) => Array.from({ length: n }, (_, i) => +(first + i * spacing).toFixed(3));

const BAY_GAP = 0.4;   // distance between the two bays of a slot (matches line-config)

/**
 * Bins on both sides of the belt: class i goes to slot floor(i/2); even i on the +y row, odd i on the -y row.
 * `slotXs` are slot centres. With `extra.standby` the two bays are centred on the slot x and `extra.side` (-1 = active
 * bay on the left, +1 = right; a number or a function of the class index) says which bay is the active one: each active
 * bay is within reach of the robot on its side, so pick sides such that every robot has a bin to serve. Slots must be
 * clear of gantry posts (validateLineConfig checks reach and clearance).
 */
export function binRows(classes, slotXs, rowY = 0.68, { side = -1, ...extra } = {}) {
  if (classes.length > slotXs.length * 2) throw new Error(`binRows: ${classes.length} classes need ${Math.ceil(classes.length / 2)} slots`);
  return Object.fromEntries(classes.map((k, i) => {
    const c = slotXs[Math.floor(i / 2)], y = i % 2 === 0 ? rowY : -rowY;
    if (!extra.standby) return [k, { x: c, y, ...extra }];
    const s = typeof side === 'function' ? side(i) : side;
    return [k, { x: +(c + s * BAY_GAP / 2).toFixed(3), y, ...extra, standby: { x: +(c - s * BAY_GAP / 2).toFixed(3), y } }];
  }));
}

/** x of every bay (active and standby) in the given bin maps: the aisles need a stop in front of each. */
export function bayXs(...binMaps) {
  const xs = new Set();
  for (const bins of binMaps) for (const b of Object.values(bins)) {
    xs.add(b.x);
    if (b.standby) xs.add(b.standby === true ? +(b.x + BAY_GAP).toFixed(3) : b.standby.x);
  }
  return [...xs].sort((a, b) => a - b);
}

/**
 * One-way aisle loops for mobile robots.
 *  - lanes: [{ y, dir }]  horizontal lanes, dir +1 = towards +x, -1 = towards -x; a node at every stop x
 *  - links: [{ from, to, at: 'x0'|'x1' }]  one-way cross links between lane indices at an end
 *  - homes: [{ x, y, lane }]  sidings where idle robots park, attached to that lane's x0 node (two-way spur)
 * Node ids: L<lane>_<stop>, H<n>. Keep lanes in the same order as `links` expect; links must join adjacent lanes.
 */
export function aisleGraph({ lanes, xs, x0, x1, links = [], homes = [] }) {
  const stops = [...new Set([x0, ...xs, x1])].sort((a, b) => a - b), last = stops.length - 1;
  const nodes = {}, edges = [];
  lanes.forEach(({ y, dir }, li) => stops.forEach((x, xi) => {
    nodes[`L${li}_${xi}`] = { x, y };
    if (xi) edges.push(dir > 0 ? [`L${li}_${xi - 1}`, `L${li}_${xi}`, '>'] : [`L${li}_${xi}`, `L${li}_${xi - 1}`, '>']);
  }));
  for (const { from, to, at } of links) { const xi = at === 'x0' ? 0 : last; edges.push([`L${from}_${xi}`, `L${to}_${xi}`, '>']); }
  homes.forEach((h, i) => { nodes[`H${i}`] = { x: h.x, y: h.y }; edges.push([`H${i}`, `L${h.lane}_0`]); });
  return { nodes, edges };
}

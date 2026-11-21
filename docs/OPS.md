# Fleet and sorting (Στόλος & Διαλογή) — MVP

Two dashboard pages bring the RecycleIQ Delta Sort operations work
([github.com/Mike17K/recycleiq-delta-sort](https://github.com/Mike17K/recycleiq-delta-sort), `ops/` and `src/core`)
into the municipal dashboard. Everything except the citizen reports is a **simulation**, and the pages say so.

## /fleet — garbage-truck fleet

| What | How |
| --- | --- |
| Streets | `apps/web/public/ops/roads.json` (2.6 MB, © OpenStreetMap contributors, ODbL): 93,511 nodes, 27,476 ways, 7 road classes. |
| Routing | `lib/ops/router.ts`: directed graph that honours one-way streets, only the largest strongly connected component is kept (90,982 nodes) so every route exists, A* on travel time with a speed per road class for a heavy vehicle (about 50 down to 11 km/h). |
| Fleet | `lib/ops/fleet-sim.ts`: 7 mixed-waste + 3 recycling trucks (all 10 on one stream if the other has no bins). |
| Allocation (κατανομή) | Each stream's bins are split into sectors with k-means, one sector per truck. A truck empties the fullest-and-nearest bins of its sector (fill ≥ 60%), unloads at a site at 85% load (recycling → sorting plant, mixed → transfer station), dwells 30 s per bin and 120 s per unload. |
| Bins | The dashboard's current bin source (Synthetic or Real/OpenStreetMap). OSM `waste_basket` → 15 kg litter basket, `waste_disposal` → 120 kg mixed container, everything else → 150 kg recycling container. Fill grows at a simulated rate. |
| Sites | P1, P2 (sorting) and T1 (transfer) at **demo coordinates**, not real facilities. |
| Citizen reports | **Real**: the open `bin_reports` from the database. "Ανάθεση στο πλησιέστερο όχημα" gives the report to the nearest able truck of the right stream, which reroutes on the streets. When the truck empties that bin, the page calls the dashboard's `resolveBin` action, so the report closes for real (and is mirrored to AthensGov when connected). |
| Demo controls | Speed 1× / 2× / 5× / 10×, a per-truck "Βλάβη" (breakdown, 15 simulated minutes; its reports go back to the queue), click a truck for its remaining route. |
| KPIs | Fleet availability, km driven, kg collected (mixed / recycling), kg per km, bins over 80%, open reports and average response time. |

The simulation runs **in the browser** (Vercel functions cannot host a ticking server). Building the road graph takes
about 0.2 s and a tick about 3 ms, so it runs on the main thread, every 0.5 s.

### Plugging in a real GPS feed

Every tick each simulated truck produces the same message a real on-board unit would send:

```json
{ "truckId": "GT-01", "lat": 37.98, "lon": 23.73, "speed": 6.2, "heading": 90, "ts": 1795200000000 }
```

(`FleetSim.gps`). A real feed replaces the movement model: POST these messages to an endpoint, store the last one per
truck, and draw them on the same map; sectors, reports and KPIs stay the same.

## /sorting — sorting plants

`packages/sortsim` holds the headless delta-robot sorter (`src/core`, `src/scenes`, copied from the Delta Sort repo) and
`scripts/summarize.mjs`, a port of `ops/server/plant-sim.js`. It runs each demo plant for **10 simulated minutes** with a
fixed seed (deterministic) and converts item counts to kilograms with typical weights per item:

```bash
pnpm --filter @recycleiq/sortsim summarize   # rewrites packages/sortsim/data/summary.json
```

The page reads that JSON (static, no runtime cost) and shows input, sorted, recovery, residue, kg/h, items/min, kg per
material, a Sankey (input → materials → destinations), the destinations table, and the Delta Sort business case from
`BUSINESS_CASE.md` (assumptions, not supplier quotes). Purity is 100% by construction: item types are given to the
simulation (no vision).

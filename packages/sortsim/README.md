# RecycleIQ Delta Sort (`@recycleiq/sortsim`)

Delta Sort is the sorting-centre part of RecycleIQ. Delta robots pick recyclables off a conveyor and drop them into bins by material, and mobile robots (AMRs) take full bins to large containers. This package holds the headless simulation of that plant and the figures it produces for the dashboard.

It is a simulation, not hardware. The robots know each item's material from the start; there is no camera or vision model in the loop. Timings are indicative and the costs in the business case are assumptions.

The full project, with the browser view, the 3D factory, the tests and the video recorder, is [Mike17K/recycleiq-delta-sort](https://github.com/Mike17K/recycleiq-delta-sort). The code here is copied from its commit `ab878ba` (see `NOTICE` at the repo root).

## What the simulation models

There are two scenes:

- `single-line`: one 5.4 m belt, 3 delta robots, bins for 6 materials (clear PET, coloured PET, HDPE, PS, PP, aluminium), 3 AMRs and 2 containers.
- `twin-lines`: two belts with 6 robots each, a different speed and material mix per belt, 5 AMRs and 3 containers.

Items arrive on the belt at random from the scene's material mix. For each item the planner works out where a robot can meet it on the belt and how long the pick cycle takes, using delta-robot kinematics and trapezoid motion profiles. An earliest-deadline-first scheduler hands items to idle robots. Items no robot can reach in time ride on to the end of the belt and count as misses.

When a bin fills, a carousel turns a standby bin into place. An AMR stops in the aisle in front of the bay, the full bin slides onto it, it drives to a container, empties the bin and brings it back as the next standby. A robot only plans a pick into a bin that is in place, not full and not being swapped, and each pick reserves room in the bin. AMRs drive on one-way aisle loops, keep at least 0.75 m from each other and take turns at junctions.

Random numbers are seeded, so the same scene and seed always give the same run.

## Run it

```bash
pnpm --filter @recycleiq/sortsim summarize
```

This runs each scene for 10 simulated minutes and writes `data/summary.json`. It prints one line per plant:

```
P1 single-line: 946 items, 787 picked (78.7/min), sorted 21.05 kg, residue 6.36 kg, recovery 0.77
P2 twin-lines: 5027 items, 3297 picked (329.7/min), sorted 221.09 kg, residue 69.2 kg, recovery 0.76
```

The script turns item counts into kilograms with a typical weight per material (28 g for a clear PET item, 300 g for glass) and maps each material to the kind of plant that takes it, such as a PET recycler or an aluminium smelter. Everything the robots do not pick goes to residue. The run is deterministic, so running it again gives the same file unless you change the code, the seed or the duration. Seed and duration are constants at the top of `scripts/summarize.mjs`.

There are no tests in this package. The test suite (63 tests) is in the upstream repo. To watch the simulation in a browser:

```bash
git clone https://github.com/Mike17K/recycleiq-delta-sort
cd recycleiq-delta-sort
npm install
python3 -m http.server 8000
```

Then open http://localhost:8000/?scene=twin-lines. `npm test` there runs the tests.

## Layout

| Path | What it holds |
|---|---|
| `src/core/` | The simulation, with no DOM: kinematics, motion profiles, pick planner, scheduler, belt line and plant, plus the bin slots, aisle graph, containers, AMR dispatcher and fleet traffic. |
| `src/scenes/` | The two scenes as plain data (belts, robots, bins, material mix, AMRs, containers, demo timeline) and the registry in `index.js`. |
| `scripts/summarize.mjs` | Runs both scenes and writes the summary. |
| `data/summary.json` | The generated summary. The package exports it as `@recycleiq/sortsim/summary.json`. |

## Where RecycleIQ uses it

The dashboard's sorting page (`apps/web/app/(dashboard)/sorting`, live at https://recycleiq.eu/sorting) imports `summary.json` and shows each plant's throughput, material flows and where the material goes. The public page https://recycleiq.eu/delta-sort (`apps/web/app/delta-sort`) shows a recorded demo of the simulation and links to the upstream repo.

The recognition step is meant to use the same open image model as the app's scan screen (SigLIP 2, see `docs/VISION.md`), so a material learned once would be recognised on the phone and on the sorting line. That is not wired into the simulation yet.

## Business case

These figures are from `BUSINESS_CASE.md` in the upstream repo. Throughput comes from the simulation (10 simulated minutes, seed 1, default scene settings), so it differs slightly from the summary above, which uses other seeds. The costs are assumptions, not supplier quotes.

| | single-line | twin-lines |
|---|---|---|
| Layout | 1 belt, 3 delta robots, 3 AMRs | 2 belts, 12 delta robots, 5 AMRs |
| Items sorted per minute | 80 | 337 |
| Missed (to residue) | 8% | 29% |
| Capex | EUR 382k | EUR 1,163k |
| Net saving per year | EUR 109k | EUR 483k |
| Payback | 3.5 years | 2.4 years |

The twin-lines scene misses more because the AMRs and containers cannot keep up at that input rate.

The main assumptions: a delta robot with gripper costs EUR 55k, an AMR EUR 30k, and vision, PLC, safety and integration add 25% to the equipment. A manual picker sorts 35 items a minute. Labour costs EUR 15 an hour, over 2 shifts of 7.5 hours for 250 days a year. Maintenance is 5% of capex a year.

Energy, floor space, downtime, spare parts, financing and the value of the recovered material are not counted. Grip success and recognition errors are outside the simulation, so a real line would sort less than these figures.

## Licence

Delta Sort is written by Mike17K, who is on the RecycleIQ team. The code in this package is part of the monorepo and is under the same Apache 2.0 licence (`LICENSE` at the repo root). Each copied file names its source.

# RecycleIQ

**Ξέρεις τι. Ξέρεις πού. Ανακυκλώνεις σωστά.** Know what. Know where. Recycle right.

RecycleIQ helps residents of Athens put each item in the right bin, and gives the municipality a
neighbourhood-level view of what people throw away and where bins are missing. Built for Apps4Athens 2026.
Open source (Apache-2.0) so any municipality can run it for its own city.

| Surface | What it does | Where |
| --- | --- | --- |
| Citizen app | Scan or search an item, answer at most one question, get the bin, the reason and the nearest point. Scanning unlocks stories and historic events of your neighbourhood; a leaderboard of who scans the most; report full bins with a photo. | `apps/mobile` (Expo / React Native) |
| Municipal dashboard | Requests, categories and bins per neighbourhood, Athens map, live full-bin alerts, rule toggles with impact preview, bin QR stickers. | `apps/web` (Next.js on Vercel) |
| Public API | The same decision engine for the app and any other client. | `apps/web/app/api/v1` |
| Decision engine | 13 municipal rules, explainable 6-step trace, search, rewards, on-device neighbourhood lookup. | `packages/engine` |
| Database | Districts, collection points, rules, decisions, leaderboard nicknames, full-bin reports, service requests. | `packages/db` (Drizzle on Neon Postgres) |
| Design tokens | One source for web (Tailwind v4) and mobile. | `packages/tokens` |

```
 phone (Expo)                         Vercel (Next.js)                       Neon (Postgres)
 ┌──────────────────────┐   HTTPS    ┌──────────────────────────────┐       ┌───────────────────┐
 │ scan / search        │──────────▶│ /api/v1/decisions ─ engine ──│──────▶│ rules, decisions  │
 │ GPS → neighbourhood  │  district │ /api/v1/leaderboard, reports │       │ districts, points │
 │ (on device)          │  id only  │ dashboard (/, /map, /rules)  │◀──────│ bin reports       │
 └──────────────────────┘            └──────────────────────────────┘       └───────────────────┘
```

## Quick start

Requires Node 22 and pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env
docker compose up -d          # local Postgres (or put a Neon branch URL in .env)
pnpm db:migrate
pnpm db:seed                  # 38 districts, 220 mock points, 13 rules + synthetic activity
pnpm --filter @recycleiq/web dev        # http://localhost:3000 (landing), /city (dashboard)
pnpm --filter @recycleiq/mobile start   # Expo: press i / a, or scan the QR with Expo Go
```

Checks: `pnpm typecheck`, `pnpm --filter @recycleiq/engine test`, `pnpm --filter @recycleiq/web lint`.

## Honesty notes

Collection points are mock locations. Rules are indicative, not the official regulation. Dashboard
activity is synthetic (rows marked `synthetic`), and the app and dashboard label all of this. Using the app is not verified recycling. Environmental gains are estimates of CO₂e avoided *if* items are recycled as advised, from the UK DESNZ 2025 GHG conversion factors (`packages/engine/src/environment.ts`), with typical item weights stated.

## Docs

- [Deployment: Vercel + Neon, Expo / EAS](docs/DEPLOYMENT.md)
- [Privacy by design (GDPR)](docs/PRIVACY.md)
- [Adopt RecycleIQ for your municipality](docs/ADOPT.md)
- [Finding the bins: geodata plan](docs/GEODATA.md)
- [On-device recognition with SigLIP 2](docs/VISION.md)
- [Fleet routing and sorting plants (simulation)](docs/OPS.md)
- [MCP connector: RecycleIQ in the municipality's own AI](docs/MCP.md)
- [Architecture](docs/ARCHITECTURE.md)

RecycleIQ Delta Sort, the sorting infrastructure for recycling centres (delta robots on a conveyor, mobile robots hauling bins), lives in its own repository as a simulation: [Mike17K/recycleiq-delta-sort](https://github.com/Mike17K/recycleiq-delta-sort). It is not a street bin, and its hardware is out of scope here. Its vision cell uses the same open model as the app's scan screen (SigLIP 2, see [docs/VISION.md](docs/VISION.md)), so a material learned once is recognised on the phone and on the sorting line.

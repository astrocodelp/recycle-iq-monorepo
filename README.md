# RecycleIQ

**Ξέρεις τι. Ξέρεις πού. Ανακυκλώνεις σωστά.** Know what. Know where. Recycle right.

RecycleIQ helps residents of Athens put each item in the right bin, and gives the municipality a
neighbourhood-level view of what people throw away and where bins are missing. Built for Apps4Athens 2026.
Open source (Apache-2.0) so any municipality can run it for its own city.

| Surface | What it does | Where |
| --- | --- | --- |
| Citizen app | Scan or search an item, answer at most one question, get the bin, the reason and the nearest point. Daily bin selfie earns κουπόνια (coupons). | `apps/mobile` (Expo / React Native) |
| Municipal dashboard | Requests, categories and bins per neighbourhood, Athens map, rule toggles with impact preview, bin QR stickers. | `apps/web` (Next.js on Vercel) |
| Public API | The same decision engine for the app and any other client. | `apps/web/app/api/v1` |
| Decision engine | 13 municipal rules, explainable 6-step trace, search, rewards, on-device neighbourhood lookup. | `packages/engine` |
| Database | Districts, collection points, rules, decisions, check-ins, service requests. | `packages/db` (Drizzle on Neon Postgres) |
| Design tokens | One source for web (Tailwind v4) and mobile. | `packages/tokens` |

```
 phone (Expo)                         Vercel (Next.js)                       Neon (Postgres)
 ┌──────────────────────┐   HTTPS    ┌──────────────────────────────┐       ┌───────────────────┐
 │ scan / search        │──────────▶│ /api/v1/decisions ─ engine ──│──────▶│ rules, decisions  │
 │ GPS → neighbourhood  │  district │ /api/v1/points, checkins ... │       │ districts, points │
 │ (on device)          │  id only  │ dashboard (/, /map, /rules)  │◀──────│ check-ins         │
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
pnpm --filter @recycleiq/web dev        # http://localhost:3000
pnpm --filter @recycleiq/mobile start   # Expo: press i / a, or scan the QR with Expo Go
```

Checks: `pnpm typecheck`, `pnpm --filter @recycleiq/engine test`, `pnpm --filter @recycleiq/web lint`.

## Honesty notes

Collection points are mock locations. Rules are indicative, not the official regulation. Dashboard
activity is synthetic (rows marked `synthetic`), and the app and dashboard label all of this. Reward
partners and prices are indicative. Using the app is not verified recycling, and we make no CO₂ claims.

## Docs

- [Deployment: Vercel + Neon, Expo / EAS](docs/DEPLOYMENT.md)
- [Privacy by design (GDPR)](docs/PRIVACY.md)
- [Adopt RecycleIQ for your municipality](docs/ADOPT.md)
- [Finding the bins: geodata plan](docs/GEODATA.md)
- [On-device recognition with SigLIP 2](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)

The RecycleIQ Sort machine (hardware) is out of scope for this repository for now.

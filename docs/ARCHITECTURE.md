# Architecture

pnpm workspace + Turborepo. Internal packages ship TypeScript source; Next.js and Metro compile them.

- `packages/engine`: pure functions, no I/O. `evaluate()` applies the rules for an item, its answers
  and the neighbourhood; `explain()` adds nearby points and the 6-step trace (recognition, material,
  condition, rules, location, final). Also search, point ranking, rewards, `ruleImpact()` (what a rule
  toggle would change) and `locateDistrict()` (GPS to neighbourhood, on device).
- `packages/db`: Drizzle schema and migrations. Neon HTTP driver at runtime on Vercel, node-postgres
  for scripts and local development.
- `apps/web`: Next.js 16. Dashboard pages in `app/(dashboard)`, public bin pages in `app/b`, API in
  `app/api/v1`. Every recommendation goes through `lib/data.ts#makeDecision`: rules from the database,
  then the engine, then nearby points, then a logged row.
- `apps/mobile`: Expo Router. Calls the API for decisions so dashboard rule changes apply instantly;
  uses the engine directly for offline search, formatting and the neighbourhood lookup.

Rule changes in the dashboard are stored in `rules` (audited in `rule_changes`) and take effect on the
next decision. The seed is idempotent and only replaces rows marked `synthetic`.

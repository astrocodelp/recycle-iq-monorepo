# RecycleIQ: handoff for the next session

Snapshot of where the project stands (21 Nov 2026), for picking the work up on a local machine.
Read this first, then the docs it points to. Do not trust it over the code: check before you act.

## What this is

RecycleIQ, Apps4Athens 2026 (team StellarFirm). Residents scan or type an item and learn which bin, why, and the
nearest one; the Municipality of Athens sees everything per neighbourhood on an open dashboard.

| Part | Where | State |
|---|---|---|
| Public landing page | `apps/web/app/(site)` → https://recycle-iq-monorepo-web.vercel.app | Greek first, English with `?lang=en` |
| Municipal dashboard (Next.js 16) | `apps/web` → https://recycle-iq-monorepo-web.vercel.app/city | Live on Vercel, Neon Postgres |
| Citizen app (Expo SDK 58) | `apps/mobile` | Android APK at `/download`; iPhone via Safari at `/app`; iOS App Store build done, not yet in TestFlight |
| Database (Drizzle) | `packages/db` | Migrations 0000–0006; Vercel build runs migrate + seed |
| Decision engine | `packages/engine` | Shared by app, API, assistant |
| Delta Sort (sorting robots) | separate repo `Mike17K/recycleiq-delta-sort` | Simulation only; fleet + sorting pages port its ops |

Branch: **`claude/blissful-mayer-3h8ims`** (Vercel deploys it to production). No PRs unless asked.

## Live URLs

- Landing page: https://recycle-iq-monorepo-web.vercel.app (English: `/?lang=en`)
- Dashboard: https://recycle-iq-monorepo-web.vercel.app/city (open, no login; old `/?range=…` links redirect there)
- Citizen app in Safari (iPhone): https://recycle-iq-monorepo-web.vercel.app/app
- Android APK: https://recycle-iq-monorepo-web.vercel.app/download (link set in `apps/web/lib/release.ts`)
- Resident survey (Typeform-style): https://recycle-iq-monorepo-web.vercel.app/feedback?src=linkedin
- Survey results: https://recycle-iq-monorepo-web.vercel.app/survey
- MCP connector for municipal AIs: https://recycle-iq-monorepo-web.vercel.app/api/mcp (demo login code `test123`, see `docs/MCP.md`)
- Expo project: https://expo.dev/accounts/stellarfirm-ai/projects/recycleiq

## Run it locally

```bash
pnpm install
cp .env.example .env          # fill DATABASE_URL (Neon) or use docker compose Postgres
pnpm --filter @recycleiq/db migrate && pnpm --filter @recycleiq/db seed
pnpm --filter web dev         # http://localhost:3000 (landing), /city (dashboard)
pnpm --filter mobile start    # Expo
```

Checks before pushing: `pnpm typecheck`, `pnpm --filter web lint`. (`expo lint` crashes on a global ESLint version
mismatch; use `tsc` for the mobile app.)

## Features built (and where)

- **AI assistant** "Ρώτα το RecycleIQ": Vercel AI SDK + AI Gateway, open models (`ASSISTANT_MODEL`, default
  `openai/gpt-oss-120b`), 20 tools on real data, charts, actions need approval. `apps/web/lib/assistant/*`,
  `apps/web/app/api/v1/assistant`, `docs/ASSISTANT.md`.
- **Voice questions** (mic button, always Greek `el-GR`, on-device/browser recognizer, no audio sent):
  web `apps/web/components/assistant/use-dictation.ts`, app `apps/mobile/src/lib/dictation.ts` (expo-speech-recognition).
- **MCP server** with every assistant tool + demo OAuth (code `test123`): `apps/web/app/api/mcp`, `apps/web/lib/mcp/*`,
  `apps/web/app/api/oauth/*`, `apps/web/app/oauth/authorize`, `apps/web/app/.well-known/*`, `docs/MCP.md`.
- **Fleet / sorting** (simulation, ported from delta-sort): `/fleet`, `/sorting`, `docs/OPS.md`.
- **Full-bin reports and bulky pickups**, mirrored to the city's AthensGov sandbox: `docs/ATHENSGOV.md`.
- **Real bins** from OpenStreetMap (1,167) behind a «Συνθετικά | Πραγματικά» switch: `docs/GEODATA.md`.
- **On-device recognition** with SigLIP 2 (native app only; patched onnxruntime-react-native, local iOS pod):
  `docs/VISION.md`, `patches/`, `apps/mobile/vendor/onnxruntime-c`, `apps/mobile/plugins/`.
- **Resident survey** (Typeform-style, anonymous, optional pilot email kept off the dashboard):
  definition `apps/web/lib/survey.ts`, form `apps/web/components/survey-form.tsx`, page `apps/web/app/feedback`,
  API `apps/web/app/api/v1/survey`, results `apps/web/app/(dashboard)/survey`, table `survey_responses` (migration 0006).
  Keep the `/feedback` URL and question ids stable: the link is already shared on LinkedIn. Bump `SURVEY_VERSION` when questions change.

## Survey: first results (7 answers, all from LinkedIn)

- Biggest barrier: «Δεν ξέρω τι πάει πού» 4/7. Confidence on the right bin: 3.3/5.
- Accessibility wish #1: «Πολύ απλά ελληνικά, με εικόνες» 6/7; then voice 3/7, QR on the bin without an app 3/7.
- Rewards (avg /5): trees planted by the city 4.7, new bin / neighbourhood improvement 4.7, municipal fee discount 4.4,
  free public-transport tickets 4.3 … neighbourhood stories lowest at 2.7. Nobody wants a purely personal reward.
- Likely to try RecycleIQ: 4.4/5. Trust theme: people want to know where recycling actually goes.
- Too few answers to change the product yet; aim for ~30.

## Open items

1. **TestFlight**: iOS build `a8390098-16cb-4844-b5b4-a78329c099f5` is done. On the Mac with Athanasios's Apple ID:
   `cd apps/mobile && npx eas-cli@latest submit -p ios --id a8390098-16cb-4844-b5b4-a78329c099f5`, then
   App Store Connect → TestFlight → External testing → Public link (first build needs Apple beta review).
2. **Survey follow-up**: when ~30 answers are in, summarise from `/survey`, then update the deck and business plan.
   Likely product changes if the trend holds: collective neighbourhood rewards (trees / new bin), simple Greek with
   pictures on results, a "where your recycling goes" screen, stories as a bonus only.
3. **Real-device test** of camera recognition (SigLIP) and the mic in the native apps (only emulators/simulated so far).
4. **Production hardening**: set `MCP_TOKEN_SECRET` and a real login for the MCP connector; `ATHENS_API_KEY` on Vercel
   if not set; the dashboard is open by design for the demo.
5. Mirror the code to `Apps4Athens-3-0/T19-StellarFirm` (the cloud session had no access; push it from the PC:
   `git remote add upstream https://github.com/Apps4Athens-3-0/T19-StellarFirm.git && git push upstream claude/blissful-mayer-3h8ims:main`).

## Secrets (values are never in the repo)

`.env` locally (from `.env.example`), Vercel project env (`recycle-iq-monorepo-web`, team Astro Code), Expo/EAS for
builds. Names: `DATABASE_URL`, `AI_GATEWAY_API_KEY` (or Vercel OIDC), `ATHENS_API_KEY`, `MCP_LOGIN_CODE`,
`MCP_TOKEN_SECRET`, `EXPO_TOKEN`. Never commit `.env` or `.claude/`.

## Presentation and documents (claude.ai artifacts, private to the owner)

- Deck (10 slides, Greek): https://claude.ai/artifact/FFQmswcsW1pV6UTmEpyANd
- 3-minute two-speaker pitch script: https://claude.ai/artifact/E8HJt4q7erpSBGbx919c3G

## House rules

- Greek UI copy, short and plain; claims must be true (data is synthetic, fleet and Delta Sort are simulations: say so).
- GDPR: neighbourhood only, never coordinates or addresses stored; the survey is anonymous.
- No model names in commits or code.

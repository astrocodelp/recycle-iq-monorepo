# Assistant: "Ρώτα το RecycleIQ"

An agentic chat helper in the app (residents) and on the dashboard (municipal staff). It runs on
**open-weight models** through the **Vercel AI Gateway**, built with the **Vercel AI SDK** (`ai`,
`@ai-sdk/react`). Every figure, bin and rule it gives comes from a tool that calls RecycleIQ's own
queries: the same code that draws the dashboard. Answers come with charts.

## Where

| Surface | Mode | Entry |
| --- | --- | --- |
| Mobile app | `citizen` | Home → **Ρώτα το RecycleIQ** (`apps/mobile/src/app/assistant.tsx`) |
| Dashboard | `municipal` | **Βοηθός** button, bottom right of every page (`apps/web/components/assistant-panel.tsx`) |

Server: `POST /api/v1/assistant` (streams a UI message stream), `GET /api/v1/assistant/models`.
Code: `apps/web/lib/assistant/{config,prompt,tools}.ts`. The chart contract shared by both clients is
`packages/engine/src/assistant.ts`.

## Tools

Read and analytics (both modes). Each returns data plus a `chart` hint (`bar`, `line`, `kpis`, `table`,
`map-list`) that the clients draw with their own components (dashboard: `BarList`, `TrendChart`, `Kpi`;
app: react-native-svg).

| Tool | What it does |
| --- | --- |
| `findItems` | Catalogue search (Greek/English) |
| `whereDoesItGo` | The decision engine with the neighbourhood's municipal rules (asks the item's question first), nearest suitable bins, CO₂e |
| `listNeighbourhoods` | The 38 neighbourhoods and their brown-bin coverage |
| `nearestBins` | Nearest bins to a neighbourhood centre, optionally per category (respects the Synthetic / Real bin setting) |
| `kpis` | Scans, change vs previous period, active users, confidence, clarifications, brown-bin requests |
| `scansPerDay` | Daily scans (line chart) |
| `categoryMix` | Where scanned items go |
| `topItems` | Most scanned items, with clarification rate |
| `neighbourhoodRanking` | Neighbourhoods by scans, brown-bin requests, bins or confidence |
| `binsByKind` | Bins per type and how many have problems |
| `environmentImpact` | Estimated kg CO₂e avoided and car-km equivalent (UK DESNZ 2025 factors) |
| `openAlerts` | Open full-bin reports with city request status |
| `bulkyPickups` | Bulky pickups filed with the city |
| `neighbourhoodStories` | Stories a neighbourhood unlocks, and the user's scans there |
| `leaderboard` | Week / month ranking (nicknames only) and busiest neighbourhoods |
| `listRules` | Municipal rules and whether each is on |
| `cityRequestStatus` | Live status of a request RecycleIQ filed with AthensGov |

Actions need the user's **approval** in the chat (AI SDK tool approvals; the clients show
Approve / Deny before anything runs):

| Mode | Tool | Same as |
| --- | --- | --- |
| citizen | `reportFullBin` | The app's full-bin report (also filed with AthensGov) |
| citizen | `requestBulkyPickup` | The app's bulky pickup (address goes to the city only) |
| municipal | `acknowledgeAlerts` | Alerts page → Take on (mirrored to the city request) |
| municipal | `resolveAlerts` | Alerts page → Resolved |
| municipal | `setRuleEnabled` | Rules page toggle (logged as `assistant`) |

The shared logic lives in `apps/web/lib/{reports,bulky,alerts,rules,leaderboard}.ts`, used by both the
API routes / dashboard actions and the assistant, so behaviour cannot drift.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `ASSISTANT_MODEL` | `openai/gpt-oss-120b` | Default model |
| `ASSISTANT_MODELS` | gpt-oss-120b, gpt-oss-20b, qwen-3-32b, llama-4-scout, qwen3-next-80b-a3b-instruct | Allowlist a client may pick from (dashboard dropdown, app Settings → Μοντέλο βοηθού) |
| `AI_GATEWAY_API_KEY` | – | Needed off Vercel. On Vercel, enable AI Gateway on the team: the deployment authenticates with OIDC |
| `ASSISTANT_APPROVAL_SECRET` | – | Recommended in production: HMAC-signs approval requests so a client cannot forge an approval |

All defaults are open-weight models. Costs are per token on the Gateway (gpt-oss-120b: about
$0.10 / $0.50 per million input / output tokens). A typical answer with two tool calls uses a few
thousand tokens.

Local development with this repo: put `AI_GATEWAY_API_KEY` in the root `.env`. In a sandbox where an
egress proxy injects the key, run the web server with `NODE_USE_ENV_PROXY=1` (Node's `fetch` ignores
`HTTPS_PROXY` otherwise).

## Privacy and honesty

- Only a neighbourhood id is sent, never coordinates. The assistant never asks for a location or home
  address, except the pickup address for a bulky item, which goes to the city and is not stored.
- Activity data (scans, reports) is synthetic demo data; bins follow the Synthetic / Real setting. The
  system prompt makes the model say so and forbids numbers that did not come from a tool.
- The resident's device id is used only for "my rank" and "my scans"; other people appear by nickname.
- Rules and actions are enforced on the server: residents' chats have no municipal tools at all.

## Limits (so the open models are not overused)

- **Open-weight models only.** `ASSISTANT_MODELS` / `ASSISTANT_MODEL` entries that are not open-weight
  (gpt-oss, Qwen, Llama, Gemma, Mistral, DeepSeek, Kimi, GLM, Nemotron, Granite, Phi) are ignored.
- **Questions, not tokens, are counted.** A question is a new user message; tool steps and approvals are free.
- **Defaults** (env, see `.env.example`): residents 10 per hour and 30 per day per app install, 100 per day
  per IP; municipal staff 200 per day per IP; 3,000 per day for everyone. At ~$0.001 a question on
  gpt-oss-120b that caps the worst day at about $3.
- **Per request:** a question is at most 1,000 characters, the last 24 messages are kept, at most 6 model
  steps and 1,000 output tokens.
- The answer carries `X-Assistant-Remaining` / `X-Assistant-Limit`; over the limit the API answers 429 with a
  Greek or English message and `Retry-After`. Counters: table `assistant_quota` (migration 0008), pruned after 3 days.
- **Account cap:** also set a monthly budget on the Vercel AI Gateway (team settings → AI Gateway → Budgets),
  so spend stops at a fixed amount whatever happens in the app.

# MCP connector: RecycleIQ in the municipality's own AI

RecycleIQ runs a **remote MCP server** so a municipality can plug RecycleIQ into the AI its staff already
use: Claude (custom connector), ChatGPT (connector), Claude Code, Cursor, the MCP Inspector, or any client
that speaks the [Model Context Protocol](https://modelcontextprotocol.io).

The connector exposes **the same tools as the dashboard assistant** in municipal mode
([ASSISTANT.md](ASSISTANT.md)), on the same code and queries. Whatever the dashboard shows, the AI can read,
and the dashboard's actions are tools too.

| | |
|---|---|
| **URL** | `https://recycleiq.eu/api/mcp` |
| **Transport** | Streamable HTTP (stateless, JSON responses) |
| **Login** | OAuth 2.1 with PKCE and dynamic client registration. **Demo: login code `test123`** |
| **Options** | `?lang=en` for English answers (default Greek) · `?bins=osm` for the real OpenStreetMap bins (default synthetic) |

> **Demo login.** The login is a mock: one shared code (`test123`, env `MCP_LOGIN_CODE`) stands in for the
> municipality's sign-in. Before real use, replace it with the municipality's identity provider (Entra ID,
> Google Workspace, gov.gr) and set `MCP_TOKEN_SECRET`. Dashboard data is synthetic in this demo.

## Connect

### Claude (claude.ai, Desktop): custom connector
1. **Settings → Connectors → Add custom connector.**
2. Name `RecycleIQ`, URL `https://recycleiq.eu/api/mcp`. Leave the OAuth client fields empty.
3. **Connect**. The RecycleIQ login page opens; enter `test123`.
4. In a chat, enable RecycleIQ under the tools menu and ask, e.g. *«Ποιες 5 γειτονιές είχαν τις περισσότερες σαρώσεις τον τελευταίο μήνα; Κάνε διάγραμμα.»*

On Team and Enterprise plans an owner adds the connector once for the organisation.

### ChatGPT
Settings → Apps & Connectors → (Developer mode) → **Create**: MCP server URL as above, authentication **OAuth**.
Sign in with `test123`.

### Claude Code
```bash
claude mcp add --transport http recycleiq https://recycleiq.eu/api/mcp
```
Then run `/mcp`, pick `recycleiq` and **Authenticate** (browser login, `test123`). Clients that only take a
header can skip OAuth with `--header "Authorization: Bearer test123"`.

### MCP Inspector (testing)
```bash
npx @modelcontextprotocol/inspector
```
Transport *Streamable HTTP*, the URL above, then *Open Auth Settings → Quick OAuth Flow*.

## Tools

Read (no changes to data):

| Tool | What it answers |
|---|---|
| `findItems`, `whereDoesItGo` | Which bin, why, with the municipality's rules for a neighbourhood |
| `listNeighbourhoods`, `nearestBins`, `binsByKind` | The 38 neighbourhoods, bins and collection points |
| `kpis`, `scansPerDay`, `categoryMix`, `topItems`, `neighbourhoodRanking`, `environmentImpact` | Analytics for 7, 30 or 90 days, city-wide or per neighbourhood |
| `openAlerts`, `bulkyPickups`, `cityRequestStatus` | Citizen reports of full or damaged bins, bulky pickups, the city request status (AthensGov) |
| `neighbourhoodStories`, `leaderboard`, `listRules` | Rewards content, scanning leaderboard, municipal rules |

Actions (change real data, so the AI client asks the user to confirm; annotated `readOnlyHint: false`):

| Tool | Does |
|---|---|
| `acknowledgeAlerts` | Take on a bin's reports (crew on it), mirrored to the city request |
| `resolveAlerts` | Bin emptied or repaired: closes its reports and the city request |
| `setRuleEnabled` | Switch a municipal rule on or off (logged) |

Many results carry a `chart` object (`bar`, `line`, `donut`, …) the client can draw.

## How the login works

```
AI client ──POST /api/mcp──▶ 401 + WWW-Authenticate: resource_metadata=…/.well-known/oauth-protected-resource/api/mcp
          ──GET  /.well-known/oauth-authorization-server
          ──POST /api/oauth/register            (dynamic client registration)
          ──open /oauth/authorize?…&code_challenge=…   ← staff member enters the login code
          ◀──    redirect_uri?code=…&state=…
          ──POST /api/oauth/token  (code + code_verifier)  ▶ access token (24 h) + refresh token (30 d)
          ──POST /api/mcp  Authorization: Bearer …
```

Codes and tokens are HMAC-signed and stateless (`apps/web/lib/mcp/auth.ts`), so nothing is stored and it runs
on serverless. Redirect URIs must be https (or loopback for desktop clients).

| Env | Default | |
|---|---|---|
| `MCP_LOGIN_CODE` | `test123` | The demo login code |
| `MCP_TOKEN_SECRET` | demo value | **Set in production.** Changing it signs everyone out |

## Code

- `apps/web/app/api/mcp/route.ts`: the endpoint (`WebStandardStreamableHTTPServerTransport`)
- `apps/web/lib/mcp/server.ts`: registers every assistant tool on an `McpServer`
- `apps/web/lib/mcp/auth.ts`, `apps/web/app/api/oauth/*`, `apps/web/app/oauth/authorize`, `apps/web/app/.well-known/*`: the demo login

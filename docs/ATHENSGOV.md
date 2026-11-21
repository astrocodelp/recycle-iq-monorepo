# AthensGov citizen requests

RecycleIQ files two kinds of report in the city's own request system (AthensGov API, *Αιτήματα πολιτών*),
so crews see them where they already work:

| In RecycleIQ | AthensGov request | What is sent |
| --- | --- | --- |
| Full / overflowing / damaged bin report | `garbage` (Σκουπίδια / κάδοι) | The bin: name, street, coordinates, municipal community 1–7. Never the resident. A second report on a bin that already has an open city request **upvotes** it instead of opening a duplicate. |
| "Ζήτα παραλαβή από τον Δήμο" on a bulky result (e.g. sofa) | `bulky_waste` (Ογκώδη αντικείμενα) | The item, the pickup address and an optional note the resident types, and the community. RecycleIQ stores only the neighbourhood, the city request id and its status — not the address. |

Two-way status: the dashboard's **Take on** and **Resolved** buttons set the city request to `in_progress` and
`resolved` (with a note in its history). The alerts page refreshes the city status of open requests on load
(at most 25 per load, each at most once a minute, well under the 100 requests/min limit), and shows bulky pickups.

## Configuration (server only)

```
ATHENS_API_KEY=...        # the key never ships in the app
ATHENS_API_BASE=https://athensgov.cityofathens.gr/sandbox   # default
```

Without `ATHENS_API_KEY` RecycleIQ runs as before: reports stay in RecycleIQ and the bulky button answers
that the connection is not active. A failing city API never fails a RecycleIQ report.

On Vercel: Project → Settings → Environment Variables → add `ATHENS_API_KEY` for Production and Preview,
then redeploy.

The sandbox data is fictional (except its services registry). District numbers are the 7 municipal
communities: RecycleIQ's `k1`…`k7`.

Endpoints: `POST /api/v1/bin-reports` (returns `city`), `POST /api/v1/bulky-requests`,
`GET /api/v1/city-requests/{id}` (live status, only for requests RecycleIQ filed).

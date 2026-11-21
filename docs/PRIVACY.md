# Privacy by design

RecycleIQ answers "where does this go?" without knowing who you are or where you live.

| Data | What we do | Why |
| --- | --- | --- |
| Location | GPS is turned into a **neighbourhood on the phone** (`packages/engine/src/geo.ts`). Only the district id is sent. The API rejects coordinates. | Municipal statistics need the neighbourhood, never the address (GDPR data minimisation, Art. 5(1)(c)). |
| Bin QR codes | Scanning a bin's QR sticker gives the neighbourhood with **no location permission at all**. | The easiest path is also the most private. |
| Photos | **Scan photo:** shrunk to 640 px and sent once to `POST /api/v1/recognize`, which asks a vision model on the Vercel AI Gateway (`VISION_MODEL`, default Google Gemini) and answers with the item. The photo is not stored or logged by RecycleIQ. Without network, the on-device model is used and the photo stays on the phone. **Full-bin photo:** checked on the phone, never uploaded; a report sends only the bin, the problem and the time. | Good recognition needs a strong model; we keep nothing. The app says so on the scan screen. |
| Leaderboard | Shows a nickname (automatic, or chosen by the resident) and a scan count. Never an install id. | Motivation without identity. |
| Identity | A random install id (`deviceId`), no account, no name, no email. | The leaderboard and the report limits work without personal data. |
| History | Stored only on the phone. | |
| Decisions | Object, answers, category, confidence, neighbourhood, time. | This is the dashboard's data. |

Before going live: publish a privacy notice in Greek, have the DPO review it, set retention for
`decisions` and `bin_reports` (for example 24 months, then aggregate), and treat the install id as
pseudonymous data.

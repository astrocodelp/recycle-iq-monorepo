# Adopt RecycleIQ for your municipality

RecycleIQ is Apache-2.0. Everything that is specific to Athens is data, not code.

| Replace | File | Format |
| --- | --- | --- |
| Neighbourhood outlines and brown-bin coverage | `packages/db/seed/districts.json` | `id`, names (el/en), `organic` (`full`/`partial`/`none`), outline `path`, `lnglat` centre |
| Collection points (bins, bells, battery/WEEE points, green points) | `packages/db/seed/points.json` | id, kind, lng/lat, accepted materials, status |
| Municipal rules | `packages/engine/src/data/rules.json` | code, title/text (el/en), enabled, source |
| Items and clarifying questions | `packages/engine/src/data/objects.json` + `packages/engine/src/evaluators.ts` | one evaluator per item |
| Brand | `packages/tokens/tokens.json` then `pnpm tokens` | design tokens |

The outlines use a simple linear projection of longitude/latitude (`packages/engine/src/geo.ts`); change
its constants to your city's bounding box. A GeoJSON importer that writes this format is on the roadmap.

Steps:
1. Fork the repository and replace the files above.
2. Run `pnpm --filter @recycleiq/engine test`: the geo tests check that every centre falls in its own outline.
3. Deploy following [DEPLOYMENT.md](DEPLOYMENT.md), print bin QR stickers from `/points/qr`, and
   publish the app under your municipality's name.

Please contribute improvements upstream so every city benefits.

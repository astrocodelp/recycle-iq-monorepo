# Finding the bins: geodata plan

Today the 220 collection points are **mock**. To go live we need the real location of every bin.

| Source | What it gives | Licence / terms | Use |
| --- | --- | --- | --- |
| Municipality's own registry (cleansing department) | Authoritative bin list | Municipal | **First choice**; import into `collection_points` with `source = 'municipal'`. |
| OpenStreetMap (`amenity=recycling`, `amenity=waste_disposal`) | Recycling points mapped by volunteers; Athens has a few hundred, incomplete | ODbL (attribution, share-alike) | Bootstrap and gap-check. |
| Mapillary street-level imagery and object detections | Detected bins along streets | CC BY-SA | Find unmapped bins; verify OSM. |
| Residents via the app | Bin QR scans and "report a bin" confirm that a bin exists and is working | Our own data | Keeps data fresh (rule ATH-LOC-01: prefer points verified in the last 30 days). |
| Google Street View | Street-level imagery | Google Maps Platform terms **restrict** automated analysis and building datasets from it | Only with a licence agreement with Google. |
| NASA / ESA satellite imagery (Landsat, Sentinel-2) | 10–30 m pixels: too coarse to see a bin | Open | Not for bins; useful context only (land use, density). |

Pipeline (planned, open source):
1. Import the municipal registry and OSM into a staging table.
2. Match and de-duplicate within about 15 m.
3. Use Mapillary detections to propose missing bins; a municipal operator approves them in the dashboard.
4. Every approved bin gets a QR sticker (`/points/qr`); resident scans keep it verified.

The importer will live in `packages/geo` and produce the same `points.json` format, so any city can run it.

## Real bins from OpenStreetMap (in use)

The dashboard has a **Bin data** switch in the sidebar: *Synthetic* (default) or *OpenStreetMap*. The
OpenStreetMap set comes from an export of `amenity=recycling`, `waste_disposal` and `waste_basket` points
in Athens, converted with:

```bash
pnpm --filter @recycleiq/db import:osm path/to/bins.geojson   # writes packages/db/seed/osm-bins.json
pnpm db:seed                                                    # or any deploy: OSM bins sync every time
```

The importer keeps only points inside the 38 Athens districts (1,167 of 1,943 in the current export) and
maps OSM tags to RecycleIQ kinds: clothes/shoes → clothing bin, batteries → battery point, appliances → WEEE
point, food/green waste → brown bin, glass only → glass bell, recycling centre → green point, other
recycling containers → blue bin, `waste_disposal` → mixed-waste bin, `waste_basket` → litter bin.
Re-syncing never overwrites a bin's status, so full-bin reports survive. Scans, reports and other activity
are demo data in both modes. Attribution: © OpenStreetMap contributors, ODbL.

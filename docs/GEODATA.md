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

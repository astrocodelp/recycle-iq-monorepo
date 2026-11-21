# Photo recognition

The scan screen (`apps/mobile/src/app/scan.tsx`) recognises the photographed item and re-orders the pick
tray with the most likely item first ("Μοιάζει με …"). The resident always confirms with one tap; the model
suggests, it never decides alone.

0. **On the phone, when it is very sure.** If the SigLIP 2 model is already on the phone (it downloads in the
   background on Wi-Fi after a scan) and its top item scores ≥ 0.03 and ≥ 4× the runner-up, the phone answers
   alone: 98% right on 150 held-out TrashNet photos, about a third of scans (`src/lib/vision-gate.ts`).
   Never for a pizza box: the phone model cannot judge grease (3/8 greasy boxes, see below).
1. **Server (default).** The photo is shrunk to 640 px and sent once to `POST /api/v1/recognize`
   (`apps/web/lib/recognize.ts`), which asks a vision model on the Vercel AI Gateway and answers
   `{ item, confidence, seen }`, `item` being a catalogue id or `other` (with `seen`, a few Greek words, so
   the screen can say what it saw). The photo is not stored or logged. Model: `VISION_MODEL`, default
   `google/gemini-3.5-flash-lite` (the newest Flash-Lite; benchmark on 3,170 photos in [BENCHMARK.md](BENCHMARK.md)). Client: `apps/mobile/src/lib/cloud-vision.ts`.
2. **On the phone (no network).** SigLIP 2 below. Only in the native apps.
3. **Neither.** The normal pick list.

On the web (`/app`) the shutter opens the browser's own picker (`src/lib/pick-photo.ts`): the camera on a
phone, the file chooser on a laptop.

## Measured, server

TrashNet photos (not Athens bins), 6 per class, the same prompt as the route:

| Model | Right (plastic, glass, metal, paper, cardboard) | Avg time |
| --- | --- | --- |
| google/gemini-3.1-flash-lite (older) | 30/30 | 1.7 s |
| google/gemini-3.5-flash-lite (default since 22/11/2026) | 29/30 | 1.9 s |
| google/gemini-2.5-flash-lite | 28/30 | 1.5 s |
| google/gemini-3.8-flash | 29/30 | 4.3 s |
| SigLIP 2 on the phone (app scoring, plastic + glass only) | 9/16 | ~0.1 s on a Mac |

Used napkins and tissues answer `other`, not paper, because they go to general waste.

Re-run on 50 photos (10 per class): gemini-3.1-flash-lite 48/50 (1.4 s), Google `gemini-decision-1` through
`experimental_decide` 47/50 (0.9 s, with real probabilities). Every miss was paper read as cardboard: same bin.

## Condition: grease and liquid (and clothes)

40 photos made with an image model (8 each: greasy pizza box, clean pizza box, can with drink in it, empty
can, clothes). They are synthetic and clearer than real life, so read them as a sanity check, not accuracy.

| Model | Item | Greasy box | Liquid in can | Avg time |
| --- | --- | --- | --- | --- |
| google/gemini-3.1-flash-lite (the default then) | 40/40 | 16/16 | 16/16 | 1.6 s |
| google/gemini-decision-1 (decision model) | 40/40 | 16/16 | 16/16 | 0.9 s |
| meta/llama-4-scout (open weights) | 40/40 | 16/16 | 16/16 | 2.2 s |
| alibaba/qwen3-vl-instruct (open weights) | 40/40 | 16/16 | 16/16 | 4.6 s |
| SigLIP 2 on the phone (zero-shot prompts) | 36/40 | 11/16 (3/8 greasy) | 16/16 | ~0.1 s |

The decision model's probabilities separate cleanly (greasy boxes 0.90–0.96, clean 0.07–0.16), so it is a
good second server option if its experimental API settles. The server answers `greasy` and `liquid`; the
scan screen says «Φαίνεται λερωμένο» / «Έχει ακόμα υγρό» and pre-selects the photo's answer on the item
page (the resident still taps). Total model spend for all of this benchmarking: under $2.

# On-device recognition with SigLIP 2 (offline fallback)

**Model:** `google/siglip2-base-patch16-224` (Apache-2.0, not gated: no access request or token needed), via
the ONNX export `onnx-community/siglip2-base-patch16-224-ONNX`.

## What runs where

| Part | Where | File |
| --- | --- | --- |
| Vision encoder | Phone, downloaded once on the first scan (not in the app bundle) | `onnx/vision_model_quantized.onnx`, 94.5 MB |
| Text side (one embedding per label) | Precomputed at build time, shipped in the app | `apps/mobile/assets/ml/siglip2-labels.json`, 90 KB |
| Scoring | Phone | `apps/mobile/src/lib/vision.native.ts` |

**Use `vision_model_quantized.onnx` (or the identical `vision_model_uint8.onnx`), not `vision_model_int8.onnx`.**
The int8 file uses `ConvInteger` with int8 weights, which onnxruntime's CPU execution provider does not
implement (`Could not find an implementation for ConvInteger(10)`), so it fails to load on servers and phones.
The quantized file loads and runs in about 60 ms per image on a server CPU; phones are slower.

## Pipeline on the phone

1. First scan: `File.downloadFileAsync` (expo-file-system) fetches the model into the document directory
   with progress; the resident can cancel and pick from the list. Later scans reuse the file.
2. `onnxruntime-react-native` (config plugin in `app.json`) opens a session. This needs a native build
   (development, preview or production). Expo Go and web have no model: the normal tray is shown.
3. The photo is resized to 224×224 with `expo-image-manipulator` (no crop), decoded with `jpeg-js`, and
   normalised to `(x / 255 − 0.5) / 0.5` in CHW order (SigLIP's mean and std of 0.5).
4. The encoder's `pooler_output` is L2-normalised and compared with each label embedding:
   `p = sigmoid(scale × cos + bias)` with the calibrated `scale = 112.67`, `bias = −16.77`.
5. Catalogue labels are ranked. Seven non-catalogue labels (can, paper, cardboard box, person, street, room,
   hand) let the model say "none of these": if one of them wins, or the first item does not clearly lead
   (p ≥ 0.002 and 1.5× the second), the screen says "Δεν είμαι σίγουρος — διάλεξε".

## Measured (TrashNet photos, CPU, the same preprocessing)

- Preprocessing parity with transformers.js' own SigLIP processor: cosine 0.99.
- 40 photos across plastic, glass, cardboard, paper, metal and other waste: the right kind of item is the top
  label in 29 and in the top three in 38.
- With the app's exact scoring on plastic and glass photos (`check-app-scoring.mjs`, re-run 21 Nov 2026 with
  the shipped label file): the right item comes first in 9 of 16 (an earlier run noted 12). Plastic bottles
  were sometimes read as batteries and most glass bottles as plastic. This is why the server model is the
  default and SigLIP only the offline fallback. With `can`, `paper` and `cardboard-box` turned into catalogue
  labels (they were "other" before): 26 of 40 across plastic, glass, cardboard, metal and paper.
- SigLIP's absolute probabilities are small (typically under 20 %); use the ranking, not a fixed percentage.

These photos are not Athens bins. Measure on real photos from the pilot before relying on the suggestion.

## Rebuilding the labels

`apps/mobile/scripts/siglip-labels/` holds the reproducible build:

- `labels.json`: the label ids, whether each is a catalogue object, and 1–3 English prompts per label
  ("a photo of a greasy pizza box"). English prompts work best with this model.
- `bench.mjs`: embeds the prompts with the SigLIP 2 text encoder (transformers.js), averages them per label,
  fits the sigmoid scale and bias against the full model, scores TrashNet photos, and writes
  `label-embeddings.json` (round to 5 decimals and copy to `assets/ml/siglip2-labels.json`, adding `url`
  and `bytes` of the vision model).
- `check-app-scoring.mjs`: runs the app's scoring math on photos to confirm a new label file.

When an item is added to the catalogue, add its prompts to `labels.json`, rebuild, and ship the new JSON. The
vision model on phones does not change.

## Same model on the sorting line

RecycleIQ Delta Sort (the robotic sorting line at the recycling centre, [Mike17K/recycleiq-delta-sort](https://github.com/Mike17K/recycleiq-delta-sort)) uses the same SigLIP 2 model for its vision cell. One model and one label set serve both: the phone tells residents which bin an item goes in, and the line recognises the same materials on the conveyor. Labels improved for one improve the other.

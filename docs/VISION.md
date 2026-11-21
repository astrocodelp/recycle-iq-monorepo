# On-device recognition with SigLIP 2

The scan screen (`apps/mobile/src/app/scan.tsx`) recognises the photographed item **on the phone** and
re-orders the pick tray with the most likely item first ("Μοιάζει με …"). The resident always confirms with
one tap; the model suggests, it never decides alone. The photo never leaves the phone.

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
- With the app's exact scoring on plastic and glass photos: the right item comes first in 12 of 16. Two
  were confidently wrong (a plastic bottle read as a battery, a glass bottle read as plastic), which is why
  the resident confirms. Cardboard and metal correctly come out as "not sure" because they are not in the
  catalogue.
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

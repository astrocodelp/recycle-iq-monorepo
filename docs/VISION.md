# On-device recognition with SigLIP 2

The scan screen (`apps/mobile/src/app/scan.tsx`) has a `recognize()` hook. Until it is wired in, the
resident confirms the item from a tray, and the photo never leaves the phone.

**Model:** `google/siglip2-base-patch16-224` (Apache-2.0, not gated: no access request or token needed).
Use the ONNX export `onnx-community/siglip2-base-patch16-224-ONNX`.

**Only the vision encoder ships to the phone.** SigLIP is zero-shot: it compares an image embedding with
text embeddings. The multilingual text encoder is large (283 MB even at int8), so the text embeddings
for each catalog label ("a photo of a greasy pizza box", ...) are computed once on the server and served
as a small JSON file next to `/api/v1/catalog`. New items need no app update.

| File | Size |
| --- | --- |
| `onnx/vision_model_int8.onnx` | 94.6 MB (recommended) |
| `onnx/vision_model_q4f16.onnx` | 54.6 MB (smaller; measure accuracy first) |

Steps:
1. Download the model on first launch (not in the app bundle); mirror it to your own storage for production.
2. Run it with `onnxruntime-react-native`. This needs an Expo development build (`eas build --profile development`), not Expo Go.
3. Resize to 224×224 and normalise as in `preprocessor_config.json`, run the encoder, L2-normalise.
4. Score each label: sigmoid(scale × dot + bias), using the model's logit scale and bias.
5. Top candidates go to the engine's recognition step; low scores use the existing "not sure enough" path.

The same ONNX file and label JSON can later run on the RecycleIQ Sort machine.

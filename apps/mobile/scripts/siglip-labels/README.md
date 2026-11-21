# SigLIP 2 label embeddings

Builds `apps/mobile/assets/ml/siglip2-labels.json`, the precomputed text side of on-device recognition.
See `docs/VISION.md` for the full pipeline and measured accuracy.

```bash
mkdir -p /tmp/siglip && cp bench.mjs labels.json /tmp/siglip/ && cd /tmp/siglip
npm init -y && npm i --onnxruntime-node-install-cuda=skip @huggingface/transformers@3.7.5 onnxruntime-node@1.21.0 jpeg-js@0.4.4
mkdir -p models && curl -L -o models/vision_model_quantized.onnx \
  https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX/resolve/main/onnx/vision_model_quantized.onnx
# test photos in trashnet-data/<class>/*.jpg (e.g. from the TrashNet dataset, MIT licence)
node bench.mjs                    # writes label-embeddings.json and prints accuracy
node check-app-scoring.mjs ./label-embeddings.json .
```

Pin `onnxruntime-node` to the version `@huggingface/transformers` depends on, or the two native bindings clash.

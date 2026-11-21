# Vision benchmark

SigLIP 2 on the phone vs Gemma 4 vs Gemini 3.5 Flash-Lite, on the same 3,170 photos, scored by material and by
Athens bin. Results: [REPORT.md](REPORT.md) (generated) and the summary in [docs/BENCHMARK.md](../../docs/BENCHMARK.md).

## Data (not in the repo; download and unzip into one folder)

| Folder | Source | Licence | Used |
|---|---|---|---|
| `g12/` | [Garbage classification, 12 classes](https://huggingface.co/datasets/UdaraChamidu/Garbage-Classification-with-12-classes) (web photos) | as published | 200 per class (glass: 3 × 200, textile: clothes + shoes) |
| `trashnet/` | [TrashNet](https://huggingface.co/datasets/garythung/trashnet) `dataset-resized.zip` (studio photos) | MIT | 120 per class |
| `complex/` | [Garbage classification, complex scenes](https://huggingface.co/datasets/Qween0fPandora/Garbage_Classification_Original_Dataset) `complex_dataset.zip` | as published | all 50 |

`manifest.json` lists every photo used (seeded sample, fixed before any model ran). Images are not redistributed.

## Run

```bash
python3 prepare.py <data_dir> <cache_dir>          # sample + resize to ≤512 px once; all models see the same file
npm install                                         # onnxruntime-node, @huggingface/transformers, jpeg-js
node siglip.mjs <cache_dir> <vision_model_quantized.onnx>
AI_GATEWAY_API_KEY=… node llm.mjs google/gemini-3.5-flash-lite <cache_dir>
AI_GATEWAY_API_KEY=… node llm.mjs google/gemma-4-26b-a4b-it <cache_dir>
AI_GATEWAY_API_KEY=… node llm.mjs google/gemini-decision-1 <cache_dir>   # Decisions API, one choice question
python3 score.py                                    # writes results/summary.json and REPORT.md
```

`llm.mjs` resumes where it stopped and halts when the run spends more than `BUDGET_USD` (default 6).
The runs cost about $3 in total (Gemini 3.5 Flash-Lite $1.36, Gemini Decision $0.39, Gemma $0.17, plus a run of the older 3.1 Flash-Lite that was dropped).

## Method

- **Classes:** plastic, paper, cardboard, metal, glass, food, battery, textile, general. **Athens bins:** the
  first five → blue (commingled recycling), food → brown, battery → battery point, textile → clothing bank,
  general → general waste.
- **SigLIP 2:** the phone's model file (`vision_model_quantized.onnx`) and preprocessing, zero-shot against
  2–3 English prompts per class (`classes.json`), softmax over the 9 classes as confidence. Not tuned on these photos.
- **Gemma / Gemini:** the same prompt and JSON schema, temperature 0, Gemini with minimal reasoning, through
  the Vercel AI Gateway. Answers are read leniently and identically for every model (first word of `material`).
- **Severity** per item (Athens): right bin 0 · battery into any household bin 10 · wrong item into blue or
  brown 3 · into the clothing bank 1 · recyclable or food lost to general waste 1 · wasted trip 0.5 · no answer 1.
- **Cascade:** SigLIP answers when its confidence ≥ τ; otherwise the cloud model's answer is used.

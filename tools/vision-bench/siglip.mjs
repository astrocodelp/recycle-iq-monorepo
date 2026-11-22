// SigLIP 2 zero-shot material classification, the on-device model of the RecycleIQ app.
// Same file the phone downloads (onnx/vision_model_quantized.onnx), same preprocessing as
// apps/mobile/src/lib/vision.native.ts (bilinear resize to 224×224, (x/255 − 0.5)/0.5, CHW).
// Text side: one averaged embedding per class from classes.json prompts, fixed before any test image was seen.
// Usage: node siglip.mjs <cache_dir> <vision_model.onnx> [result_name]   (default siglip2-on-device; the app now uses vision_model_q4.onnx)
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { AutoTokenizer, env, SiglipTextModel } from '@huggingface/transformers';
import jpeg from 'jpeg-js';
import * as ort from 'onnxruntime-node';

const [cache, modelPath, NAME = 'siglip2-on-device'] = process.argv.slice(2);
env.cacheDir = process.env.HF_CACHE ?? './.hf-cache';
const MODEL = 'onnx-community/siglip2-base-patch16-224-ONNX';
const SCALE = 112.67; // calibrated against the full model (docs/VISION.md)
const BIAS = -16.77;

const { classes, siglipPrompts } = JSON.parse(readFileSync('./classes.json', 'utf8'));
const { items } = JSON.parse(readFileSync('./manifest.json', 'utf8'));
const out = `./results/${NAME}.jsonl`;
const done = new Set(existsSync(out) ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []);

const norm = (v) => {
  let s = 0;
  for (const x of v) s += x * x;
  s = Math.sqrt(s);
  return Array.from(v, (x) => x / s);
};
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function preprocess(rgba, w, h, size = 224) {
  const o = new Float32Array(3 * size * size);
  const sx = w / size;
  const sy = h / size;
  for (let y = 0; y < size; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(h - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < size; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(w - 1, x0 + 1);
      const wx = fx - x0;
      for (let c = 0; c < 3; c++) {
        const p = (yy, xx) => rgba[(yy * w + xx) * 4 + c];
        const v = (p(y0, x0) * (1 - wx) + p(y0, x1) * wx) * (1 - wy) + (p(y1, x0) * (1 - wx) + p(y1, x1) * wx) * wy;
        o[c * size * size + y * size + x] = (v / 255 - 0.5) / 0.5;
      }
    }
  }
  return o;
}

// Text embeddings, one per class (mean of its prompts).
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const textModel = await SiglipTextModel.from_pretrained(MODEL, { dtype: 'q8' });
const classEmb = [];
for (const c of classes) {
  const inputs = tokenizer(siglipPrompts[c], { padding: 'max_length', truncation: true, max_length: 64 });
  const { pooler_output } = await textModel(inputs);
  const dim = pooler_output.dims[1];
  const acc = new Array(dim).fill(0);
  for (let i = 0; i < siglipPrompts[c].length; i++) norm(pooler_output.data.slice(i * dim, (i + 1) * dim)).forEach((v, k) => (acc[k] += v));
  classEmb.push(norm(acc));
}
if (NAME === 'siglip2-on-device') writeFileSync('./results/siglip2-class-embeddings.json', JSON.stringify({ model: MODEL, classes, scale: SCALE, bias: BIAS, e: classEmb.map((e) => e.map((x) => +x.toFixed(5))) }));

const vision = await ort.InferenceSession.create(modelPath, { intraOpNumThreads: 1 });
let n = 0;
for (const item of items) {
  if (done.has(item.id)) continue;
  const img = jpeg.decode(readFileSync(`${cache}/${item.id.split('/').join('__')}.jpg`), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  const t0 = performance.now();
  const x = preprocess(img.data, img.width, img.height);
  const res = await vision.run({ [vision.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, 224, 224]) });
  const pooled = res.pooler_output ?? res[vision.outputNames[vision.outputNames.length - 1]];
  const e = norm(pooled.data);
  const ms = performance.now() - t0;
  // Logits for each class; softmax across the 9 classes gives a confidence that sums to 1.
  const logits = classEmb.map((c) => SCALE * dot(e, c) + BIAS);
  const mx = Math.max(...logits);
  const ex = logits.map((l) => Math.exp(l - mx));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((v) => v / sum);
  const order = probs.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
  appendFileSync(
    out,
    JSON.stringify({ id: item.id, pred: classes[order[0][1]], confidence: +order[0][0].toFixed(4), second: classes[order[1][1]], margin: +(order[0][0] - order[1][0]).toFixed(4), ms: Math.round(ms * 10) / 10 }) + '\n',
  );
  if (++n % 200 === 0) console.log(`siglip: ${n}`);
}
console.log(`siglip: done ${n}`);

// Bench for on-device SigLIP 2 recognition.
// 1. Text side: embeds catalogue prompts with the SigLIP 2 text encoder (transformers.js), as the
//    build step will. 2. Image side: runs vision_model_quantized.onnx (the int8 file does not load: ConvInteger) with onnxruntime and the SAME
//    preprocessing the app uses (JPEG decode, bilinear resize to 224x224, (x/255-0.5)/0.5, CHW).
// 3. Derives the sigmoid logit scale/bias from the full model, and scores real TrashNet photos.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import * as ort from 'onnxruntime-node';
import jpeg from 'jpeg-js';
import { env, AutoTokenizer, SiglipTextModel, AutoProcessor, SiglipVisionModel, SiglipModel, RawImage } from '@huggingface/transformers';

env.cacheDir = './hf-cache';
const MODEL = 'onnx-community/siglip2-base-patch16-224-ONNX';

const LABELS = JSON.parse(readFileSync('./labels.json', 'utf8'));

// ---- preprocessing identical to the app --------------------------------------------------------
export function preprocess(rgba, w, h, size = 224) {
  const out = new Float32Array(3 * size * size);
  const sx = w / size, sy = h / size;
  for (let y = 0; y < size; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < size; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), wx = fx - x0;
      for (let c = 0; c < 3; c++) {
        const p = (yy, xx) => rgba[(yy * w + xx) * 4 + c];
        const v = (p(y0, x0) * (1 - wx) + p(y0, x1) * wx) * (1 - wy) + (p(y1, x0) * (1 - wx) + p(y1, x1) * wx) * wy;
        out[c * size * size + y * size + x] = (v / 255 - 0.5) / 0.5;
      }
    }
  }
  return out;
}
const norm = (v) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s); return Array.from(v, (x) => x / s); };
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// ---- text embeddings ---------------------------------------------------------------------------
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const textModel = await SiglipTextModel.from_pretrained(MODEL, { dtype: 'q8' });
const prompts = LABELS.flatMap((l) => l.prompts.map((p) => ({ id: l.id, p })));
const inputs = tokenizer(prompts.map((x) => x.p), { padding: 'max_length', truncation: true, max_length: 64 });
const { pooler_output } = await textModel(inputs);
const dim = pooler_output.dims[1];
const byId = new Map();
prompts.forEach((x, i) => {
  const e = norm(pooler_output.data.slice(i * dim, (i + 1) * dim));
  const acc = byId.get(x.id) ?? new Array(dim).fill(0);
  e.forEach((v, k) => (acc[k] += v));
  byId.set(x.id, acc);
});
const labelEmb = LABELS.map((l) => ({ id: l.id, kind: l.kind, e: norm(byId.get(l.id)) }));

// ---- logit scale / bias from the full model ------------------------------------------------------
const vision = await ort.InferenceSession.create('./models/vision_model_quantized.onnx');
console.log('vision inputs', vision.inputNames, 'outputs', vision.outputNames);

async function embedImage(path) {
  const img = jpeg.decode(readFileSync(path), { useTArray: true, formatAsRGBA: true });
  const x = preprocess(img.data, img.width, img.height);
  const out = await vision.run({ [vision.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, 224, 224]) });
  const pooled = out.pooler_output ?? out[vision.outputNames[vision.outputNames.length - 1]];
  return norm(pooled.data);
}

const calImg = './trashnet-data/plastic/plastic135.jpg';
const calTexts = ['a photo of a plastic bottle', 'a photo of a sofa', 'a photo of a banana peel'];
// Full model gives logits = scale * cos(image, text) + bias; fit scale/bias from its own embeddings.
const full = await SiglipModel.from_pretrained(MODEL, { dtype: 'q8' });
const procFull = await AutoProcessor.from_pretrained(MODEL);
const tIn = tokenizer(calTexts, { padding: 'max_length', truncation: true, max_length: 64 });
const fOut = await full({ ...tIn, ...(await procFull(await RawImage.read(calImg))) });
console.log('full model outputs', Object.keys(fOut));
const tOut = await textModel(tIn);
const ie = await embedImage(calImg);
const fImg = norm(fOut.image_embeds.data);
const pts = calTexts.map((t, i) => ({
  d: dot(fImg, norm(fOut.text_embeds.data.slice(i * dim, (i + 1) * dim))),
  logit: fOut.logits_per_image.data[i],
}));
// least squares fit logit = scale * d + bias
const n = pts.length, mx = pts.reduce((s, p) => s + p.d, 0) / n, my = pts.reduce((s, p) => s + p.logit, 0) / n;
const scale = pts.reduce((s, p) => s + (p.d - mx) * (p.logit - my), 0) / pts.reduce((s, p) => s + (p.d - mx) ** 2, 0);
const bias = my - scale * mx;
console.log('calibration points', pts.map((p) => [p.d.toFixed(3), p.logit.toFixed(2)]), 'scale', scale.toFixed(2), 'bias', bias.toFixed(2));

// parity: transformers.js own vision preprocessing vs ours
const proc = await AutoProcessor.from_pretrained(MODEL);
const visTj = await SiglipVisionModel.from_pretrained(MODEL, { dtype: 'q8' });
const tjOut = await visTj(await proc(await RawImage.read(calImg)));
console.log('parity cosine (ours vs transformers.js preprocessing):', dot(ie, norm(tjOut.pooler_output.data)).toFixed(4));

// ---- score TrashNet photos ---------------------------------------------------------------------
const EXPECT = { plastic: ['plastic-bottle'], glass: ['glass-bottle'], cardboard: ['pizza-box', 'cardboard-box'], paper: ['paper'], metal: ['can'], trash: [] };
let top1 = 0, top3 = 0, total = 0;
const report = [];
for (const cls of readdirSync('./trashnet-data')) {
  for (const f of readdirSync(`./trashnet-data/${cls}`).slice(0, 8)) {
    const e = await embedImage(`./trashnet-data/${cls}/${f}`);
    const scored = labelEmb.map((l) => ({ id: l.id, kind: l.kind, p: 1 / (1 + Math.exp(-(scale * dot(e, l.e) + bias))) })).sort((a, b) => b.p - a.p);
    const want = EXPECT[cls] ?? [];
    if (want.length) {
      total++;
      if (want.includes(scored[0].id)) top1++;
      if (scored.slice(0, 3).some((s) => want.includes(s.id))) top3++;
    }
    report.push(`${cls}/${f}: ${scored.slice(0, 3).map((s) => `${s.id} ${(s.p * 100).toFixed(1)}%`).join(', ')}`);
  }
}
console.log(report.join('\n'));
console.log(`top-1 ${top1}/${total}, top-3 ${top3}/${total}`);
writeFileSync('./label-embeddings.json', JSON.stringify({ model: MODEL, file: 'onnx/vision_model_quantized.onnx', dim, scale, bias, labels: labelEmb.map((l) => ({ id: l.id, kind: l.kind, e: l.e.map((x) => +x.toFixed(5)) })) }));

// SigLIP 2 "in the cloud": the same zero-shot method as siglip.mjs (classes.json prompts, softmax over the 9
// classes), but run the way a server would run it: full precision, the model's own preprocessing, any size.
// Usage: node siglip-cloud.mjs <cache_dir> <hf_model_id> <dtype> <result_name>
//   e.g. node siglip-cloud.mjs ./cache onnx-community/siglip2-base-patch16-224-ONNX fp32 siglip2-base-cloud
//        node siglip-cloud.mjs ./cache onnx-community/siglip2-so400m-patch16-256-ONNX fp32 siglip2-so400m-cloud
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { AutoProcessor, AutoTokenizer, env, RawImage, SiglipModel, SiglipTextModel, SiglipVisionModel } from '@huggingface/transformers';

const [cache, MODEL, DTYPE = 'fp32', NAME] = process.argv.slice(2);
env.cacheDir = process.env.HF_CACHE ?? './.hf-cache';
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

const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const processor = await AutoProcessor.from_pretrained(MODEL);
const textModel = await SiglipTextModel.from_pretrained(MODEL, { dtype: DTYPE });
const visionModel = await SiglipVisionModel.from_pretrained(MODEL, { dtype: DTYPE });

async function embedTexts(texts) {
  const inputs = tokenizer(texts, { padding: 'max_length', truncation: true, max_length: 64 });
  const { pooler_output } = await textModel(inputs);
  const dim = pooler_output.dims[1];
  return texts.map((_, i) => norm(pooler_output.data.slice(i * dim, (i + 1) * dim)));
}
const classEmb = [];
for (const c of classes) {
  const es = await embedTexts(siglipPrompts[c]);
  classEmb.push(norm(es[0].map((_, k) => es.reduce((s, e) => s + e[k], 0))));
}

async function embedImage(path) {
  const inputs = await processor(await RawImage.read(path));
  const { pooler_output } = await visionModel(inputs);
  return norm(pooler_output.data);
}

// logit = scale · cos + bias, read off the full model on one photo and three captions (least squares).
let scale = 100;
let bias = 0;
{
  const full = await SiglipModel.from_pretrained(MODEL, { dtype: DTYPE });
  const cal = `${cache}/${items[0].id.split('/').join('__')}.jpg`;
  const texts = ['a photo of a plastic bottle', 'a photo of a sofa', 'a photo of a banana peel'];
  const tIn = tokenizer(texts, { padding: 'max_length', truncation: true, max_length: 64 });
  const fOut = await full({ ...tIn, ...(await processor(await RawImage.read(cal))) });
  const img = norm(fOut.image_embeds.data);
  const dim = img.length;
  const pts = texts.map((_, i) => ({ d: dot(img, norm(fOut.text_embeds.data.slice(i * dim, (i + 1) * dim))), l: fOut.logits_per_image.data[i] }));
  const mx = pts.reduce((s, p) => s + p.d, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.l, 0) / pts.length;
  scale = pts.reduce((s, p) => s + (p.d - mx) * (p.l - my), 0) / pts.reduce((s, p) => s + (p.d - mx) ** 2, 0);
  bias = my - scale * mx;
  await full.dispose?.();
  console.log(`${NAME}: scale ${scale.toFixed(2)} bias ${bias.toFixed(2)}`);
}

let n = 0;
for (const item of items) {
  if (done.has(item.id)) continue;
  const t0 = performance.now();
  const e = await embedImage(`${cache}/${item.id.split('/').join('__')}.jpg`);
  const ms = performance.now() - t0;
  const logits = classEmb.map((c) => scale * dot(e, c) + bias);
  const mx = Math.max(...logits);
  const ex = logits.map((l) => Math.exp(l - mx));
  const sum = ex.reduce((a, b) => a + b, 0);
  const order = ex.map((v, i) => [v / sum, i]).sort((a, b) => b[0] - a[0]);
  appendFileSync(out, JSON.stringify({ id: item.id, pred: classes[order[0][1]], confidence: +order[0][0].toFixed(4), second: classes[order[1][1]], ms: Math.round(ms) }) + '\n');
  if (++n % 200 === 0) console.log(`${NAME}: ${n}`);
}
console.log(`${NAME}: done ${n}`);

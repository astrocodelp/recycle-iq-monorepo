// Usage (in the bench dir with @huggingface/transformers): node embed-labels.mjs <labels.json> <siglip2-labels.json>
// Text side only: same encoder (q8), prompts and averaging as bench.mjs; keeps scale/bias/model metadata.
import { readFileSync, writeFileSync } from 'node:fs';
import { env, AutoTokenizer, SiglipTextModel } from '@huggingface/transformers';
env.cacheDir = './hf-cache';
const [labelsPath, outPath] = process.argv.slice(2);
const MODEL = 'onnx-community/siglip2-base-patch16-224-ONNX';
const LABELS = JSON.parse(readFileSync(labelsPath, 'utf8'));
const meta = JSON.parse(readFileSync(outPath, 'utf8'));
const norm = (v) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s); return Array.from(v, (x) => x / s); };
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const textModel = await SiglipTextModel.from_pretrained(MODEL, { dtype: 'q8' });
const old = new Map(meta.labels.map((l) => [l.id, l]));
const labels = [];
for (const l of LABELS) {
  const inputs = tokenizer(l.prompts, { padding: 'max_length', truncation: true, max_length: 64 });
  const { pooler_output } = await textModel(inputs);
  const dim = pooler_output.dims[1];
  const acc = new Array(dim).fill(0);
  l.prompts.forEach((_, i) => norm(pooler_output.data.slice(i * dim, (i + 1) * dim)).forEach((v, k) => (acc[k] += v)));
  const e = norm(acc).map((x) => +x.toFixed(5));
  const prev = old.get(l.id);
  if (prev) { const d = prev.e.reduce((s, x, i) => s + x * e[i], 0); if (d < 0.999) console.log('drift', l.id, d.toFixed(4)); }
  labels.push({ id: l.id, kind: l.kind, e: prev?.e ?? e });
}
// Existing labels keep their exact embeddings; new ones are appended.
writeFileSync(outPath, JSON.stringify({ ...meta, labels }));
console.log(labels.length, 'labels');

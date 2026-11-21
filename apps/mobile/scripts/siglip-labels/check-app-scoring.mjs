// Checks the app's scoring path (same math as src/lib/vision.native.ts) with the shipped
// assets/ml/siglip2-labels.json, on TrashNet photos, using onnxruntime-node.
//
//   node check-app-scoring.mjs <labels.json> <bench dir with models/vision_model_quantized.onnx and trashnet-data/>
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const [labelsPath, benchDir] = process.argv.slice(2);
const require = createRequire(path.join(benchDir, 'package.json'));
const ort = require('onnxruntime-node');
const jpeg = require('jpeg-js');
const META = JSON.parse(readFileSync(labelsPath, 'utf8'));
const SIZE = 224;

// Stand-in for ImageManipulator.resize({ width: 224, height: 224 }) on the phone.
function bilinear(rgba, w, h) {
  const out = new Uint8Array(SIZE * SIZE * 4);
  const sx = w / SIZE, sy = h / SIZE;
  for (let y = 0; y < SIZE; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < SIZE; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), wx = fx - x0;
      for (let c = 0; c < 4; c++) {
        const p = (yy, xx) => rgba[(yy * w + xx) * 4 + c];
        out[(y * SIZE + x) * 4 + c] = Math.round((p(y0, x0) * (1 - wx) + p(y0, x1) * wx) * (1 - wy) + (p(y1, x0) * (1 - wx) + p(y1, x1) * wx) * wy);
      }
    }
  }
  return out;
}

// Same as toTensorData in vision.native.ts.
function toTensorData(rgba, w, h) {
  const out = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.min(h - 1, Math.floor((y * h) / SIZE));
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.min(w - 1, Math.floor((x * w) / SIZE));
      const i = (sy * w + sx) * 4, o = y * SIZE + x;
      out[o] = rgba[i] / 127.5 - 1;
      out[plane + o] = rgba[i + 1] / 127.5 - 1;
      out[2 * plane + o] = rgba[i + 2] / 127.5 - 1;
    }
  }
  return out;
}

const session = await ort.InferenceSession.create(path.join(benchDir, 'models/vision_model_quantized.onnx'));
let top1 = 0, n = 0;
for (const [cls, want] of [['plastic', 'plastic-bottle'], ['glass', 'glass-bottle'], ['cardboard', null], ['metal', null]]) {
  for (const f of readdirSync(path.join(benchDir, 'trashnet-data', cls)).slice(0, 8)) {
    const img = jpeg.decode(readFileSync(path.join(benchDir, 'trashnet-data', cls, f)), { useTArray: true, formatAsRGBA: true });
    const data = toTensorData(bilinear(img.data, img.width, img.height), SIZE, SIZE);
    const out = await session.run({ pixel_values: new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]) });
    const pooled = out.pooler_output.data;
    let norm = 0;
    for (const v of pooled) norm += v * v;
    norm = Math.sqrt(norm);
    const scored = META.labels
      .map((l) => {
        let d = 0;
        for (let i = 0; i < l.e.length; i++) d += (pooled[i] / norm) * l.e[i];
        return { id: l.id, kind: l.kind, p: 1 / (1 + Math.exp(-(META.scale * d + META.bias))) };
      })
      .sort((a, b) => b.p - a.p);
    const ranked = scored.filter((l) => l.kind === 'object');
    const otherWon = scored[0].kind === 'other';
    const sure = !otherWon && ranked[0].p >= 0.002 && ranked[0].p >= 1.5 * ranked[1].p;
    if (want) {
      n++;
      if (ranked[0].id === want) top1++;
    }
    console.log(`${cls}/${f}: tray first=${ranked[0].id} sure=${sure} top label=${scored[0].id}`);
  }
}
console.log(`catalogue top-1 on plastic + glass: ${top1}/${n}`);

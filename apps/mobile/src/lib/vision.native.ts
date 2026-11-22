/**
 * On-device recognition with SigLIP 2 (google/siglip2-base-patch16-224, Apache-2.0). See docs/VISION.md.
 *
 * - Only the vision encoder runs on the phone (onnx/vision_model_q4.onnx, 4-bit, ~63 MB). It is downloaded
 *   once, on the first scan, into the app's document directory. It is not in the app bundle.
 * - The text side is precomputed: assets/ml/siglip2-labels.json holds one L2-normalised embedding per
 *   label (built by scripts/siglip-labels/bench.mjs) and the sigmoid calibration (scale, bias).
 * - The photo is resized to 224x224 and scored on the device. It never leaves the phone.
 *
 * Any failure (Expo Go without the native module, no network for the first download, a bad photo)
 * returns null and the scan screen falls back to the pick list.
 */
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getNetworkStateAsync, NetworkStateType } from 'expo-network';
import jpeg from 'jpeg-js';
import LABELS from '../../assets/ml/siglip2-labels.json';
import type { Recognition, RecognizeOptions } from './vision';

export type { Recognition, RecognizeOptions } from './vision';

interface LabelFile {
  url: string;
  bytes: number;
  dim: number;
  scale: number;
  bias: number;
  labels: { id: string; kind: 'object' | 'other'; e: number[] }[];
}
const META = LABELS as LabelFile;
const SIZE = 224;
const MODEL_NAME = 'siglip2-vision-q4.onnx';
/** The earlier 8-bit model (95 MB), removed once the 4-bit one is in place. */
const LEGACY_MODEL = 'siglip2-vision-quantized.onnx';

type Ort = typeof import('onnxruntime-react-native');
let ort: Ort | null | undefined;
function loadOrt(): Ort | null {
  if (ort !== undefined) return ort;
  try {
    // Missing in Expo Go: the native module is only in development / preview / production builds.
    ort = require('onnxruntime-react-native') as Ort;
  } catch {
    ort = null;
  }
  return ort;
}

export const visionSupported = true;

const modelFile = () => new File(Paths.document, MODEL_NAME);

/** The download is complete when the file has the expected size (a partial file is replaced). */
export function isModelDownloaded(): boolean {
  try {
    const f = modelFile();
    return f.exists && (f.size ?? 0) >= META.bytes * 0.99;
  } catch {
    return false;
  }
}

async function ensureModel(options: RecognizeOptions): Promise<File | null> {
  const target = modelFile();
  if (isModelDownloaded()) return target;
  const partial = new File(Paths.cache, `${MODEL_NAME}.part`);
  try {
    if (partial.exists) partial.delete();
    await File.downloadFileAsync(META.url, partial, {
      idempotent: true,
      signal: options.signal,
      onProgress: ({ bytesWritten, totalBytes }) =>
        options.onDownload?.(Math.min(1, bytesWritten / (totalBytes > 0 ? totalBytes : META.bytes))),
    });
    if (target.exists) target.delete();
    await partial.move(target);
    try {
      const legacy = new File(Paths.document, LEGACY_MODEL);
      if (legacy.exists) legacy.delete();
    } catch {}
    return isModelDownloaded() ? target : null;
  } catch {
    try {
      if (partial.exists) partial.delete();
    } catch {}
    return null;
  }
}

let prefetching = false;
/**
 * Fetch the model quietly after a scan, only on Wi-Fi, so later scans can be answered on the phone
 * (and still work offline). Never on mobile data: it is 63 MB.
 */
export async function prefetchModelOnWifi(): Promise<void> {
  if (prefetching || isModelDownloaded() || !loadOrt()) return;
  try {
    const net = await getNetworkStateAsync();
    if (net.type !== NetworkStateType.WIFI || net.isInternetReachable === false) return;
    prefetching = true;
    await ensureModel({});
  } catch {
  } finally {
    prefetching = false;
  }
}

type Session = Awaited<ReturnType<Ort['InferenceSession']['create']>>;
let session: Promise<Session | null> | null = null;
function getSession(o: Ort, file: File): Promise<Session | null> {
  if (!session) {
    session = o.InferenceSession.create(file.uri).catch(() => {
      session = null;
      return null;
    });
  }
  return session;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** RGBA 224x224 -> CHW float32 in [-1, 1], the SigLIP image processor's mean/std of 0.5. */
function toTensorData(rgba: Uint8Array, w: number, h: number): Float32Array {
  const out = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.min(h - 1, Math.floor((y * h) / SIZE));
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.min(w - 1, Math.floor((x * w) / SIZE));
      const i = (sy * w + sx) * 4;
      const o = y * SIZE + x;
      out[o] = rgba[i]! / 127.5 - 1;
      out[plane + o] = rgba[i + 1]! / 127.5 - 1;
      out[2 * plane + o] = rgba[i + 2]! / 127.5 - 1;
    }
  }
  return out;
}

async function pixels(photoUri: string): Promise<Float32Array> {
  const ref = await ImageManipulator.manipulate(photoUri).resize({ width: SIZE, height: SIZE }).renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
  const img = jpeg.decode(base64ToBytes(saved.base64 ?? ''), { useTArray: true, formatAsRGBA: true });
  return toTensorData(img.data, img.width, img.height);
}

export async function recognize(photoUri: string, options: RecognizeOptions = {}): Promise<Recognition | null> {
  const o = loadOrt();
  if (!o) return null;
  try {
    const file = await ensureModel(options);
    if (!file || options.signal?.aborted) return null;
    const s = await getSession(o, file);
    if (!s || options.signal?.aborted) return null;
    const data = await pixels(photoUri);
    const out = await s.run({ [s.inputNames[0]!]: new o.Tensor('float32', data, [1, 3, SIZE, SIZE]) });
    const pooled = (out.pooler_output ?? out[s.outputNames[s.outputNames.length - 1]!])!.data as Float32Array;
    let norm = 0;
    for (let i = 0; i < pooled.length; i++) norm += pooled[i]! * pooled[i]!;
    norm = Math.sqrt(norm) || 1;
    const scored = META.labels
      .map((l) => {
        let dot = 0;
        for (let i = 0; i < l.e.length; i++) dot += (pooled[i]! / norm) * l.e[i]!;
        return { id: l.id, kind: l.kind, p: 1 / (1 + Math.exp(-(META.scale * dot + META.bias))) };
      })
      .sort((a, b) => b.p - a.p);
    const ranked = scored.filter((l) => l.kind === 'object').map(({ id, p }) => ({ id, p }));
    const otherWon = scored[0]?.kind === 'other';
    const topP = ranked[0]?.p ?? 0;
    // Bench (TrashNet): ranking is reliable, absolute SigLIP probabilities are small. Suggest the first
    // item only when it clearly leads the next one and no non-catalogue label won.
    const sure = !otherWon && topP >= 0.002 && topP >= 1.5 * (ranked[1]?.p ?? 0);
    return { ranked, otherWon, topP, sure };
  } catch {
    return null;
  }
}

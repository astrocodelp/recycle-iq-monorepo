/**
 * Photo recognition on the server (POST /api/v1/recognize, docs/VISION.md). The photo is shrunk to
 * 640 px and sent once; the server asks a vision model and does not keep the photo. Any failure (no
 * network, timeout, server error) resolves to null so the scan screen can fall back to the on-device model.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_URL } from './api';

export interface CloudResult {
  /** A catalogue object id, or "other" when the item is not in the catalogue. */
  item: string;
  confidence: number;
  /** What the model saw, in a few Greek words. */
  seen: string;
  /** Visibly soiled with grease or food (pizza box). */
  greasy?: boolean;
  /** Still holds liquid or food (can, bottle). */
  liquid?: boolean;
}

const EDGE = 640;

export async function recognizeInCloud(photoUri: string, signal?: AbortSignal): Promise<CloudResult | null> {
  try {
    const ref = await ImageManipulator.manipulate(photoUri).resize({ width: EDGE }).renderAsync();
    const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (!saved.base64 || signal?.aborted) return null;
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 12_000);
    signal?.addEventListener('abort', () => timeout.abort());
    try {
      const res = await fetch(`${API_URL}/api/v1/recognize`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: saved.base64 }),
        signal: timeout.signal,
      });
      if (!res.ok) return null;
      const j = (await res.json()) as Partial<CloudResult>;
      if (typeof j.item !== 'string' || typeof j.confidence !== 'number') return null;
      return {
        item: j.item,
        confidence: j.confidence,
        seen: typeof j.seen === 'string' ? j.seen : '',
        greasy: typeof j.greasy === 'boolean' ? j.greasy : undefined,
        liquid: typeof j.liquid === 'boolean' ? j.liquid : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

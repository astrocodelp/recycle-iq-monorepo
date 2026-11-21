import { z } from 'zod';
import { error, parseBody } from '@/lib/api';
import { recognizePhoto, visionModel } from '@/lib/recognize';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** ~1 MB of JPEG as base64. The app sends a 640 px photo (~60-120 KB). */
const MAX_BASE64 = 1_400_000;

const Body = z.object({
  image: z.string().min(100).max(MAX_BASE64),
});

// Best-effort limit per IP on a warm instance: enough to stop a loop, not a security boundary.
const WINDOW_MS = 60_000;
const PER_WINDOW = 20;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_WINDOW;
}

/**
 * Recognise the item in one photo (see lib/recognize.ts). The photo is sent to the vision model and then
 * dropped: it is not stored or logged. Answers { item, confidence, seen }, item being a catalogue id or "other".
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return error(429, 'Too many photos, try again in a minute');
  const body = await parseBody(req, Body);
  if (!body.ok) return body.res;
  const b64 = body.data.image.replace(/^data:image\/\w+;base64,/, '');
  let jpeg: Uint8Array;
  try {
    jpeg = Uint8Array.from(Buffer.from(b64, 'base64'));
  } catch {
    return error(400, 'image must be base64 JPEG');
  }
  if (jpeg.length < 100 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return error(400, 'image must be a JPEG');
  const started = Date.now();
  try {
    const result = await recognizePhoto(jpeg, AbortSignal.timeout(20_000));
    return Response.json({ ...result, model: visionModel(), ms: Date.now() - started });
  } catch (e) {
    console.error('recognize failed', e instanceof Error ? e.message : e);
    return error(502, 'Recognition is not available right now');
  }
}

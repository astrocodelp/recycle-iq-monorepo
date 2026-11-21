import { NextResponse } from 'next/server';
import type { z } from 'zod';

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

export const error = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });

export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: error(400, 'Body must be JSON') };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, res: error(400, 'Invalid request', parsed.error.issues) };
  return { ok: true, data: parsed.data };
}

/** Anonymous device id from header or body. */
export const deviceIdFrom = (req: Request, body?: { deviceId?: string }) =>
  body?.deviceId ?? req.headers.get('x-device-id') ?? null;

import { getDb, surveyResponses } from '@recycleiq/db';
import { NextResponse } from 'next/server';
import { cleanAnswers, SURVEY_VERSION } from '@/lib/survey';

/** Saves one anonymous survey response (from /feedback). The email, if given, is only for the pilot sign-up. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { answers?: unknown; email?: unknown; source?: unknown; website?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  // Honeypot: people never see this field, bots fill it in.
  if (typeof body.website === 'string' && body.website) return NextResponse.json({ ok: true });
  const r = cleanAnswers(body.answers);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  const email = typeof body.email === 'string' && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(body.email.trim()) ? body.email.trim().toLowerCase() : null;
  const source = typeof body.source === 'string' ? body.source.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || null : null;
  await getDb().insert(surveyResponses).values({ version: SURVEY_VERSION, answers: r.answers, email, source });
  return NextResponse.json({ ok: true }, { status: 201 });
}

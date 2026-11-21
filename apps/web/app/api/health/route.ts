import { getDb, sql } from '@recycleiq/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, db: 'up' });
  } catch (e) {
    return Response.json({ ok: false, db: 'down', error: (e as Error).message }, { status: 503 });
  }
}

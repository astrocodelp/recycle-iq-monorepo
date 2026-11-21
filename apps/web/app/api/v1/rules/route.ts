import { asc, getDb, rules } from '@recycleiq/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await getDb().select().from(rules).orderBy(asc(rules.code));
  return Response.json({
    rules: rows,
    meta: { note: 'Ενδεικτικοί κανόνες demo — όχι επίσημος κανονισμός' },
  });
}

import { desc, getDb, surveyResponses, sql } from '@recycleiq/db';
import { Card } from '@/components/ui';
import { getLang, tr } from '@/lib/lang';
import { SITE_URL } from '@/lib/site';
import { ALL_QUESTIONS, GRID_COLUMNS, OTHER, SURVEY_VERSION, type Answers } from '@/lib/survey';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Έρευνα κατοίκων' };

/** Results of the public resident survey (/feedback). Emails are never shown here, only how many signed up. */
export default async function SurveyResults() {
  const t = tr(await getLang());
  const db = getDb();
  const rows = await db
    .select({ answers: surveyResponses.answers, source: surveyResponses.source, createdAt: surveyResponses.createdAt })
    .from(surveyResponses)
    .orderBy(desc(surveyResponses.createdAt))
    .limit(5000);
  const [signups] = await db.select({ pilot: sql<number>`count(*) filter (where ${surveyResponses.email} is not null)`.mapWith(Number) }).from(surveyResponses);
  const n = rows.length;
  const all = rows.map((r) => r.answers as Answers);
  const pct = (x: number, of = n) => (of ? Math.round((x / of) * 100) : 0);
  const sources = new Map<string, number>();
  for (const r of rows) sources.set(r.source ?? t('απευθείας', 'direct'), (sources.get(r.source ?? t('απευθείας', 'direct')) ?? 0) + 1);
  const url = `${SITE_URL}/feedback?src=linkedin`;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header>
        <p className="eyebrow">{t('Συμμετοχή', 'Participation')}</p>
        <h1 className="mt-1 text-h1">{t('Έρευνα κατοίκων: προσβασιμότητα και ανταμοιβές', 'Resident survey: accessibility and rewards')}</h1>
        <p className="mt-1 max-w-3xl text-body text-muted">
          {t('Ανώνυμες απαντήσεις από τη δημόσια φόρμα. Μοιράσου τον σύνδεσμο:', 'Anonymous answers from the public form. Share the link:')}{' '}
          <a href="/feedback" className="num break-all underline underline-offset-4" target="_blank" rel="noopener">
            {url}
          </a>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          [t('Απαντήσεις', 'Responses'), String(n)],
          [t('Θέλουν το πιλοτικό', 'Pilot sign-ups'), String(signups?.pilot ?? 0)],
          [t('Τελευταία απάντηση', 'Latest response'), rows[0] ? rows[0].createdAt.toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Athens' }) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="card flex flex-col gap-2 p-4">
            <span className="eyebrow">{label}</span>
            <span className="num text-[28px] leading-none font-bold">{value}</span>
          </div>
        ))}
      </div>

      {n === 0 ? (
        <Card>
          <p className="text-body text-muted">{t('Καμία απάντηση ακόμα. Μοιράσου τον σύνδεσμο για να ξεκινήσει η συλλογή.', 'No responses yet. Share the link to start collecting.')}</p>
        </Card>
      ) : (
        <>
          <Card>
            <h2 className="text-h3">{t('Από πού ήρθαν', 'Where they came from')}</h2>
            <Bars items={[...sources].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, count: v, pct: pct(v) }))} />
          </Card>
          {ALL_QUESTIONS.map((q) => {
            if (q.type === 'single' || q.type === 'multi') {
              const counts = q.options.map((o) => ({
                label: o,
                count: all.filter((a) => (q.type === 'multi' ? ((a[q.id] as string[]) ?? []).includes(o) : a[q.id] === o)).length,
              }));
              const answered = all.filter((a) => a[q.id] !== undefined).length;
              const others = q.type === 'multi' ? all.map((a) => a[`${q.id}${OTHER}`]).filter((x): x is string => typeof x === 'string') : [];
              return (
                <Card key={q.id}>
                  <h2 className="text-h3">{q.title}</h2>
                  <p className="text-caption text-muted">
                    {answered} {t('απαντήσεις', 'answers')}
                    {q.type === 'multi' ? ` · ${t('πολλαπλή επιλογή', 'multiple choice')}` : ''}
                  </p>
                  <Bars items={counts.sort((a, b) => b.count - a.count).map((c) => ({ ...c, pct: pct(c.count, answered) }))} />
                  {others.length > 0 && <Quotes title={t('«Άλλο»', '“Other”')} items={others} />}
                </Card>
              );
            }
            if (q.type === 'scale') {
              const vals = all.map((a) => a[q.id]).filter((x): x is number => typeof x === 'number');
              const mean = vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0;
              return (
                <Card key={q.id}>
                  <h2 className="text-h3">{q.title}</h2>
                  <p className="text-caption text-muted">
                    {t('Μέσος όρος', 'Average')} <b className="num text-ink">{mean.toLocaleString('el-GR', { maximumFractionDigits: 1 })}</b> / 5 · 1 = {q.low}, 5 = {q.high}
                  </p>
                  <Bars items={[5, 4, 3, 2, 1].map((s) => ({ label: String(s), count: vals.filter((v) => v === s).length, pct: pct(vals.filter((v) => v === s).length, vals.length) }))} />
                </Card>
              );
            }
            if (q.type === 'grid') {
              const scores = q.rows
                .map((row) => {
                  const vals = all.map((a) => (a[q.id] as Record<string, string> | undefined)?.[row]).filter((x): x is string => !!x).map((c) => GRID_COLUMNS.indexOf(c) + 1);
                  const mean = vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0;
                  const top = vals.filter((v) => v >= 4).length;
                  return { row, mean, top: pct(top, vals.length) };
                })
                .sort((a, b) => b.mean - a.mean);
              return (
                <Card key={q.id}>
                  <h2 className="text-h3">{q.title}</h2>
                  <p className="text-caption text-muted">{t('Μέση βαθμολογία 1–5 (1 = Καθόλου, 5 = Πάρα πολύ) και % «Πολύ» ή «Πάρα πολύ».', 'Average 1–5 and % “a lot” or more.')}</p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {scores.map((s) => (
                      <li key={s.row} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[280px_minmax(0,1fr)_110px]">
                        <span className="text-body">{s.row}</span>
                        <span className="num text-caption text-muted sm:order-last sm:text-right">
                          {s.mean.toLocaleString('el-GR', { maximumFractionDigits: 1 })} · {s.top}%
                        </span>
                        <div className="col-span-2 h-2.5 rounded-r-[4px] bg-surface-2 sm:col-span-1" aria-hidden>
                          <div className="h-2.5 rounded-r-[4px] bg-forest-700" style={{ width: `${(s.mean / 5) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            }
            const texts = all.map((a) => a[q.id]).filter((x): x is string => typeof x === 'string');
            if (!texts.length) return null;
            return (
              <Card key={q.id}>
                <h2 className="text-h3">{q.title}</h2>
                <Quotes title={`${texts.length} ${t('απαντήσεις, οι πιο πρόσφατες', 'answers, latest first')}`} items={texts} />
              </Card>
            );
          })}
          <p className="text-caption text-muted">
            {t('Έκδοση ερωτηματολογίου', 'Survey version')} {SURVEY_VERSION}.
          </p>
        </>
      )}
    </div>
  );
}

function Bars({ items }: { items: { label: string; count: number; pct: number }[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[280px_minmax(0,1fr)_90px]">
          <span className="text-body">{i.label}</span>
          <span className="num text-caption text-muted sm:order-last sm:text-right">
            {i.count} · {i.pct}%
          </span>
          <div className="col-span-2 h-2.5 rounded-r-[4px] bg-surface-2 sm:col-span-1" aria-hidden>
            <div className="h-2.5 rounded-r-[4px] bg-forest-700" style={{ width: `${i.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Quotes({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-caption text-muted">{title}</p>
      <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
        {items.slice(0, 50).map((x, i) => (
          <li key={i} className="rounded-control bg-surface-2 px-3 py-2 text-body">
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

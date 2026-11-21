import { asc, getDb, rules as rulesTable } from '@recycleiq/db';
import { BIN_KEYS, CATEGORIES, DEFAULT_BINS, ruleImpact } from '@recycleiq/engine';
import { Badge, Card, CategoryLabel, DemoBadge } from '@/components/ui';
import { getBinStyles } from '@/lib/bin-styles';
import { getDistrictContext, getDistricts } from '@/lib/data';
import { fmt } from '@/lib/format';
import { getLang, tr } from '@/lib/lang';
import { getRuleChanges } from '@/lib/queries';
import { toggleRule, updateBin } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Κανόνες' };

export default async function RulesPage({ searchParams }: PageProps<'/rules'>) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  const districtId = typeof sp.district === 'string' ? sp.district : 'koukaki';
  const [rows, districts, { ctx }, changes, bins] = await Promise.all([
    getDb().select().from(rulesTable).orderBy(asc(rulesTable.code)),
    getDistricts(),
    getDistrictContext(districtId),
    getRuleChanges(),
    getBinStyles(),
  ]);
  const states = rows.map((r) => ({ code: r.code, enabled: r.enabled }));
  const on = rows.filter((r) => r.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('Μητρώο κανόνων', 'Rule registry')}</p>
          <h1 className="mt-1 text-h1">{t('Κανόνες του Δήμου', 'Municipal rules')}</h1>
          <p className="mt-1 text-body text-muted">
            {t(
              `${on} από ${rows.length} ενεργοί. Οι αλλαγές ισχύουν αμέσως στην εφαρμογή.`,
              `${on} of ${rows.length} enabled. Changes apply to the app immediately.`,
            )}
          </p>
          <div className="mt-2">
            <DemoBadge>{t('Ενδεικτικοί κανόνες demo — όχι επίσημος κανονισμός', 'Indicative demo rules — not the official regulation')}</DemoBadge>
          </div>
        </div>
        <form className="flex items-center gap-2 text-caption text-muted">
          <label htmlFor="district">{t('Προεπισκόπηση για', 'Preview for')}</label>
          <select
            id="district"
            name="district"
            defaultValue={ctx.id}
            className="rounded-control border border-line-strong bg-surface px-3 py-2 text-body text-ink"
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {t(d.name)}
              </option>
            ))}
          </select>
          <button className="rounded-control bg-ink px-3 py-2 text-body font-semibold text-white">{t('Εφαρμογή', 'Apply')}</button>
        </form>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Card title={t('Κάδοι και χρώματα', 'Bins and colours')}>
            <p className="text-body text-muted">
              {t(
                'Πώς λέγεται και τι χρώμα έχει κάθε κάδος στον Δήμο. Η εφαρμογή χρησιμοποιεί αυτά τα ονόματα και χρώματα στην επόμενη απάντηση.',
                'What each bin is called and its colour in this municipality. The app uses these names and colours from the next answer on.',
              )}
            </p>
            <ul className="mt-3 flex flex-col">
              {BIN_KEYS.map((k) => {
                const b = bins[k];
                const changed = b.color !== DEFAULT_BINS[k].color || b.name.el !== DEFAULT_BINS[k].name.el || b.name.en !== DEFAULT_BINS[k].name.en;
                return (
                  <li key={k} className="border-t border-line py-2 first:border-0">
                    <form action={updateBin} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="key" value={k} />
                      <input
                        type="color"
                        name="color"
                        defaultValue={b.color}
                        aria-label={t(`Χρώμα: ${b.name.el}`, `Colour: ${b.name.en}`)}
                        className="h-9 w-11 cursor-pointer rounded-control border border-line-strong bg-surface p-1"
                      />
                      <input
                        name="nameEl"
                        defaultValue={b.name.el}
                        aria-label={t('Όνομα στα ελληνικά', 'Name in Greek')}
                        maxLength={60}
                        className="min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 py-2 text-body"
                      />
                      <input
                        name="nameEn"
                        defaultValue={b.name.en}
                        aria-label={t('Όνομα στα αγγλικά', 'Name in English')}
                        maxLength={60}
                        className="min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 py-2 text-body"
                      />
                      <button className="rounded-control bg-ink px-3 py-2 text-body font-semibold text-white">{t('Αποθήκευση', 'Save')}</button>
                      <button
                        name="op"
                        value="reset"
                        disabled={!changed}
                        className="rounded-control border border-line-strong px-3 py-2 text-body disabled:opacity-40"
                      >
                        {t('Επαναφορά', 'Reset')}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Card>
          {rows.map((r) => {
            const impact = ruleImpact(r.code, states, ctx);
            return (
              <Card key={r.code}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="num rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] text-ink">{r.code}</code>
                      <span className="text-caption text-muted">{r.version}</span>
                      {r.enabled ? <Badge tone="forest">{t('Ενεργός', 'Enabled')}</Badge> : <Badge tone="warn">{t('Ανενεργός', 'Disabled')}</Badge>}
                    </div>
                    <h2 className="mt-2 text-h3">{t(r.title)}</h2>
                    <p className="mt-1 text-body text-muted">{t(r.body)}</p>
                    <p className="mt-1 text-caption text-muted">{t(r.source)}</p>
                  </div>
                  <form action={toggleRule}>
                    <input type="hidden" name="code" value={r.code} />
                    <input type="hidden" name="enabled" value={String(!r.enabled)} />
                    <button
                      role="switch"
                      aria-checked={r.enabled}
                      aria-label={t(`Εναλλαγή ${r.code}`, `Toggle ${r.code}`)}
                      className={`relative h-7 w-12 rounded-pill transition-colors ${r.enabled ? 'bg-forest-700' : 'bg-switch-off'}`}
                    >
                      <span className={`absolute top-1 size-5 rounded-full bg-white shadow-knob transition-all ${r.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </form>
                </div>
                <details className="mt-3 border-t border-line pt-3">
                  <summary className="cursor-pointer text-caption font-semibold text-forest-700">
                    {impact.length
                      ? t(
                          `Αν ${r.enabled ? 'απενεργοποιηθεί' : 'ενεργοποιηθεί'}: ${impact.length === 1 ? 'αλλάζει 1 περίπτωση' : `αλλάζουν ${impact.length} περιπτώσεις`} στη συνοικία ${ctx.name.el}`,
                          `If ${r.enabled ? 'disabled' : 'enabled'}: ${impact.length} ${impact.length === 1 ? 'case changes' : 'cases change'} in ${ctx.name.en}`,
                        )
                      : t(`Καμία αλλαγή στη συνοικία ${ctx.name.el}`, `No change in ${ctx.name.en}`)}
                  </summary>
                  {impact.length > 0 && (
                    <table className="mt-3 w-full text-body">
                      <thead>
                        <tr className="text-left text-caption text-muted">
                          <th className="pb-1 font-semibold">{t('Περίπτωση', 'Case')}</th>
                          <th className="pb-1 font-semibold">{t('Τώρα', 'Now')}</th>
                          <th className="pb-1 font-semibold">{t('Μετά', 'After')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impact.map(({ scenario, before, after }) => (
                          <tr key={scenario.key} className="border-t border-line align-top">
                            <td className="py-1.5">{t(scenario.label)}</td>
                            <td className="py-1.5">
                              <CategoryLabel category={before.category} label={t(before.destination)} />
                              <span className="num ml-1 text-caption text-muted">{f.pct(before.confidence)}</span>
                            </td>
                            <td className="py-1.5">
                              <CategoryLabel category={after.category} label={t(after.destination)} />
                              <span className="num ml-1 text-caption text-muted">{f.pct(after.confidence)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </details>
              </Card>
            );
          })}
        </div>
        <Card title={t('Ιστορικό αλλαγών', 'Change log')} className="h-fit">
          {changes.length === 0 ? (
            <p className="text-body text-muted">{t('Καμία αλλαγή ακόμη.', 'No changes yet.')}</p>
          ) : (
            <ul className="text-body">
              {changes.map((c, i) => (
                <li key={i} className="border-t border-line py-2 first:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <code className="num text-[12px]">{c.code}</code>
                    <span className="text-caption text-muted">{f.ago(c.changedAt)}</span>
                  </div>
                  <div className="text-caption text-muted">
                    {c.enabled ? t('Ενεργοποιήθηκε', 'Enabled') : t('Απενεργοποιήθηκε', 'Disabled')} · {t(c.title)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-caption text-muted">
            {t('Κατηγορίες:', 'Categories:')}{' '}
            {Object.values(CATEGORIES).map((c) => (
              <span key={c.id} className="mr-2 inline-block">
                <CategoryLabel category={c.id} label={t(c.short)} />
              </span>
            ))}
          </p>
        </Card>
      </div>
    </div>
  );
}

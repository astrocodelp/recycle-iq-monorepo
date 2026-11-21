import { CATEGORIES, getObject } from '@recycleiq/engine';
import { categoryColors } from '@recycleiq/tokens';
import { BarList } from '@/components/bar-list';
import { ImpactCard } from '@/components/impact-card';
import { TrendChart } from '@/components/trend-chart';
import { Badge, Card, CategoryLabel, DemoBadge, Kpi, Segmented } from '@/components/ui';
import { fmt } from '@/lib/format';
import { getBinSource } from '@/lib/bins';
import { getLang, tr } from '@/lib/lang';
import {
  getCategoryMix,
  getDailySeries,
  getDistrictStats,
  getKpis,
  getObjectCategoryCounts,
  getRecentDecisions,
  getTopItems,
} from '@/lib/queries';
import { RANGES, parseRange } from '@/lib/range';

export const dynamic = 'force-dynamic';

export default async function Overview({ searchParams }: PageProps<'/'>) {
  const range = parseRange((await searchParams).range);
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  const [kpis, series, mix, items, districts, recent, impactRows] = await Promise.all([
    getKpis(range),
    getDailySeries(range),
    getCategoryMix(range),
    getTopItems(range),
    getBinSource().then((src) => getDistrictStats(range, src)),
    getRecentDecisions(8),
    getObjectCategoryCounts(range),
  ]);
  const delta = kpis.requestsPrev ? (kpis.requests - kpis.requestsPrev) / kpis.requestsPrev : 0;
  const mixTotal = mix.reduce((s, m) => s + m.n, 0) || 1;
  const service = { full: t('Πλήρης', 'Full'), partial: t('Μερική', 'Partial'), none: t('Καμία', 'None') };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('Δήμος Αθηναίων', 'City of Athens')}</p>
          <h1 className="mt-1 text-h1 text-ink">{t('Τι ρωτούν οι κάτοικοι', 'What residents ask')}</h1>
          <div className="mt-2">
            <DemoBadge>{t('Συνθετικά δεδομένα επίδειξης', 'Synthetic demo data')}</DemoBadge>
          </div>
        </div>
        <Segmented
          label={t('Χρονικό διάστημα', 'Date range')}
          value={String(range)}
          options={RANGES.map((r) => ({ value: String(r), label: t(`${r} ημέρες`, `${r} days`), href: `/?range=${r}` }))}
        />
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label={t('Ερωτήματα', 'Requests')}
          value={f.compact(kpis.requests)}
          delta={{ ratio: delta, label: f.pct(Math.abs(delta)) }}
          hint={t('έναντι προηγ. περιόδου', 'vs previous period')}
        />
        <Kpi
          label={t('Με διευκρίνιση', 'Clarified')}
          value={f.pct(kpis.clarificationRate)}
          hint={t('απάντησαν σε ερώτηση', 'answered a question')}
        />
        <Kpi label={t('Μέση βεβαιότητα', 'Avg confidence')} value={f.pct(kpis.avgConfidence)} hint={t('της μηχανής', 'of the engine')} />
        <Kpi
          label={t('Ενεργοί χρήστες', 'Active users')}
          value={f.compact(kpis.activeDevices)}
          hint={t('ανώνυμες εγκαταστάσεις', 'anonymous installs')}
        />
        <Kpi
          label={t('Αιτήματα καφέ κάδου', 'Brown-bin requests')}
          value={f.n(kpis.brownBinRequests)}
          hint={t('από γειτονιές χωρίς πλήρη κάλυψη', 'from areas without full coverage')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={t('Ερωτήματα ανά ημέρα', 'Requests per day')}
          subtitle={t(`Τελευταίες ${range} ημέρες`, `Last ${range} days`)}
        >
          <TrendChart data={series} locale={f.locale} seriesLabel={t('Ερωτήματα ανά ημέρα', 'Requests per day')} />
        </Card>
        <Card title={t('Πού καταλήγουν', 'Where items go')} subtitle={t('Κατηγορία της σύστασης', 'Category of the recommendation')}>
          <BarList
            rows={mix.map((m) => ({
              key: m.category,
              label: <CategoryLabel category={m.category} label={t(CATEGORIES[m.category].short)} />,
              value: m.n,
              display: `${f.pct(m.n / mixTotal)} · ${f.compact(m.n)}`,
              color: categoryColors[m.category].solid,
            }))}
          />
        </Card>
      </div>

      <ImpactCard rows={impactRows} t={t} n={f.n} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={t('Συχνότερα αντικείμενα', 'Most asked items')} subtitle={t('Και πόσο συχνά χρειάζεται ερώτηση', 'And how often a question is needed')}>
          <table className="w-full text-body">
            <thead>
              <tr className="text-left text-caption text-muted">
                <th className="pb-2 font-semibold">{t('Αντικείμενο', 'Item')}</th>
                <th className="pb-2 text-right font-semibold">{t('Ερωτήματα', 'Requests')}</th>
                <th className="pb-2 text-right font-semibold">{t('Βεβαιότητα', 'Conf.')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.objectId} className="border-t border-line">
                  <td className="py-2">{getObject(i.objectId) ? t(getObject(i.objectId)!.name) : i.objectId}</td>
                  <td className="num py-2 text-right">{f.n(i.n)}</td>
                  <td className="num py-2 text-right text-muted">{f.pct(i.avgConfidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card
          className="xl:col-span-2"
          title={t('Συνοικίες', 'Districts')}
          subtitle={t('Ταξινομημένες κατά ερωτήματα', 'Sorted by requests')}
          action={
            <a href={`/map?range=${range}`} className="text-caption font-semibold text-forest-700 hover:underline">
              {t('Άνοιγμα χάρτη', 'Open map')} →
            </a>
          }
        >
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-body">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-caption text-muted">
                  <th className="pb-2 font-semibold">{t('Συνοικία', 'District')}</th>
                  <th className="pb-2 text-right font-semibold">{t('Ερωτήματα', 'Requests')}</th>
                  <th className="pb-2 pl-6 font-semibold">{t('Κορυφαία κατηγορία', 'Top category')}</th>
                  <th className="pb-2 text-right font-semibold">{t('Κάδοι', 'Bins')}</th>
                  <th className="pb-2 pl-6 font-semibold">{t('Καφέ κάδος', 'Brown bin')}</th>
                  <th className="pb-2 text-right font-semibold">{t('Αιτήματα', 'Requests for bin')}</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="py-2">
                      <a href={`/map?range=${range}&district=${d.id}`} className="hover:underline">
                        {t(d.name)}
                      </a>
                    </td>
                    <td className="num py-2 text-right">{f.n(d.requests)}</td>
                    <td className="py-2 pl-6">
                      {d.topCategory && <CategoryLabel category={d.topCategory} label={t(CATEGORIES[d.topCategory].short)} />}
                    </td>
                    <td className="num py-2 text-right">{f.n(d.points)}</td>
                    <td className="py-2 pl-6">
                      <Badge tone={d.organicService === 'full' ? 'forest' : d.organicService === 'partial' ? 'warn' : 'neutral'}>
                        {service[d.organicService]}
                      </Badge>
                    </td>
                    <td className="num py-2 text-right text-muted">{d.brownBinRequests ? f.n(d.brownBinRequests) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title={t('Πρόσφατες συστάσεις', 'Recent recommendations')} subtitle={t('Ζωντανά από την εφαρμογή και την επίδειξη', 'Live from the app and the demo seed')}>
        <ul className="divide-y divide-line">
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-body">
              <span className="w-24 shrink-0 text-caption text-muted">{f.ago(r.createdAt)}</span>
              <span className="min-w-40 flex-1 font-semibold">
                {getObject(r.objectId) ? t(getObject(r.objectId)!.name) : r.objectId}
                <span className="ml-2 font-normal text-muted">{r.key.includes(':') ? r.key.split(':')[1] : ''}</span>
              </span>
              <span className="w-40">
                {r.uncertain ? (
                  <Badge tone="warn">{t('Αβέβαιο', 'Uncertain')}</Badge>
                ) : (
                  <CategoryLabel category={r.category} label={t(CATEGORIES[r.category].short)} />
                )}
              </span>
              <span className="num w-12 text-right text-muted">{f.pct(r.confidence)}</span>
              <span className="w-36 truncate text-caption text-muted">{r.district ? t(r.district) : t('Όλη η πόλη', 'Whole city')}</span>
              <span className="w-16">{r.synthetic ? <Badge>demo</Badge> : <Badge tone="forest">{r.via}</Badge>}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

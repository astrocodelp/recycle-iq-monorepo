import summary from '@recycleiq/sortsim/summary.json';
import { BarList } from '@/components/bar-list';
import { Sankey, type SankeyFlow } from '@/components/ops/sankey';
import { Card, DemoBadge, Kpi, Segmented } from '@/components/ui';
import { fmt } from '@/lib/format';
import { getLang, tr } from '@/lib/lang';

export const metadata = { title: 'Διαλογή' };

type Plant = (typeof summary.plants)[number];
type MaterialId = keyof typeof summary.materials;

/** Business case from github.com/Mike17K/recycleiq-delta-sort BUSINESS_CASE.md (assumptions, not quotes). */
const BUSINESS = [
  { id: 'single', el: 'Μία γραμμή', en: 'Single line', layout: { el: '1 ταινία, 3 ρομπότ delta, 3 AMR', en: '1 belt, 3 delta robots, 3 AMRs' }, perMin: 80, missed: 0.08, capex: 382, net: 109, payback: 3.5 },
  { id: 'twin', el: 'Δύο γραμμές', en: 'Twin lines', layout: { el: '2 ταινίες, 12 ρομπότ delta, 5 AMR', en: '2 belts, 12 delta robots, 5 AMRs' }, perMin: 337, missed: 0.29, capex: 1163, net: 483, payback: 2.4 },
];

export default async function SortingPage({ searchParams }: PageProps<'/sorting'>) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  const plants = summary.plants as Plant[];
  const which = typeof sp.plant === 'string' && plants.some((p) => p.id === sp.plant) ? sp.plant : 'all';
  const shown = which === 'all' ? plants : plants.filter((p) => p.id === which);

  const label = (m: string) => summary.materials[m as MaterialId]?.label[lang] ?? m;
  const color = (m: string) => summary.materials[m as MaterialId]?.color ?? '#8a7560';
  const sum = (k: 'inputKg' | 'sortedKg' | 'residueKg' | 'items' | 'picked') => shown.reduce((s, p) => s + p[k], 0);
  const minutes = summary.simMinutes;
  const kgByMaterial = new Map<string, number>();
  for (const p of shown) for (const [m, kg] of Object.entries(p.materials)) if (m !== 'RESIDUE' && kg > 0) kgByMaterial.set(m, (kgByMaterial.get(m) ?? 0) + kg);
  const flows: SankeyFlow[] = shown.flatMap((p) =>
    p.flows.map((fl) => ({ material: fl.material, materialLabel: label(fl.material), color: color(fl.material), destination: fl.destination[lang], kg: fl.kg })),
  );
  const outbound = new Map<string, { kg: number; materials: Set<string> }>();
  for (const fl of flows) {
    const o = outbound.get(fl.destination) ?? { kg: 0, materials: new Set<string>() };
    o.kg += fl.kg;
    o.materials.add(fl.materialLabel);
    outbound.set(fl.destination, o);
  }
  const input = sum('inputKg');
  const sorted = sum('sortedKg');
  const residue = sum('residueKg');
  const pct = (v: number) => `${f.n(Math.round(v * 1000) / 10)}%`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('Λειτουργίες', 'Operations')}</p>
          <h1 className="mt-1 text-h1">{t('Διαλογή ανακυκλώσιμων', 'Sorting of recyclables')}</h1>
          <p className="mt-1 max-w-3xl text-body text-muted">
            {t(
              `RecycleIQ Delta Sort: ρομπότ delta ξεχωρίζουν τα υλικά στην ταινία. Τα νούμερα βγαίνουν από την ίδια προσομοίωση με το 3D demo (${minutes} λεπτά λειτουργίας ανά μονάδα, σταθερός σπόρος), με τυπικά βάρη ανά τεμάχιο.`,
              `RecycleIQ Delta Sort: delta robots sort materials on the belt. Numbers come from the same simulation as the 3D demo (${minutes} minutes of operation per plant, fixed seed), with typical weights per item.`,
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <DemoBadge>{t('Προσομοίωση: όχι πραγματικές μονάδες', 'Simulation: not real plants')}</DemoBadge>
          </div>
        </div>
        <Segmented
          label={t('Μονάδα', 'Plant')}
          value={which}
          options={[{ value: 'all', label: t('Όλες', 'All'), href: '/sorting' }, ...plants.map((p) => ({ value: p.id, label: p.name[lang], href: `/sorting?plant=${p.id}` }))]}
        />
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('Είσοδος', 'Input')} value={`${f.n(Math.round(input))} kg`} hint={t(`σε ${minutes} λεπτά`, `in ${minutes} min`)} />
        <Kpi label={t('Διαλογή', 'Sorted')} value={`${f.n(Math.round(sorted))} kg`} hint={t('προς ανακύκλωση', 'to recycling')} />
        <Kpi label={t('Ανάκτηση', 'Recovery')} value={input ? pct(sorted / input) : '—'} hint={t('διαλογή / είσοδος', 'sorted / input')} />
        <Kpi label={t('Υπόλειμμα', 'Residue')} value={input ? pct(residue / input) : '—'} hint={t('προς ΧΥΤΑ', 'to landfill')} />
        <Kpi label="kg/h" value={f.n(Math.round((sorted / minutes) * 60))} hint={t('ρυθμός διαλογής', 'sorting rate')} />
        <Kpi label={t('Τεμάχια/λεπτό', 'Items/min')} value={f.n(Math.round(sum('picked') / minutes))} hint={t(`από ${f.n(Math.round(sum('items') / minutes))} στην είσοδο`, `of ${f.n(Math.round(sum('items') / minutes))} arriving`)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title={t('Ροή υλικών', 'Material flow')} subtitle={t('Είσοδος → υλικά → τελικοί προορισμοί (kg)', 'Input → materials → final destinations (kg)')}>
          <Sankey flows={flows} inputLabel={t('Είσοδος', 'Input')} title={t('Διάγραμμα ροής υλικών', 'Material flow diagram')} />
        </Card>
        <Card title={t('Κιλά ανά υλικό', 'Kilograms per material')} subtitle={t('Μετά τη διαλογή', 'After sorting')}>
          <BarList
            rows={[...kgByMaterial.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([m, kg]) => ({ key: m, label: label(m), value: kg, display: `${f.n(Math.round(kg * 10) / 10)} kg`, color: color(m) }))}
          />
          <p className="mt-3 text-caption text-muted">{t('Καθαρότητα 100% εξ ορισμού: στην προσομοίωση ο τύπος κάθε αντικειμένου είναι γνωστός.', 'Purity is 100% by construction: in the simulation each item’s type is known.')}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t('Τελικοί προορισμοί', 'Final destinations')}>
          <table className="w-full text-left text-body">
            <thead className="text-caption text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">{t('Προορισμός', 'Destination')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Υλικά', 'Materials')}</th>
                <th className="py-2 text-right font-semibold">kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...outbound.entries()]
                .sort((a, b) => b[1].kg - a[1].kg)
                .map(([d, o]) => (
                  <tr key={d}>
                    <td className="py-2 pr-3 font-semibold">{d}</td>
                    <td className="py-2 pr-3 text-caption text-muted">{[...o.materials].join(', ')}</td>
                    <td className="num py-2 text-right">{f.n(Math.round(o.kg * 10) / 10)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
        <Card title={t('Μονάδες', 'Plants')}>
          <table className="w-full text-left text-body">
            <thead className="text-caption text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">{t('Μονάδα', 'Plant')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Γραμμές · ρομπότ', 'Lines · robots')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('τεμ./λεπτό', 'items/min')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Ανάκτηση', 'Recovery')}</th>
                <th className="py-2 text-right font-semibold">kg/h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plants.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3 font-semibold">{p.name[lang]}</td>
                  <td className="num py-2 pr-3">
                    {p.lines} · {p.robots}
                  </td>
                  <td className="num py-2 pr-3 text-right">{f.n(p.sortedPerMin)}</td>
                  <td className="num py-2 pr-3 text-right">{p.recovery != null ? pct(p.recovery) : '—'}</td>
                  <td className="num py-2 text-right">{f.n(Math.round(p.kgPerHour))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card
        title={t('Επιχειρηματικό σενάριο Delta Sort', 'Delta Sort business case')}
        subtitle={t('Εκτίμηση: κόστη και μισθοί είναι υποθέσεις, όχι προσφορές προμηθευτών.', 'Estimate: costs and wages are assumptions, not supplier quotes.')}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-body">
            <thead className="text-caption text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">{t('Σενάριο', 'Scenario')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Διάταξη', 'Layout')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Διαλογή/λεπτό', 'Sorted/min')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Χάνονται', 'Missed')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Επένδυση', 'Capex')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Καθαρή εξοικονόμηση/έτος', 'Net saving/year')}</th>
                <th className="py-2 text-right font-semibold">{t('Απόσβεση', 'Payback')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {BUSINESS.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 pr-3 font-semibold">{lang === 'el' ? b.el : b.en}</td>
                  <td className="py-2 pr-3 text-caption text-muted">{b.layout[lang]}</td>
                  <td className="num py-2 pr-3 text-right">{f.n(b.perMin)}</td>
                  <td className="num py-2 pr-3 text-right">{pct(b.missed)}</td>
                  <td className="num py-2 pr-3 text-right">€{f.n(b.capex)}k</td>
                  <td className="num py-2 pr-3 text-right">€{f.n(b.net)}k</td>
                  <td className="num py-2 text-right">
                    {b.payback.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {t('έτη', 'yrs')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-muted">
          {t(
            'Πηγή: BUSINESS_CASE.md του αποθετηρίου Delta Sort (προσομοίωση 10 λεπτών, 2 βάρδιες × 250 ημέρες, €15/ώρα). Δεν μετρούνται ενέργεια, χώρος, διακοπές λειτουργίας και αξία του ανακτημένου υλικού.',
            'Source: BUSINESS_CASE.md of the Delta Sort repository (10-minute simulation, 2 shifts × 250 days, €15/hour). Energy, space, downtime and the value of recovered material are not counted.',
          )}
        </p>
      </Card>
    </div>
  );
}

import { CATEGORIES, getObject, type CategoryId } from '@recycleiq/engine';
import { categoryColors } from '@recycleiq/tokens';
import { AthensMap } from '@/components/athens-map';
import { BarList } from '@/components/bar-list';
import { Badge, Card, CategoryLabel, DemoBadge, Segmented } from '@/components/ui';
import { getPoints } from '@/lib/data';
import { fmt } from '@/lib/format';
import { getLang, tr } from '@/lib/lang';
import { BIN_KINDS, getBinsByKind, getCategoryMix, getDistrictStats, getKpis, getObjectCategoryCounts, getTopItems } from '@/lib/queries';
import { CAR_KG_PER_KM, totalAvoidedKg } from '@recycleiq/engine';
import { RANGES, parseRange } from '@/lib/range';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Χάρτης' };

export default async function MapPage({ searchParams }: PageProps<'/map'>) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const districtId = typeof sp.district === 'string' ? sp.district : undefined;
  const showPoints = sp.points === '1';
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  const [districts, points] = await Promise.all([getDistrictStats(range), getPoints()]);
  const sel = districts.find((d) => d.id === districtId);
  const [kpis, mix, items, bins, impactRows] = sel
    ? await Promise.all([getKpis(range, sel.id), getCategoryMix(range, sel.id), getTopItems(range, sel.id), getBinsByKind(sel.id), getObjectCategoryCounts(range, sel.id)])
    : [null, [], [], [], []];
  const avoidedKg = totalAvoidedKg(impactRows);
  const service = { full: t('πλήρης κάλυψη', 'full coverage'), partial: t('μερική κάλυψη', 'partial coverage'), none: t('χωρίς κάλυψη', 'no coverage') };
  const q = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ range: String(range), ...(districtId ? { district: districtId } : {}), ...(showPoints ? { points: '1' } : {}) });
    for (const [k, v] of Object.entries(extra)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    return `/map?${p}`;
  };
  const shownPoints = showPoints ? points.filter((p) => !sel || p.districtId === sel.id) : [];
  const mixTotal = mix.reduce((s, m) => s + m.n, 0) || 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Athens Intelligence Map</p>
          <h1 className="mt-1 text-h1">{t('Ερωτήματα ανά συνοικία', 'Requests by district')}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <DemoBadge>{t('Συνθετικά δεδομένα επίδειξης', 'Synthetic demo data')}</DemoBadge>
            {showPoints && <DemoBadge>{t('Ενδεικτικά σημεία — όχι επίσημα δημοτικά δεδομένα', 'Illustrative points — not official data')}</DemoBadge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label={t('Σημεία', 'Points')}
            value={showPoints ? '1' : '0'}
            options={[
              { value: '0', label: t('Μόνο συνοικίες', 'Districts only'), href: q({ points: undefined }) },
              { value: '1', label: t('Με σημεία', 'With points'), href: q({ points: '1' }) },
            ]}
          />
          <Segmented
            label={t('Χρονικό διάστημα', 'Date range')}
            value={String(range)}
            options={RANGES.map((r) => ({ value: String(r), label: t(`${r} ημ.`, `${r} d`), href: q({ range: String(r) }) }))}
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <AthensMap
            districts={districts.map((d) => ({
              id: d.id,
              name: t(d.name),
              path: d.svgPath,
              value: d.requests,
              valueLabel: t(`${f.n(d.requests)} ερωτήματα`, `${f.n(d.requests)} requests`),
              detail: t(`Καφέ κάδος: ${service[d.organicService]}`, `Brown bin: ${service[d.organicService]}`),
              href: q({ district: d.id }),
            }))}
            points={shownPoints.map((p) => {
              const cat = (p.categories[0] ?? 'general') as CategoryId;
              return { id: p.id, lat: p.lat, lng: p.lng, color: categoryColors[cat].solid, name: t(p.name) };
            })}
            selected={sel?.id}
            legend={{ title: t('Χάρτης ερωτημάτων ανά συνοικία', 'Map of requests by district'), low: t('Λιγότερα', 'Fewer'), high: t('Περισσότερα ερωτήματα', 'More requests') }}
          />
          {showPoints && (
            <div className="mt-3 flex flex-wrap gap-4 text-caption text-muted">
              {(Object.keys(CATEGORIES) as CategoryId[]).map((c) => (
                <CategoryLabel key={c} category={c} label={t(CATEGORIES[c].short)} />
              ))}
            </div>
          )}
        </Card>

        {sel && kpis ? (
          <Card
            title={t(sel.name)}
            subtitle={t(`${f.n(sel.points)} σημεία συλλογής · καφέ κάδος: ${service[sel.organicService]}`, `${f.n(sel.points)} collection points · brown bin: ${service[sel.organicService]}`)}
            action={<a href={q({ district: undefined })} className="text-caption font-semibold text-forest-700 hover:underline">{t('Όλη η πόλη', 'Whole city')}</a>}
          >
            <dl className="mb-5 grid grid-cols-2 gap-3">
              {[
                [t('Ερωτήματα', 'Requests'), f.n(kpis.requests)],
                [t('Μέση βεβαιότητα', 'Avg confidence'), f.pct(kpis.avgConfidence)],
                [t('Με διευκρίνιση', 'Clarified'), f.pct(kpis.clarificationRate)],
                [t('Αιτήματα καφέ κάδου', 'Brown-bin requests'), f.n(kpis.brownBinRequests)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-control bg-surface-2 p-3">
                  <dt className="text-caption text-muted">{k}</dt>
                  <dd className="num mt-1 text-[20px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mb-5 rounded-control bg-forest-50 p-3">
              <p className="text-caption text-forest-700">{t('Τι κερδίζει το περιβάλλον (εκτίμηση)', 'What the environment gains (estimate)')}</p>
              <p className="num mt-1 text-[22px] font-bold text-forest-700">
                {f.n(Math.round(avoidedKg))} kg CO₂e · {f.n(Math.round(avoidedKg / CAR_KG_PER_KM))} {t('χλμ. αυτοκινήτου', 'car km')}
              </p>
            </div>
            <h3 className="mb-2 text-h3">{t('Κάδοι και σημεία στη γειτονιά', 'Bins and points in the area')}</h3>
            <ul className="mb-5 text-body">
              {bins.map((b) => (
                <li key={b.kind} className="flex items-center justify-between border-t border-line py-1.5 first:border-0">
                  <CategoryLabel category={BIN_KINDS[b.kind].category} label={t(BIN_KINDS[b.kind].el, BIN_KINDS[b.kind].en)} />
                  <span className="num text-muted">
                    {f.n(b.n)}
                    {b.issues > 0 && <span className="ml-2 text-warn">{t(`${b.issues} με πρόβλημα`, `${b.issues} with issues`)}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <a href={`/points/qr?district=${sel.id}`} className="mb-5 inline-block text-caption font-semibold text-forest-700 hover:underline">
              {t('QR αυτοκόλλητα για αυτούς τους κάδους', 'QR stickers for these bins')} →
            </a>
            <h3 className="mb-3 text-h3">{t('Τι σκανάρουν εδώ', 'What people scan here')}</h3>
            <BarList
              rows={mix.map((m) => ({
                key: m.category,
                label: <CategoryLabel category={m.category} label={t(CATEGORIES[m.category].short)} />,
                value: m.n,
                display: f.pct(m.n / mixTotal),
                color: categoryColors[m.category].solid,
              }))}
            />
            <h3 className="mt-5 mb-2 text-h3">{t('Συχνότερα αντικείμενα', 'Most asked items')}</h3>
            <ul className="text-body">
              {items.slice(0, 5).map((i) => (
                <li key={i.objectId} className="flex justify-between border-t border-line py-1.5">
                  <span>{getObject(i.objectId) ? t(getObject(i.objectId)!.name) : i.objectId}</span>
                  <span className="num text-muted">{f.n(i.n)}</span>
                </li>
              ))}
            </ul>
            {sel.organicService !== 'full' && (
              <p className="mt-4 rounded-control bg-warn-soft p-3 text-body text-warn">
                {t(
                  `${f.n(sel.brownBinRequests)} κάτοικοι ζήτησαν καφέ κάδο τις τελευταίες ${range} ημέρες.`,
                  `${f.n(sel.brownBinRequests)} residents asked for a brown bin in the last ${range} days.`,
                )}
              </p>
            )}
          </Card>
        ) : (
          <Card title={t('Συνοικίες', 'Districts')} subtitle={t('Πάτησε μια συνοικία στον χάρτη', 'Click a district on the map')}>
            <ol className="max-h-[640px] overflow-auto text-body">
              {districts.map((d, i) => (
                <li key={d.id} className="border-t border-line first:border-0">
                  <a href={q({ district: d.id })} className="flex items-center gap-3 py-2 hover:bg-surface-2">
                    <span className="num w-6 text-caption text-muted">{i + 1}</span>
                    <span className="flex-1">{t(d.name)}</span>
                    {d.organicService === 'none' && <Badge>{t('χωρίς καφέ', 'no brown bin')}</Badge>}
                    <span className="num text-muted">{f.n(d.requests)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}

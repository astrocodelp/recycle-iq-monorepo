import { CAR_KG_PER_KM, IMPACT_SOURCE, getObject, itemGrams, totalAvoidedKg, type CategoryId } from '@recycleiq/engine';
import { Leaf } from 'lucide-react';
import { BarList } from './bar-list';
import { Card } from './ui';

const RECYCLED_IN: Record<string, CategoryId> = {
  'plastic-bottle': 'packaging',
  'glass-bottle': 'packaging',
  'pizza-box': 'packaging',
  'food-scraps': 'organic',
};

/**
 * Estimated CO2e avoided if what residents scanned was recycled as advised.
 * App use is not verified recycling, so this is a potential, labelled as an estimate with its source.
 */
export function ImpactCard({
  rows,
  t,
  n,
  title,
}: {
  rows: { objectId: string; category: CategoryId; n: number }[];
  t: (el: string, en?: string) => string;
  n: (v: number) => string;
  title?: string;
}) {
  const kg = totalAvoidedKg(rows);
  const km = kg / CAR_KG_PER_KM;
  const byItem = rows
    .filter((r) => RECYCLED_IN[r.objectId] === r.category)
    .map((r) => ({ id: r.objectId, kg: (r.n * (itemGrams(r.objectId) ?? 0)) / 1000, n: r.n }))
    .filter((r) => r.kg > 0)
    .sort((a, b) => b.kg - a.kg);
  const lang = t('el', 'en') as 'el' | 'en';
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Leaf size={18} className="text-forest-700" aria-hidden /> {title ?? t('Τι κερδίζει το περιβάλλον', 'What the environment gains')}
        </span>
      }
      subtitle={t('Εκτίμηση, αν ανακυκλώθηκαν σωστά όσα σκανάρισαν οι κάτοικοι', 'Estimate, if what residents scanned was recycled as advised')}
    >
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="num text-[32px] leading-none font-bold text-forest-700">{n(Math.round(kg))} kg</p>
          <p className="mt-1 text-caption text-muted">{t('CO₂e που αποφεύγονται', 'CO₂e avoided')}</p>
        </div>
        <div>
          <p className="num text-[24px] leading-none font-bold text-ink">{n(Math.round(km))} {t('χλμ.', 'km')}</p>
          <p className="mt-1 text-caption text-muted">{t('σαν ένα αυτοκίνητο που δεν κινήθηκε', 'of car driving avoided')}</p>
        </div>
      </div>
      <BarList
        rows={byItem.map((r) => ({
          key: r.id,
          label: getObject(r.id)?.name[lang] ?? r.id,
          value: r.kg,
          display: `${n(Math.round(r.kg))} kg · ${n(r.n)} ${t('σαρώσεις', 'scans')}`,
        }))}
      />
      <p className="mt-4 text-[11px] text-muted">
        {t('Πηγή:', 'Source:')}{' '}
        <a href={IMPACT_SOURCE.url} className="underline">
          {IMPACT_SOURCE.name}
        </a>
        {t(
          '. Τυπικά βάρη αντικειμένων: μπουκάλι PET 25 γρ., γυάλινο 350 γρ., κουτί πίτσας 200 γρ., υπολείμματα 0,5 κιλό. Η χρήση της εφαρμογής δεν αποδεικνύει ανακύκλωση.',
          '. Typical item weights: PET bottle 25 g, glass bottle 350 g, pizza box 200 g, food scraps 0.5 kg. Using the app does not prove recycling.',
        )}
      </p>
    </Card>
  );
}

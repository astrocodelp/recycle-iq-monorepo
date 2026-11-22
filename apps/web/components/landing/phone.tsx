import { Container, Info, Leaf, MapPin, Milk, Sofa } from 'lucide-react';
import type { ComponentType, CSSProperties } from 'react';
import type { T } from './ui';

type Screen = {
  color: string;
  bin: string;
  headline: string;
  item: string;
  ItemIcon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  BinIcon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  why: string;
  where: string;
};

/**
 * Illustrative result screen, drawn after the app's own result screen (coloured verdict, "Why?", nearest point).
 * Three answers cycle with CSS only; with reduced motion the first one stays. Decorative: the hero text says it all.
 */
export function HeroPhone({ t }: { t: T }) {
  const screens: Screen[] = [
    {
      color: 'var(--color-cat-packaging)',
      bin: t('Μπλε κάδος', 'Blue bin'),
      headline: t('Ανακυκλώνεται', 'Recyclable'),
      item: t('Πλαστικό μπουκάλι', 'Plastic bottle'),
      ItemIcon: Milk,
      BinIcon: Container,
      why: t('Άδειες συσκευασίες πάνε στον μπλε κάδο. Χύμα, όχι σε δεμένη σακούλα.', 'Empty packaging goes in the blue bin. Loose, not in a tied bag.'),
      where: t('Μπλε κάδος · 3 λεπτά με τα πόδια', 'Blue bin · 3 min walk'),
    },
    {
      color: 'var(--color-cat-organic)',
      bin: t('Καφέ κάδος', 'Brown bin'),
      headline: t('Γίνεται κομπόστ', 'Becomes compost'),
      item: t('Υπολείμματα φαγητού', 'Food scraps'),
      ItemIcon: Leaf,
      BinIcon: Leaf,
      why: t('Στις γειτονιές με καφέ κάδο, τα υπολείμματα τροφών γίνονται κομπόστ.', 'Where there is a brown bin, food scraps become compost.'),
      where: t('Καφέ κάδος · 5 λεπτά με τα πόδια', 'Brown bin · 5 min walk'),
    },
    {
      color: 'var(--color-cat-bulky)',
      bin: t('Ογκώδη', 'Bulky waste'),
      headline: t('Κλείσε ραντεβού', 'Book a pickup'),
      item: t('Καναπές', 'Sofa'),
      ItemIcon: Sofa,
      BinIcon: Sofa,
      why: t('Τα έπιπλα τα παίρνει ο Δήμος με ραντεβού. Μην τα αφήνεις στο πεζοδρόμιο.', 'The city collects furniture by appointment. Don’t leave it on the pavement.'),
      where: t('Ζήτα παραλαβή από τον Δήμο', 'Ask the city for a pickup'),
    },
  ];

  return (
    <figure className="lp-phone-wrap relative mx-auto w-[min(100%,300px)]" aria-hidden>
      <div className="lp-glow" />
      <div className="relative rounded-phone bg-canvas p-[9px] shadow-pop ring-1 ring-black/5">
        <div className="relative aspect-[300/620] overflow-hidden rounded-[46px] bg-paper">
          {screens.map((s, i) => (
            <div key={s.item} className={`lp-screen lp-screen-${i} absolute inset-0 flex flex-col`}>
              <div className="flex flex-col gap-3 px-4 pt-10 pb-5" style={{ background: s.color, borderRadius: '0 0 30px 30px' }}>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="grid size-16 place-items-center rounded-[20px] bg-white">
                    <s.BinIcon size={30} style={{ color: s.color }} />
                  </div>
                  <p className="mt-1 text-[9.5px] font-bold tracking-[0.14em] text-white/80 uppercase">{t('Προορισμός', 'Destination')}</p>
                  <p className="text-[26px] leading-none font-extrabold tracking-[-0.03em] text-white">{s.bin}</p>
                  <p className="text-[13px] font-medium text-white/90">{s.headline}</p>
                </div>
                <div className="flex items-center gap-2.5 rounded-[14px] bg-white/15 p-2.5 ring-1 ring-white/25">
                  <div className="grid size-9 place-items-center rounded-[10px] bg-white">
                    <s.ItemIcon size={18} className="text-ink" />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[13px] font-bold text-white">{s.item}</p>
                    <p className="text-[11px] font-semibold text-white/85">{t('Υψηλή βεβαιότητα', 'High certainty')}</p>
                  </div>
                  <div className="grid size-9 place-items-center rounded-full text-[10px] font-bold text-white ring-[3px] ring-white/80">
                    94
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 p-3.5">
                <div className="rounded-[14px] bg-surface p-3 ring-1 ring-line">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                    <Info size={14} className="text-cat-packaging" />
                    {t('Γιατί;', 'Why?')}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug font-medium text-ink/85">{s.why}</p>
                </div>
                <div className="flex items-center gap-2.5 rounded-[14px] bg-forest-50 p-3 ring-1 ring-forest-100">
                  <MapPin size={16} className="shrink-0 text-forest-700" />
                  <p className="text-[12px] leading-snug font-semibold text-forest-800">{s.where}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="absolute top-2.5 left-1/2 h-[22px] w-[84px] -translate-x-1/2 rounded-pill bg-canvas" />
        </div>
      </div>
    </figure>
  );
}

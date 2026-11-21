import { formatCompact, formatNumber, formatPercent, type Lang } from '@recycleiq/engine';

export const fmt = (lang: Lang) => ({
  n: (v: number) => formatNumber(v, lang),
  compact: (v: number) => formatCompact(v, lang),
  pct: (v: number, digits = 0) => formatPercent(v, lang, digits),
  locale: lang === 'el' ? 'el-GR' : 'en-GB',
  ago: (d: Date) => {
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return lang === 'el' ? 'τώρα' : 'now';
    if (mins < 60) return lang === 'el' ? `πριν ${mins}′` : `${mins} min ago`;
    const h = Math.round(mins / 60);
    if (h < 48) return lang === 'el' ? `πριν ${h} ώρ.` : `${h} h ago`;
    return lang === 'el' ? `πριν ${Math.round(h / 24)} ημ.` : `${Math.round(h / 24)} d ago`;
  },
});

/** Whole days since a date (server render time). */
export const daysSince = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

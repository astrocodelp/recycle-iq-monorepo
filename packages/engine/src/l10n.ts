import type { L10n, Lang } from './types';

/** Build a bilingual string. Greek first. */
export const te = (el: string, en: string): L10n => ({ el, en });

export const pick = (s: L10n, lang: Lang): string => s[lang];

const locale = (lang: Lang) => (lang === 'el' ? 'el-GR' : 'en-GB');

/** Greek number formatting: decimal comma, thousands dot. */
export function formatNumber(n: number, lang: Lang = 'el', digits = 0): string {
  return new Intl.NumberFormat(locale(lang), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

/** 48200 -> "48,2K". */
export function formatCompact(n: number, lang: Lang = 'el'): string {
  if (Math.abs(n) < 1000) return formatNumber(n, lang);
  const k = n / 1000;
  return `${formatNumber(k, lang, k >= 100 ? 0 : 1)}K`;
}

export function formatPercent(ratio: number, lang: Lang = 'el', digits = 0): string {
  return `${formatNumber(ratio * 100, lang, digits)}%`;
}

export function formatDistance(metres: number, lang: Lang = 'el'): string {
  return metres < 950
    ? `${formatNumber(Math.round(metres / 10) * 10, lang)} ${lang === 'el' ? 'μ.' : 'm'}`
    : `${formatNumber(metres / 1000, lang, 1)} ${lang === 'el' ? 'χλμ.' : 'km'}`;
}

/** Walking minutes at ~80 m/min. */
export const walkingMinutes = (metres: number) => Math.max(1, Math.round(metres / 80));

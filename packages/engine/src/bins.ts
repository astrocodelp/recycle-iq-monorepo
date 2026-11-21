// Bin types and their colours, set per municipality from the dashboard (Rules → Bins).
// The engine writes its advice with the Athens defaults; applyBins swaps in the configured name and colour
// so another municipality (or Athens changing a colour) needs no code change.
import { DESTINATIONS } from './categories';
import type { Decision, L10n } from './types';

export type BinKey = keyof typeof DESTINATIONS;

export interface BinStyle {
  key: BinKey;
  /** What residents call it, e.g. «Μπλε κάδος». */
  name: L10n;
  /** Hex colour shown in the app and on the dashboard. */
  color: string;
}

export const DEFAULT_BINS: Record<BinKey, BinStyle> = {
  blue: { key: 'blue', name: DESTINATIONS.blue, color: '#2563EB' },
  glass: { key: 'glass', name: DESTINATIONS.glass, color: '#0E7490' },
  brown: { key: 'brown', name: DESTINATIONS.brown, color: '#8A5A2B' },
  textiles: { key: 'textiles', name: DESTINATIONS.textiles, color: '#7C3AED' },
  general: { key: 'general', name: DESTINATIONS.general, color: '#4D6B57' },
  battery: { key: 'battery', name: DESTINATIONS.battery, color: '#E0772A' },
  weee: { key: 'weee', name: DESTINATIONS.weee, color: '#E0772A' },
  bulky: { key: 'bulky', name: DESTINATIONS.bulky, color: '#6D5BD0' },
};

/** In the order the dashboard lists them. */
export const BIN_KEYS = Object.keys(DEFAULT_BINS) as BinKey[];

export const isBinKey = (k: string): k is BinKey => (BIN_KEYS as string[]).includes(k);
export const isHexColor = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);

/** Defaults with the configured rows on top. */
export function mergeBins(rows: readonly Partial<BinStyle>[] = []): Record<BinKey, BinStyle> {
  const out = { ...DEFAULT_BINS };
  for (const r of rows) {
    if (!r.key || !isBinKey(r.key)) continue;
    const d = DEFAULT_BINS[r.key];
    out[r.key] = {
      key: r.key,
      name: { el: r.name?.el?.trim() || d.name.el, en: r.name?.en?.trim() || d.name.en },
      color: r.color && isHexColor(r.color) ? r.color : d.color,
    };
  }
  return out;
}

/** Which bin a decision's destination is. */
export function binKeyOf(destination: L10n): BinKey | null {
  return BIN_KEYS.find((k) => DESTINATIONS[k].en === destination.en) ?? null;
}

/** Colour words used in the default advice, per bin, and how to find them in a sentence. */
// Greek: the second group is the ending of the «κάδος» that follows, used to inflect a new colour word.
const BIN_NOUN = '(?=\\s+κάδ(ος|ου|ο)(?!\\p{L})|)';
const el = (stem: string) => new RegExp(`(?<!\\p{L})([${stem[0]!.toUpperCase()}${stem[0]}])${stem.slice(1)}(?!\\p{L})${BIN_NOUN}`, 'gu');
const COLOR_WORDS: Partial<Record<BinKey, { el: RegExp; en: RegExp }>> = {
  blue: { el: el('μπλε'), en: /\b([Bb])lue\b/g },
  brown: { el: el('καφέ'), en: /\b([Bb])rown\b/g },
  general: { el: el('πράσιν(?:ος|ου|ο)'), en: /\b([Gg])reen\b/g },
  textiles: { el: el('μωβ'), en: /\b([Pp])urple\b/g },
};
/** κίτρινος + «κάδο» → κίτρινο; indeclinable words (μπλε, μωβ, γκρι) stay as they are. */
const inflect = (word: string, nounEnding?: string) =>
  nounEnding && /ος$/.test(word) ? word.slice(0, -2) + nounEnding : word;
const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? '';
const matchCase = (word: string, upper: boolean) => (upper ? word.charAt(0).toUpperCase() : word.charAt(0).toLowerCase()) + word.slice(1);

/** Swap default bin names and colour words in a decision for the configured ones. */
export function applyBins(decision: Decision, bins: Record<BinKey, BinStyle>): Decision & { bin?: { key: BinKey; color: string } } {
  const swaps: { re: RegExp; word: string; lang: 'el' | 'en' }[] = [];
  for (const key of BIN_KEYS) {
    const words = COLOR_WORDS[key];
    const conf = bins[key];
    if (!words || !conf) continue;
    for (const lang of ['el', 'en'] as const) {
      const now = firstWord(conf.name[lang]);
      if (now && now.toLowerCase() !== firstWord(DEFAULT_BINS[key].name[lang]).toLowerCase()) swaps.push({ re: words[lang], word: now, lang });
    }
  }
  const fix = (t: L10n): L10n => {
    if (!swaps.length) return t;
    const out = { ...t };
    for (const s of swaps)
      out[s.lang] = out[s.lang].replace(s.re, (_m, first: string, ending?: string) =>
        matchCase(inflect(s.word, ending), first === first.toUpperCase()),
      );
    return out;
  };
  const key = binKeyOf(decision.destination);
  return {
    ...decision,
    destination: key ? bins[key].name : decision.destination,
    headline: fix(decision.headline),
    why: fix(decision.why),
    prep: decision.prep.map(fix),
    warnings: decision.warnings.map(fix),
    notes: decision.notes.map(fix),
    alternatives: decision.alternatives ? fix(decision.alternatives) : undefined,
    ...(key ? { bin: { key, color: bins[key].color } } : {}),
  };
}

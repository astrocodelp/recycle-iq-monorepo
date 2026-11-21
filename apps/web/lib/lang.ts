import type { L10n, Lang } from '@recycleiq/engine';
import { cookies } from 'next/headers';

export const LANG_COOKIE = 'riq_lang';

/** Greek first; English mirrors all chrome. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return c === 'en' ? 'en' : 'el';
}

/** Pick a bilingual string, or build one inline: tr(lang)('Ελληνικά', 'English'). */
export const tr =
  (lang: Lang) =>
  (el: string | L10n, en?: string): string =>
    typeof el === 'string' ? (lang === 'el' ? el : (en ?? el)) : el[lang];

import type { Lang } from './types';

/** Scans that count towards the leaderboard per person per day (stops endless re-scanning). */
export const DAILY_SCAN_CAP = 20;

export type LeaderboardPeriod = 'week' | 'month';
export const PERIOD_DAYS: Record<LeaderboardPeriod, number> = { week: 7, month: 30 };

// Nicknames: no account, no real names. Greek adjectives agree with the noun's gender.
const ANIMALS: { el: string; en: string; g: 'm' | 'f' | 'n' }[] = [
  { el: 'Χελώνα', en: 'Turtle', g: 'f' },
  { el: 'Αλεπού', en: 'Fox', g: 'f' },
  { el: 'Κουκουβάγια', en: 'Owl', g: 'f' },
  { el: 'Μέλισσα', en: 'Bee', g: 'f' },
  { el: 'Πεταλούδα', en: 'Butterfly', g: 'f' },
  { el: 'Γάτα', en: 'Cat', g: 'f' },
  { el: 'Δελφίνι', en: 'Dolphin', g: 'n' },
  { el: 'Σπουργίτι', en: 'Sparrow', g: 'n' },
  { el: 'Ελάφι', en: 'Deer', g: 'n' },
  { el: 'Χελιδόνι', en: 'Swallow', g: 'n' },
  { el: 'Σκαντζόχοιρος', en: 'Hedgehog', g: 'm' },
  { el: 'Γλάρος', en: 'Gull', g: 'm' },
  { el: 'Λαγός', en: 'Hare', g: 'm' },
  { el: 'Σκίουρος', en: 'Squirrel', g: 'm' },
];
const ADJECTIVES: { m: string; f: string; n: string; en: string }[] = [
  { m: 'Πράσινος', f: 'Πράσινη', n: 'Πράσινο', en: 'Green' },
  { m: 'Γρήγορος', f: 'Γρήγορη', n: 'Γρήγορο', en: 'Swift' },
  { m: 'Σοφός', f: 'Σοφή', n: 'Σοφό', en: 'Wise' },
  { m: 'Χαρούμενος', f: 'Χαρούμενη', n: 'Χαρούμενο', en: 'Happy' },
  { m: 'Γενναίος', f: 'Γενναία', n: 'Γενναίο', en: 'Brave' },
  { m: 'Ήσυχος', f: 'Ήσυχη', n: 'Ήσυχο', en: 'Calm' },
  { m: 'Λαμπερός', f: 'Λαμπερή', n: 'Λαμπερό', en: 'Bright' },
  { m: 'Μικρός', f: 'Μικρή', n: 'Μικρό', en: 'Little' },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A stable, friendly nickname for an anonymous install id, e.g. "Πράσινη Χελώνα 42". */
export function defaultNickname(deviceId: string, lang: Lang = 'el'): string {
  const h = hash(deviceId);
  const animal = ANIMALS[h % ANIMALS.length]!;
  const adj = ADJECTIVES[Math.floor(h / ANIMALS.length) % ADJECTIVES.length]!;
  const n = 10 + (Math.floor(h / (ANIMALS.length * ADJECTIVES.length)) % 90);
  return lang === 'el' ? `${adj[animal.g]} ${animal.el} ${n}` : `${adj.en} ${animal.en} ${n}`;
}

/** Custom nicknames: 2–24 letters, digits, spaces, dots, dashes or underscores. */
export const NICKNAME_PATTERN = /^[\p{L}\p{N} ._-]{2,24}$/u;
export const isValidNickname = (s: string) => NICKNAME_PATTERN.test(s.trim());

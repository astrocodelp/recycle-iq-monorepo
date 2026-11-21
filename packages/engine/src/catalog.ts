import objectsJson from './data/objects.json' with { type: 'json' };
import type { CatalogObject } from './types';

/** The object catalog from the prototype. `unknown` is the low-confidence fallback. */
export const CATALOG: readonly CatalogObject[] = objectsJson as CatalogObject[];

const byId = new Map(CATALOG.map((o) => [o.id, o]));

export const getObject = (id: string): CatalogObject | undefined => byId.get(id);

/** Every object a resident can pick (excludes `unknown`). */
export const PICKABLE_OBJECTS = CATALOG.filter((o) => o.id !== 'unknown');

/** Lowercase, final sigma to sigma, strip accents and punctuation. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchHit {
  object: CatalogObject;
  score: number;
}

/** Fuzzy alias search in Greek and English, accent-insensitive. */
export function searchObjects(query: string): SearchHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const words = q.split(' ').filter((w) => w.length > 1);
  return PICKABLE_OBJECTS.map((object) => {
    let score = 0;
    const names = [...object.aliases, object.name.el, object.name.en].map(normalize);
    for (const name of names) {
      if (name === q) score = Math.max(score, 100);
      else if (name.includes(q)) score = Math.max(score, 80 - Math.min(20, name.length - q.length));
      else if (q.includes(name) && name.length > 2)
        score = Math.max(score, 70 - Math.min(20, q.length - name.length));
      else {
        const matched = words.filter((w) =>
          name.split(' ').some((part) => part.startsWith(w) || (w.length > 3 && part.includes(w))),
        ).length;
        if (matched) score = Math.max(score, 30 + (matched / words.length) * 30);
      }
    }
    return { object, score };
  })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
}

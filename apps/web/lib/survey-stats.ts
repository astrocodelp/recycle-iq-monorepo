import 'server-only';
import { getDb, surveyResponses } from '@recycleiq/db';
import { unstable_cache } from 'next/cache';
import { ALL_QUESTIONS, type Answers } from '@/lib/survey';

/**
 * Three headline results of the resident survey (/feedback), computed live from the stored answers so the
 * landing page can never drift from /survey. Shown only from MIN_RESPONSES answers on: a handful of replies
 * is not a result. Shares are of the people who answered that question, and the page always shows the counts.
 */
export const MIN_RESPONSES = 10;

// Exact option texts from lib/survey.ts. If one is renamed there, that result is left out (see `has`).
const BARRIER = 'Δεν ξέρω τι πάει πού';
const SIMPLE = 'Πολύ απλά ελληνικά, με εικόνες';
const TREES = 'Ο Δήμος φυτεύει δέντρα στη γειτονιά μου';
const STRONG = ['Πολύ', 'Πάρα πολύ'];

export interface Share {
  k: number;
  of: number;
}
export interface SurveyHighlights {
  n: number;
  unknown: Share | null;
  simple: Share | null;
  trees: Share | null;
}

const has = (qid: string, option: string) => {
  const q = ALL_QUESTIONS.find((x) => x.id === qid);
  if (!q) return false;
  return q.type === 'grid' ? q.rows.includes(option) : 'options' in q && q.options.includes(option);
};

async function compute(): Promise<SurveyHighlights | null> {
  try {
    const rows = await getDb().select({ answers: surveyResponses.answers }).from(surveyResponses).limit(5000);
    const all = rows.map((r) => r.answers as Answers);
    const multi = (qid: string, option: string): Share | null => {
      if (!has(qid, option)) return null;
      const answered = all.filter((a) => Array.isArray(a[qid]));
      return { k: answered.filter((a) => (a[qid] as string[]).includes(option)).length, of: answered.length };
    };
    const trees = (): Share | null => {
      if (!has('motivators', TREES)) return null;
      const answered = all.map((a) => a.motivators).filter((g): g is Record<string, string> => !!g && typeof g === 'object' && !Array.isArray(g) && TREES in g);
      return { k: answered.filter((g) => STRONG.includes(g[TREES]!)).length, of: answered.length };
    };
    return { n: all.length, unknown: multi('barriers', BARRIER), simple: multi('helps', SIMPLE), trees: trees() };
  } catch {
    return null;
  }
}

/** Cached for 10 minutes: the landing page is public and must not hit the database on every view. */
const cached = unstable_cache(compute, ['survey-highlights'], { revalidate: 600 });

/** The highlights, or null when the database is unavailable or there are too few answers. */
export async function getSurveyHighlights(): Promise<SurveyHighlights | null> {
  const s = await cached();
  return s && s.n >= MIN_RESPONSES ? s : null;
}

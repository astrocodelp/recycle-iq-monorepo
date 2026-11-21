import data from './data/stories.json';
import type { L10n } from './types';

/** Scans in your neighbourhood needed to unlock each story, in order. The first is "your neighbourhood in numbers". */
export const STORY_THRESHOLDS = [1, 5, 15, 30, 50] as const;

export interface Story {
  id: string;
  kind: 'numbers' | 'history' | 'landmark' | 'event';
  title: L10n;
  body: L10n;
  year?: number;
}

const STORIES = (data as { stories: Record<string, Story[]> }).stories;

/** The written stories of a district (draft content, verified by the municipality before launch). */
export const districtStories = (districtId: string): Story[] => STORIES[districtId] ?? [];

/** Threshold for the story at `index` (0 = the numbers card). */
export const storyThreshold = (index: number) => STORY_THRESHOLDS[Math.min(index, STORY_THRESHOLDS.length - 1)]!;

/** If reaching `scans` unlocks a story in a district with `storyCount` stories (numbers card included), its index. */
export function unlockedAt(scans: number, storyCount: number): number | null {
  const i = STORY_THRESHOLDS.indexOf(scans as (typeof STORY_THRESHOLDS)[number]);
  return i >= 0 && i < storyCount ? i : null;
}

/** Index of the next story still locked, or null when all are open. */
export function nextLocked(scans: number, storyCount: number): number | null {
  for (let i = 0; i < storyCount; i++) if (scans < storyThreshold(i)) return i;
  return null;
}

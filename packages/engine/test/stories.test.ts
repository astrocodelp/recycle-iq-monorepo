import { describe, expect, it } from 'vitest';
import districts from '../../db/seed/districts.json';
import { districtStories, nextLocked, unlockedAt } from '../src';

describe('neighbourhood stories', () => {
  it('only uses real district ids and bilingual text', () => {
    const ids = new Set((districts as { id: string }[]).map((d) => d.id));
    for (const id of ['monastiraki-plaka', 'exarchia', 'stadio', 'koukaki', 'kypseli']) {
      expect(ids.has(id)).toBe(true);
      for (const s of districtStories(id)) {
        expect(s.title.el && s.title.en && s.body.el && s.body.en).toBeTruthy();
      }
    }
    expect(districtStories('nowhere')).toEqual([]);
  });
  it('unlocks at the thresholds, never past the stories that exist', () => {
    expect(unlockedAt(1, 1)).toBe(0);
    expect(unlockedAt(5, 3)).toBe(1);
    expect(unlockedAt(5, 1)).toBeNull();
    expect(unlockedAt(7, 4)).toBeNull();
    expect(nextLocked(0, 3)).toBe(0);
    expect(nextLocked(6, 3)).toBe(2);
    expect(nextLocked(20, 3)).toBeNull();
  });
});

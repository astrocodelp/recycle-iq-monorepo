import { describe, expect, it } from 'vitest';
import { AVOIDED_KG_PER_KG, impactFor, itemGrams, totalAvoidedKg } from '../src';

describe('environmental impact (DESNZ 2025 factors)', () => {
  it('derives per-kg factors from the official tables', () => {
    expect(AVOIDED_KG_PER_KG.pet).toBeCloseTo(1.654, 3);
    expect(AVOIDED_KG_PER_KG.glass).toBeCloseTo(0.584, 3);
    expect(AVOIDED_KG_PER_KG.foodCompost).toBeCloseTo(0.691, 3);
  });
  it('gives a figure only when the item really goes to recycling', () => {
    expect(itemGrams('plastic-bottle')).toBeCloseTo(41.4, 0);
    const ok = impactFor('plastic-bottle', 'packaging');
    expect(ok).toMatchObject({ counts: true, grams: 41 });
    expect(ok.headline.el).toContain('41');
    expect(impactFor('pizza-box', 'general').counts).toBe(false);
    expect(impactFor('battery', 'special').grams).toBeNull();
    expect(impactFor('unknown', 'general', true).counts).toBe(false);
  });
  it('sums only recycled decisions', () => {
    const kg = totalAvoidedKg([
      { objectId: 'plastic-bottle', category: 'packaging', n: 100 },
      { objectId: 'pizza-box', category: 'general', n: 50 },
    ]);
    expect(kg).toBeCloseTo(4.14, 1);
  });
});

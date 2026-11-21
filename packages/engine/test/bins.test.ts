import { describe, expect, it } from 'vitest';
import { applyBins, DEFAULT_RULES, evaluate, mergeBins } from '../src';
import type { DistrictContext } from '../src';

const district = { id: 'koukaki', organicService: 'full' } as DistrictContext;
const rules = DEFAULT_RULES.map((r) => ({ code: r.code, enabled: true }));
const decide = (objectId: string) => evaluate({ objectId, answers: {} }, { district, rules });

describe('configurable bins', () => {
  it('keeps the Athens defaults when nothing is configured', () => {
    const d = applyBins(decide('can'), mergeBins());
    expect(d.destination.el).toBe('Μπλε κάδος');
    expect(d.headline.el).toContain('μπλε κάδο');
    expect(d.bin).toEqual({ key: 'blue', color: '#2563EB' });
  });

  it('renames the bin and its colour word everywhere, keeping case', () => {
    const bins = mergeBins([{ key: 'blue', name: { el: 'Κίτρινος κάδος', en: 'Yellow bin' }, color: '#EAB308' }]);
    const d = applyBins(decide('can'), bins);
    expect(d.destination).toEqual({ el: 'Κίτρινος κάδος', en: 'Yellow bin' });
    expect(d.headline.el).toBe('Ρίξ’ το στον κίτρινο κάδο');
    expect(d.headline.en).toBe('Put it in the yellow recycling bin');
    expect(d.bin?.color).toBe('#EAB308');
  });

  it('ignores bad colours and unknown bins', () => {
    const bins = mergeBins([{ key: 'blue', color: 'red' }, { key: 'nope' as never, color: '#000000' }]);
    expect(bins.blue.color).toBe('#2563EB');
  });

  it('gives clothes the purple clothing bin', () => {
    expect(applyBins(decide('clothes'), mergeBins()).bin).toEqual({ key: 'textiles', color: '#7C3AED' });
  });
});

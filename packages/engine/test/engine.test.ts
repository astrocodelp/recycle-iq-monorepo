import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  DEFAULT_RULES,
  RULE_CODES,
  defaultNickname,
  isValidNickname,
  cityContext,
  decide,
  evaluate,
  explain,
  haversine,
  needsClarification,
  rankPoints,
  ruleImpact,
  sanitizeAnswers,
  searchObjects,
  type CollectionPoint,
  type DistrictContext,
  type RuleState,
} from '../src';

const allOn: RuleState[] = DEFAULT_RULES.map((r) => ({ code: r.code, enabled: true }));
const off = (...codes: string[]): RuleState[] =>
  allOn.map((r) => (codes.includes(r.code) ? { ...r, enabled: false } : r));

const koukaki: DistrictContext = {
  id: 'koukaki',
  name: { el: 'Κουκάκι', en: 'Koukaki' },
  organicService: 'full',
};
const patisia: DistrictContext = { ...koukaki, id: 'patisia', organicService: 'none' };
const partial: DistrictContext = { ...koukaki, id: 'kypseli', organicService: 'partial' };

const run = (objectId: string, answers = {}, rules = allOn, district = koukaki) =>
  evaluate({ objectId, answers }, { district, rules });

describe('catalog and rules data', () => {
  it('has the prototype catalog and the 13 indicative rules', () => {
    expect(CATALOG.map((o) => o.id)).toEqual([
      'plastic-bottle',
      'pizza-box',
      'food-scraps',
      'battery',
      'sofa',
      'glass-bottle',
      'coffee-maker',
      'unknown',
    ]);
    expect(DEFAULT_RULES.map((r) => r.code).sort()).toEqual([...RULE_CODES].sort());
  });
});

describe('decisions', () => {
  it('plastic bottle goes to the blue bin, or general waste if ATH-PKG-01 is off', () => {
    expect(run('plastic-bottle')).toMatchObject({ category: 'packaging', confidence: 0.97, certainty: 'high' });
    const d = run('plastic-bottle', {}, off('ATH-PKG-01'));
    expect(d).toMatchObject({ category: 'general', certainty: 'medium', rulesApplied: [] });
    expect(d.notes[0]?.en).toContain('ATH-PKG-01');
  });

  it('pizza box depends on grease and on the safe-default rule', () => {
    expect(run('pizza-box', { greasy: 'no' }).category).toBe('packaging');
    expect(run('pizza-box', { greasy: 'yes' })).toMatchObject({ category: 'general', confidence: 0.96 });
    expect(run('pizza-box', { greasy: 'yes' }, off('ATH-PKG-02'))).toMatchObject({
      category: 'packaging',
      certainty: 'medium',
    });
    // unsure (also the default when skipped) -> safe default
    expect(run('pizza-box')).toMatchObject({
      category: 'general',
      rulesApplied: ['ATH-PKG-02', 'ATH-GEN-01'],
    });
    expect(run('pizza-box', {}, off('ATH-GEN-01'))).toMatchObject({ category: 'packaging', certainty: 'low' });
  });

  it('food scraps follow the neighbourhood brown-bin coverage', () => {
    expect(run('food-scraps', { content: 'plant' })).toMatchObject({ category: 'organic', confidence: 0.93 });
    const p = run('food-scraps', { content: 'plant' }, allOn, partial);
    expect(p).toMatchObject({ category: 'organic', confidence: 0.82, certainty: 'medium' });
    expect(p.warnings).toHaveLength(1);
    expect(run('food-scraps', { content: 'plant' }, allOn, patisia).category).toBe('general');
    expect(run('food-scraps', { content: 'meat' }, off('ATH-ORG-02')).category).toBe('general');
    expect(run('food-scraps', { content: 'meat' }).rulesApplied).toEqual(['ATH-ORG-01', 'ATH-ORG-02']);
  });

  it('batteries always go to special collection; damaged ones carry fire warnings', () => {
    const d = run('battery', { kind: 'damaged' });
    expect(d).toMatchObject({ category: 'special', confidence: 0.99 });
    expect(d.rulesApplied).toEqual(['ATH-SPC-01', 'ATH-SPC-02']);
    expect(d.warnings).toHaveLength(2);
    expect(d.pointQuery).toEqual({ category: 'special', accepts: 'batteries' });
    expect(run('battery', { kind: 'damaged' }, off('ATH-SPC-02')).warnings).toHaveLength(0);
  });

  it('glass: bells when ATH-PKG-03 is on, broken glass to general waste', () => {
    expect(run('glass-bottle')).toMatchObject({ glassBell: true, pointQuery: { category: 'packaging', glassBell: true } });
    expect(run('glass-bottle', {}, off('ATH-PKG-03'))).toMatchObject({ glassBell: false, rulesApplied: ['ATH-PKG-01'] });
    expect(run('glass-bottle', { form: 'broken' }).category).toBe('general');
  });

  it('coffee maker suggests reuse only if it works', () => {
    expect(run('coffee-maker', { works: 'works' }).alternatives).toBeDefined();
    expect(run('coffee-maker').alternatives).toBeUndefined();
  });

  it('unknown items are uncertain and suggest no point', () => {
    expect(run('nonexistent')).toMatchObject({ objectId: 'unknown', uncertain: true, pointQuery: null, certainty: 'low' });
  });

  it('general waste suggests nearby recycling points', () => {
    expect(run('pizza-box', { greasy: 'yes' }).pointQuery).toEqual({ category: 'packaging' });
  });
});

describe('answers', () => {
  it('drops invalid answers and keys by given answers only', () => {
    expect(sanitizeAnswers('pizza-box', { greasy: 'maybe', other: 'x' })).toEqual({});
    expect(run('pizza-box', { greasy: 'yes' }).key).toBe('pizza-box:greasy=yes');
    expect(run('pizza-box').key).toBe('pizza-box');
  });
  it('knows when to ask a question', () => {
    expect(needsClarification('pizza-box')).toBe(true);
    expect(needsClarification('pizza-box', { greasy: 'no' })).toBe(false);
    expect(needsClarification('sofa')).toBe(false);
  });
});

describe('trace', () => {
  it('has the six stages and names the nearest point', () => {
    const points: CollectionPoint[] = [
      { id: 'far', kind: 'battery_point', name: { el: 'Μακριά', en: 'Far' }, lng: 23.76, lat: 38.0, districtId: null, categories: ['special'], accepts: ['batteries'], glassBell: false, status: 'available' },
      { id: 'near', kind: 'battery_point', name: { el: 'Κοντά', en: 'Near' }, lng: 23.734, lat: 37.975, districtId: null, categories: ['special'], accepts: ['batteries'], glassBell: false, status: 'available' },
      { id: 'closed', kind: 'battery_point', name: { el: 'Κλειστό', en: 'Closed' }, lng: 23.7336, lat: 37.97503, districtId: null, categories: ['special'], accepts: ['batteries'], glassBell: false, status: 'closed' },
      { id: 'weee', kind: 'weee_point', name: { el: 'ΑΗΗΕ', en: 'WEEE' }, lng: 23.7336, lat: 37.97503, districtId: null, categories: ['special'], accepts: ['weee_small'], glassBell: false, status: 'available' },
    ];
    const { decision, nearby } = decide({ objectId: 'battery', answers: { kind: 'small' } }, { district: koukaki, rules: allOn, points });
    expect(nearby.map((p) => p.id)).toEqual(['near', 'far', 'closed']);
    expect(decision.trace.map((t) => t.stage)).toEqual(['recognition', 'material', 'condition', 'rules', 'location', 'final']);
    expect(decision.trace[4]!.inputs.at(-1)!.value.en).toContain('Near');
    expect(decision.districtId).toBe('koukaki');
    expect(explain(run('sofa')).trace[2]!.inputs[0]!.value.en).toBe('Not required');
  });
});

describe('search', () => {
  it('matches Greek without accents and English', () => {
    expect(searchObjects('πιτσα')[0]?.object.id).toBe('pizza-box');
    expect(searchObjects('ΜΠΑΤΑΡΊΑ')[0]?.object.id).toBe('battery');
    expect(searchObjects('couch')[0]?.object.id).toBe('sofa');
    expect(searchObjects('x')).toEqual([]);
  });
});

describe('points and context', () => {
  it('haversine is roughly right across Athens', () => {
    const d = haversine({ lng: 23.7336, lat: 37.97503 }, { lng: 23.7275, lat: 37.9715 });
    expect(d).toBeGreaterThan(600);
    expect(d).toBeLessThan(750);
  });
  it('city context aggregates coverage', () => {
    expect(cityContext([{ organicService: 'full' }, { organicService: 'none' }]).organicService).toBe('partial');
    expect(cityContext([{ organicService: 'none' }]).organicService).toBe('none');
  });
  it('rankPoints filters glass bells', () => {
    const p: CollectionPoint = { id: 'b', kind: 'blue_bin', name: { el: '', en: '' }, lng: 23.73, lat: 37.97, districtId: null, categories: ['packaging'], accepts: ['paper'], glassBell: false, status: 'available' };
    expect(rankPoints([p], { category: 'packaging', glassBell: true }, { lng: 23.73, lat: 37.97 })).toEqual([]);
  });
});

describe('leaderboard', () => {
  it('gives every install a stable nickname in both languages', () => {
    expect(defaultNickname('app-abc')).toBe(defaultNickname('app-abc'));
    expect(defaultNickname('app-abc')).not.toBe(defaultNickname('app-xyz'));
    expect(defaultNickname('app-abc', 'en')).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
  });
  it('validates custom nicknames', () => {
    expect(isValidNickname('Μαρία 7')).toBe(true);
    expect(isValidNickname('x')).toBe(false);
    expect(isValidNickname('<script>')).toBe(false);
  });
});

describe('rule impact', () => {
  it('previews what toggling a rule changes', () => {
    const rows = ruleImpact('ATH-PKG-02', allOn, koukaki);
    expect(rows.map((r) => r.scenario.key)).toContain('pizza-box:greasy=yes');
    expect(ruleImpact('ATH-ORG-01', allOn, koukaki).map((r) => r.scenario.key)).toEqual([
      'food-scraps:content=plant',
      'food-scraps:content=meat',
    ]);
    // No brown-bin service in Patisia: the rule cannot change anything there.
    expect(ruleImpact('ATH-ORG-01', allOn, patisia)).toEqual([]);
  });
});

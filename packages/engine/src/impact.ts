import { decisionKey, explain, evaluate } from './decide';
import { te } from './l10n';
import type { Answers, Decision, DistrictContext, L10n, RuleCode, RuleState } from './types';

export interface Scenario {
  key: string;
  label: L10n;
  objectId: string;
  answers: Answers;
}

const s = (objectId: string, answers: Answers, el: string, en: string): Scenario => ({
  key: decisionKey(objectId, answers),
  label: te(el, en),
  objectId,
  answers,
});

/** Representative cases used to preview what a policy change would do. */
export const SCENARIOS: readonly Scenario[] = [
  s('plastic-bottle', {}, 'Πλαστικό μπουκάλι', 'Plastic bottle'),
  s('can', {}, 'Κουτάκι αναψυκτικού', 'Drink can'),
  s('paper', {}, 'Χαρτί', 'Paper'),
  s('cardboard-box', {}, 'Χαρτόκουτο', 'Cardboard box'),
  s('pizza-box', { greasy: 'yes' }, 'Κουτί πίτσας · λερωμένο', 'Pizza box · greasy'),
  s('pizza-box', { greasy: 'no' }, 'Κουτί πίτσας · καθαρό', 'Pizza box · clean'),
  s('pizza-box', { greasy: 'unsure' }, 'Κουτί πίτσας · δεν ξέρω', 'Pizza box · unsure'),
  s('food-scraps', { content: 'plant' }, 'Υπολείμματα · φυτικά', 'Food scraps · plant'),
  s('food-scraps', { content: 'meat' }, 'Υπολείμματα · κρέας', 'Food scraps · meat'),
  s('battery', { kind: 'small' }, 'Μπαταρία ΑΑ', 'AA battery'),
  s('battery', { kind: 'damaged' }, 'Φουσκωμένη μπαταρία', 'Swollen battery'),
  s('sofa', {}, 'Παλιός καναπές', 'Old sofa'),
  s('glass-bottle', { form: 'bottle' }, 'Γυάλινο μπουκάλι', 'Glass bottle'),
  s('glass-bottle', { form: 'broken' }, 'Σπασμένο τζάμι', 'Broken glass'),
  s('coffee-maker', { works: 'works' }, 'Καφετιέρα · λειτουργεί', 'Coffee maker · works'),
  s('unknown', {}, 'Θολή φωτογραφία', 'Blurry photo'),
];

const signature = (d: Decision) =>
  [
    d.category,
    d.destination.en,
    d.certainty,
    d.rulesApplied.join('+'),
    d.warnings.length,
    d.alternatives ? 1 : 0,
  ].join('|');

export interface ImpactRow {
  scenario: Scenario;
  before: Decision;
  after: Decision;
}

/** Which scenarios change if `code` is toggled, in a given district. */
export function ruleImpact(
  code: RuleCode,
  rules: readonly RuleState[],
  district: DistrictContext,
): ImpactRow[] {
  const current = new Map(rules.map((r) => [r.code, r.enabled]));
  const toggled: RuleState[] = [...current.entries()].map(([c, enabled]) => ({ code: c, enabled }));
  const idx = toggled.findIndex((r) => r.code === code);
  if (idx >= 0) toggled[idx] = { code, enabled: !toggled[idx]!.enabled };
  else toggled.push({ code, enabled: false });
  return SCENARIOS.map((scenario) => {
    const input = { objectId: scenario.objectId, answers: scenario.answers };
    const before = explain(evaluate(input, { district, rules }));
    const after = explain(evaluate(input, { district, rules: toggled }));
    return { scenario, before, after };
  }).filter((r) => signature(r.before) !== signature(r.after));
}

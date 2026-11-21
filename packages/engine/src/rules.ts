import rulesJson from './data/rules.json';
import type { Rule, RuleCode, RuleState } from './types';

/** The indicative Athens rule registry. Not the official regulation. */
export const DEFAULT_RULES: readonly Rule[] = rulesJson as Rule[];

export const getDefaultRule = (code: RuleCode) => DEFAULT_RULES.find((r) => r.code === code);

/** Rules absent from the list are treated as enabled. */
export function ruleLookup(rules: readonly RuleState[]): (code: RuleCode) => boolean {
  const map = new Map(rules.map((r) => [r.code, r.enabled]));
  return (code) => map.get(code) ?? true;
}

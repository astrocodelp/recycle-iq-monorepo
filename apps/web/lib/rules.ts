import 'server-only';
import { asc, eq, getDb, ruleChanges, rules } from '@recycleiq/db';
import { RULE_CODES, type RuleCode } from '@recycleiq/engine';

export const isRuleCode = (c: string): c is RuleCode => (RULE_CODES as readonly string[]).includes(c);

/** Toggle a municipal rule. Takes effect on the next decision in the app; logged for audit. */
export async function setRuleEnabled(code: RuleCode, enabled: boolean, by: string) {
  const db = getDb();
  await db.update(rules).set({ enabled, updatedAt: new Date(), updatedBy: by }).where(eq(rules.code, code));
  await db.insert(ruleChanges).values({ code, enabled, changedBy: by });
}

export const listRules = () => getDb().select().from(rules).orderBy(asc(rules.code));

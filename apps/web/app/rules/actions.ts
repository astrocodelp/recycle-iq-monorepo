'use server';

import { eq, getDb, ruleChanges, rules } from '@recycleiq/db';
import { RULE_CODES, type RuleCode } from '@recycleiq/engine';
import { revalidatePath } from 'next/cache';

/** Toggle a municipal rule. Takes effect on the next decision in the app; logged for audit. */
export async function toggleRule(formData: FormData) {
  const code = String(formData.get('code')) as RuleCode;
  if (!RULE_CODES.includes(code)) throw new Error('Unknown rule');
  const enabled = formData.get('enabled') === 'true';
  const db = getDb();
  await db.update(rules).set({ enabled, updatedAt: new Date(), updatedBy: 'dashboard' }).where(eq(rules.code, code));
  await db.insert(ruleChanges).values({ code, enabled, changedBy: 'dashboard' });
  revalidatePath('/rules');
}

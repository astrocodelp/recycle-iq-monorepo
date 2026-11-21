'use server';

import { revalidatePath } from 'next/cache';
import { isRuleCode, setRuleEnabled } from '@/lib/rules';

/** Toggle a municipal rule. Takes effect on the next decision in the app; logged for audit. */
export async function toggleRule(formData: FormData) {
  const code = String(formData.get('code'));
  if (!isRuleCode(code)) throw new Error('Unknown rule');
  await setRuleEnabled(code, formData.get('enabled') === 'true', 'dashboard');
  revalidatePath('/rules');
}

'use server';

import { revalidatePath } from 'next/cache';
import { resetBinStyle, saveBinStyle } from '@/lib/bin-styles';
import { isRuleCode, setRuleEnabled } from '@/lib/rules';

/** Toggle a municipal rule. Takes effect on the next decision in the app; logged for audit. */
export async function toggleRule(formData: FormData) {
  const code = String(formData.get('code'));
  if (!isRuleCode(code)) throw new Error('Unknown rule');
  await setRuleEnabled(code, formData.get('enabled') === 'true', 'dashboard');
  revalidatePath('/rules');
}

/** Rename or recolour a bin type. Takes effect on the next decision in the app. */
export async function updateBin(formData: FormData) {
  const key = String(formData.get('key'));
  if (formData.get('reset') === '1') await resetBinStyle(key);
  else
    await saveBinStyle(key, { el: String(formData.get('nameEl') ?? ''), en: String(formData.get('nameEn') ?? '') }, String(formData.get('color') ?? ''), 'dashboard');
  revalidatePath('/rules');
}

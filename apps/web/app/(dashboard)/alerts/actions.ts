'use server';

import { revalidatePath } from 'next/cache';
import { acknowledgeBinAlerts, resolveBinAlerts } from '@/lib/alerts';

/** A crew is on it: open reports for this bin become acknowledged. */
export async function acknowledgeBin(formData: FormData) {
  await acknowledgeBinAlerts(String(formData.get('pointId')));
  revalidatePath('/alerts');
}

/** Emptied or repaired: close every report for the bin and show it as available again. */
export async function resolveBin(formData: FormData) {
  await resolveBinAlerts(String(formData.get('pointId')));
  revalidatePath('/alerts');
}

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LANG_COOKIE } from '@/lib/lang';

export async function setLanguage(formData: FormData) {
  const lang = formData.get('lang') === 'en' ? 'en' : 'el';
  (await cookies()).set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}

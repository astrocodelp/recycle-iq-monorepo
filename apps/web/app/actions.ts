'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { BIN_SOURCE_COOKIE } from '@/lib/bins';
import { LANG_COOKIE } from '@/lib/lang';

export async function setLanguage(formData: FormData) {
  const lang = formData.get('lang') === 'en' ? 'en' : 'el';
  (await cookies()).set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}

export async function setBinSource(formData: FormData) {
  const source = formData.get('bins') === 'osm' ? 'osm' : 'synthetic';
  (await cookies()).set(BIN_SOURCE_COOKIE, source, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}

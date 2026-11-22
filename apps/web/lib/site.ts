import { headers } from 'next/headers';

/** The public address: recycleiq.eu (recycleiq.gr and the vercel.app address serve the same site). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://recycleiq.eu').replace(/\/$/, '');

/** Public base URL for QR codes and shared links: SITE_URL, except on a local dev server. */
export async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return SITE_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host)) return `http://${host}`;
  return SITE_URL;
}

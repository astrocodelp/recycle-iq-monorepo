import type { Metadata } from 'next';
import { Commissioner, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { getLang } from '@/lib/lang';
import './globals.css';

// Commissioner: designed with full Greek support (Plus Jakarta Sans has no Greek glyphs).
const sans = Commissioner({ subsets: ['latin', 'latin-ext', 'greek'], variable: '--font-sans-greek' });
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'greek'], variable: '--font-jetbrains', weight: ['500', '700'] });

export const metadata: Metadata = {
  title: { default: 'RecycleIQ · Municipal Intelligence', template: '%s · RecycleIQ' },
  description: 'Τι ρωτούν οι κάτοικοι της Αθήνας για την ανακύκλωση — και πώς αποφασίζει η μηχανή.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${sans.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { getLang } from '@/lib/lang';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-jakarta', weight: ['400', '500', '600', '700', '800'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'greek'], variable: '--font-jetbrains', weight: ['500', '700'] });

export const metadata: Metadata = {
  title: { default: 'RecycleIQ · Municipal Intelligence', template: '%s · RecycleIQ' },
  description: 'Τι ρωτούν οι κάτοικοι της Αθήνας για την ανακύκλωση — και πώς αποφασίζει η μηχανή.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}

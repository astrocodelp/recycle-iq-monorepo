import type { Lang } from '@recycleiq/engine';
import type { Metadata, Viewport } from 'next';
import { City, Residents } from '@/components/landing/audiences';
import { Footer, Privacy, SurveyCta } from '@/components/landing/closing';
import { Header, Hero } from '@/components/landing/hero';
import { HowItWorks, Problem } from '@/components/landing/story';
import { getLang, tr } from '@/lib/lang';
import './landing.css';
import { SITE_URL } from '@/lib/site';

type Props = { searchParams: Promise<{ lang?: string }> };

/** ?lang=el|en wins (shareable links), otherwise the dashboard's language cookie, otherwise Greek. */
async function pageLang(searchParams: Props['searchParams']): Promise<Lang> {
  const { lang } = await searchParams;
  return lang === 'en' || lang === 'el' ? lang : getLang();
}

const SITE = SITE_URL;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = tr(await pageLang(searchParams));
  const title = t('RecycleIQ · Τι πάει πού;', 'RecycleIQ · What goes where?');
  const description = t(
    'Σκάναρε, γράψε ή ρώτα με τη φωνή: σε ποιον κάδο πάει, γιατί, και πού είναι ο πιο κοντινός. Ο Δήμος Αθηναίων βλέπει τι δυσκολεύει κάθε γειτονιά. Apps4Athens 2026.',
    'Scan, type or ask out loud: which bin, why, and where the nearest one is. The City of Athens sees what each neighbourhood struggles with. Apps4Athens 2026.',
  );
  return {
    metadataBase: new URL(SITE),
    title: { absolute: title },
    description,
    alternates: { canonical: '/', languages: { el: '/?lang=el', en: '/?lang=en' } },
    openGraph: {
      title,
      description,
      url: '/',
      siteName: 'RecycleIQ',
      type: 'website',
      locale: t('el_GR', 'en_GB'),
      alternateLocale: t('en_GB', 'el_GR'),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export const viewport: Viewport = { themeColor: '#F8F9F6' };

/** Public landing page: what RecycleIQ is, for residents and for the municipality. Greek first, English via ?lang=en. Lives at the root; the dashboard is at /city. */
export default async function Landing({ searchParams }: Props) {
  const lang = await pageLang(searchParams);
  const t = tr(lang);
  return (
    <div lang={lang} className="lp-root">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-[14px] font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('Μετάβαση στο περιεχόμενο', 'Skip to content')}
      </a>
      <Header t={t} lang={lang} />
      <main id="main">
        <Hero t={t} />
        <Problem t={t} />
        <HowItWorks t={t} />
        <Residents t={t} />
        <City t={t} />
        <Privacy t={t} />
        <SurveyCta t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}

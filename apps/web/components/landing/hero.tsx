import type { Lang } from '@recycleiq/engine';
import { Download, LayoutDashboard, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { HeroPhone } from './phone';
import { ButtonLink, Container, type T } from './ui';

export function Header({ t, lang }: { t: T; lang: Lang }) {
  const nav = [
    { href: '#how', label: t('Πώς δουλεύει', 'How it works') },
    { href: '#residents', label: t('Κάτοικοι', 'Residents') },
    { href: '#city', label: t('Δήμος', 'City') },
    { href: '#privacy', label: t('Ιδιωτικότητα', 'Privacy') },
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/about" className="flex items-center gap-2.5 rounded-sm" aria-label="RecycleIQ">
          <LogoMark size={32} />
          <span className="text-[17px] font-extrabold tracking-[-0.03em] text-ink">
            Recycle<span className="text-forest-500">IQ</span>
          </span>
        </Link>
        <nav aria-label={t('Ενότητες', 'Sections')} className="hidden flex-1 md:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="rounded-sm px-3 py-2 text-[14px] font-semibold text-muted transition-colors hover:text-ink">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="flex rounded-pill bg-surface-2 p-1 ring-1 ring-line" role="group" aria-label={t('Γλώσσα', 'Language')}>
            {(['el', 'en'] as const).map((l) => (
              <Link
                key={l}
                href={`/about?lang=${l}`}
                hrefLang={l}
                lang={l}
                aria-current={lang === l ? 'true' : undefined}
                aria-label={l === 'el' ? 'Ελληνικά' : 'English'}
                className={`grid h-8 min-w-10 place-items-center rounded-pill px-2.5 text-[12px] font-bold transition-colors ${
                  lang === l ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {l === 'el' ? 'ΕΛ' : 'EN'}
              </Link>
            ))}
          </div>
          <a
            href="/app"
            className="lp-press hidden h-10 items-center rounded-control bg-forest-700 px-4 text-[14px] font-semibold text-white shadow-btn-primary hover:bg-forest-800 sm:inline-flex"
          >
            {t('Άνοιξε την εφαρμογή', 'Open the app')}
          </a>
        </div>
      </Container>
    </header>
  );
}

export function Hero({ t }: { t: T }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="lp-hero-bg" aria-hidden />
      <Container className="relative grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:pt-20 lg:pb-24">
        <div className="lp-rise">
          <p className="inline-flex items-center gap-2 rounded-pill bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-muted ring-1 ring-line">
            <span className="size-2 rounded-full bg-lime-600" aria-hidden />
            Apps4Athens 2026 · {t('Πρωτότυπο για την Αθήνα', 'A prototype for Athens')}
          </p>
          <h1 id="hero-title" className="mt-6 text-[clamp(46px,8.4vw,92px)] leading-[0.95] font-extrabold tracking-[-0.045em] text-ink">
            {t('Τι πάει ', 'What goes ')}
            <span className="lp-marker">{t('πού;', 'where?')}</span>
          </h1>
          <p className="mt-6 max-w-[540px] text-[clamp(17px,1.9vw,20px)] leading-relaxed font-medium text-pretty text-muted">
            {t(
              'Σκάναρε, γράψε ή ρώτα με τη φωνή. Το RecycleIQ σου λέει σε ποιον κάδο πάει, γιατί, και πού είναι ο πιο κοντινός.',
              'Scan it, type it or just ask. RecycleIQ tells you which bin, why, and where the nearest one is.',
            )}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href="/app" plain icon={Smartphone}>
              {t('Άνοιξε την εφαρμογή', 'Open the app')}
            </ButtonLink>
            <ButtonLink href="/download" variant="secondary" icon={Download}>
              {t('Android', 'Android')}
            </ButtonLink>
            <ButtonLink href="/" variant="secondary" icon={LayoutDashboard}>
              {t('Dashboard του Δήμου', 'City dashboard')}
            </ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] font-semibold text-muted">
            {[t('Χωρίς λογαριασμό', 'No account'), t('Ελληνικά και αγγλικά', 'Greek and English'), t('Μόνο η γειτονιά, ποτέ η διεύθυνση', 'Neighbourhood only, never your address')].map(
              (x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-forest-500" aria-hidden />
                  {x}
                </li>
              ),
            )}
          </ul>
        </div>
        <div className="lp-rise lp-rise-2 flex flex-col items-center gap-3">
          <HeroPhone t={t} />
          <p className="text-[12px] font-semibold text-muted">{t('Ενδεικτική οθόνη της εφαρμογής', 'Illustrative app screen')}</p>
        </div>
      </Container>
    </section>
  );
}

import { BarChart3, Bell, BookOpen, Map, MapPin, Scale } from 'lucide-react';
import type { ReactNode } from 'react';
import { setBinSource, setLanguage } from '../actions';
import { getBinSource } from '@/lib/bins';
import { Logo } from '@/components/logo';
import { NavLink } from '@/components/nav-link';
import { getLang, tr } from '@/lib/lang';
import { getOpenAlertCount } from '@/lib/queries';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [lang, bins] = await Promise.all([getLang(), getBinSource()]);
  const t = tr(lang);
  const openAlerts = await getOpenAlertCount().catch(() => 0);
  const nav = [
    { href: '/', label: t('Επισκόπηση', 'Overview'), icon: BarChart3 },
    { href: '/map', label: t('Χάρτης Αθήνας', 'Athens map'), icon: Map },
    { href: '/alerts', label: t('Γεμάτοι κάδοι', 'Full bins'), icon: Bell, badge: openAlerts },
    { href: '/rules', label: t('Κανόνες Δήμου', 'Municipal rules'), icon: Scale },
    { href: '/points', label: t('Σημεία συλλογής', 'Collection points'), icon: MapPin },
    { href: '/developers', label: t('API για την εφαρμογή', 'App API'), icon: BookOpen },
  ];
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col lg:flex-row">
      <aside className="print:hidden flex shrink-0 flex-col gap-6 border-b border-line bg-surface px-5 py-5 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-r lg:border-b-0">
        <Logo subtitle="Municipal Intelligence" />
        <nav
          aria-label={t('Κύριο μενού', 'Main menu')}
          className="flex gap-1 overflow-x-auto lg:flex-col"
        >
          {nav.map(({ href, label, icon: Icon, badge }) => (
            <NavLink key={href} href={href}>
              <Icon size={18} strokeWidth={2} aria-hidden />
              <span className="flex-1">{label}</span>
              {!!badge && (
                <span
                  className="num rounded-pill bg-danger px-2 py-0.5 text-[11px] text-white"
                  aria-label={t(`${badge} νέες αναφορές`, `${badge} new reports`)}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-3 lg:flex">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t('Δεδομένα κάδων', 'Bin data')}</p>
            <form action={setBinSource} className="inline-flex w-fit rounded-pill bg-surface-2 p-1">
              {(['synthetic', 'osm'] as const).map((b) => (
                <button
                  key={b}
                  name="bins"
                  value={b}
                  aria-pressed={bins === b}
                  className={`rounded-pill px-3 py-1 text-caption ${bins === b ? 'bg-ink text-white' : 'text-muted'}`}
                >
                  {b === 'synthetic' ? t('Συνθετικά', 'Synthetic') : t('Πραγματικά', 'Real')}
                </button>
              ))}
            </form>
            {bins === 'osm' && (
              <p className="text-[11px] leading-snug text-muted">{t('Πηγή σήμερα: © OpenStreetMap (ODbL)', 'Source today: © OpenStreetMap (ODbL)')}</p>
            )}
          </div>
          <form action={setLanguage} className="inline-flex w-fit rounded-pill bg-surface-2 p-1">
            {(['el', 'en'] as const).map((l) => (
              <button
                key={l}
                name="lang"
                value={l}
                aria-pressed={lang === l}
                className={`rounded-pill px-3 py-1 text-caption ${lang === l ? 'bg-ink text-white' : 'text-muted'}`}
              >
                {l === 'el' ? 'ΕΛ' : 'EN'}
              </button>
            ))}
          </form>
          <p className="text-[11px] leading-snug text-muted">
            Apps4Athens 2026 · Concept prototype
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 print:p-0">{children}</main>
    </div>
  );
}

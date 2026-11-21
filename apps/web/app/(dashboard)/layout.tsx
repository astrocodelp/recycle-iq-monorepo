import { BarChart3, BookOpen, Map, MapPin, Scale } from 'lucide-react';
import type { ReactNode } from 'react';
import { setLanguage } from '../actions';
import { Logo } from '@/components/logo';
import { NavLink } from '@/components/nav-link';
import { getLang, tr } from '@/lib/lang';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  const t = tr(lang);
  const nav = [
    { href: '/', label: t('Επισκόπηση', 'Overview'), icon: BarChart3 },
    { href: '/map', label: t('Χάρτης Αθήνας', 'Athens map'), icon: Map },
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
          {nav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href}>
              <Icon size={18} strokeWidth={2} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-3 lg:flex">
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

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

export type T = (el: string, en?: string) => string;

/** Page width for every landing section. */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1160px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHead({
  id,
  eyebrow,
  title,
  lead,
  tone = 'light',
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <header className="lp-reveal max-w-[680px]">
      <p className={`text-[12px] font-bold tracking-[0.14em] uppercase ${dark ? 'text-lime' : 'text-forest-700'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`mt-3 text-[clamp(30px,4.6vw,46px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance ${dark ? 'text-white' : 'text-ink'}`}
      >
        {title}
      </h2>
      {lead && (
        <p className={`mt-4 text-[17px] leading-relaxed font-medium text-pretty ${dark ? 'text-white/75' : 'text-muted'}`}>{lead}</p>
      )}
    </header>
  );
}

const buttons = {
  primary: 'bg-forest-700 text-white shadow-btn-primary hover:bg-forest-800',
  lime: 'bg-lime text-ink shadow-btn-lime hover:bg-lime-500',
  secondary: 'bg-surface text-ink ring-1 ring-line-strong hover:ring-ink/40',
  ghostDark: 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15',
} as const;

/** A link styled as a button. External / non-Next targets (the /app shell, downloads) use a plain anchor. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  icon: Icon,
  plain = false,
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttons;
  icon?: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  /** Full page load: for /app (static Expo shell) and other non-Next routes. */
  plain?: boolean;
  className?: string;
}) {
  const cls = `lp-press inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-[15px] font-semibold ${buttons[variant]} ${className}`;
  const body = (
    <>
      {Icon && <Icon size={18} aria-hidden />}
      {children}
    </>
  );
  return plain ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

export function TextLink({ href, children, tone = 'light' }: { href: string; children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 text-[15px] font-semibold underline-offset-4 hover:underline ${tone === 'dark' ? 'text-lime' : 'text-forest-700'}`}
    >
      {children}
      <ArrowRight size={16} aria-hidden className="lp-nudge" />
    </Link>
  );
}

/** Small honesty label: synthetic data, simulation, sandbox. Text, never colour alone. */
export function Label({ children, tone = 'demo' }: { children: ReactNode; tone?: 'demo' | 'dark' }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] leading-5 font-bold ${
        tone === 'dark' ? 'bg-white/10 text-white/80 ring-1 ring-white/15' : 'bg-demo-bg text-demo-fg ring-1 ring-demo-line'
      }`}
    >
      {children}
    </span>
  );
}

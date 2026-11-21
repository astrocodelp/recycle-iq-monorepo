import type { CategoryId } from '@recycleiq/engine';
import { categoryColors } from '@recycleiq/tokens';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-h3 text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-caption text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Signed ratio vs previous period. */
  delta?: { ratio: number; label: string };
}) {
  const up = delta && delta.ratio >= 0;
  return (
    <div className="card flex flex-col gap-2 p-4">
      <span className="eyebrow">{label}</span>
      <span className="num text-[28px] leading-none font-bold text-ink">{value}</span>
      <span className="flex items-center gap-2 text-caption text-muted">
        {delta && (
          <span
            className={`num rounded-pill px-1.5 py-0.5 text-[11px] ${up ? 'bg-forest-50 text-forest-700' : 'bg-danger-soft text-danger'}`}
          >
            {up ? '▲' : '▼'} {delta.label}
          </span>
        )}
        {hint}
      </span>
    </div>
  );
}

const tones = {
  neutral: 'bg-surface-2 text-muted',
  forest: 'bg-forest-50 text-forest-700',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Honesty label: required wherever data is synthetic, illustrative or indicative. */
export function DemoBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-demo-line bg-demo-bg px-2.5 py-1 text-[11px] font-bold text-demo-fg">
      <Info size={13} strokeWidth={2.2} aria-hidden />
      {children}
    </span>
  );
}

/** A category is never colour alone: the swatch always sits next to its name. */
export function CategoryLabel({ category, label }: { category: CategoryId; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-2.5 rounded-[3px]"
        style={{ background: categoryColors[category].solid }}
      />
      <span>{label}</span>
    </span>
  );
}

export function Segmented({
  options,
  value,
  label,
}: {
  options: { value: string; label: string; href: string }[];
  value: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="inline-flex rounded-pill bg-surface-2 p-1">
      {options.map((o) => (
        <a
          key={o.value}
          href={o.href}
          aria-current={o.value === value ? 'page' : undefined}
          className={`rounded-pill px-3 py-1 text-caption transition-colors ${
            o.value === value ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </a>
      ))}
    </nav>
  );
}

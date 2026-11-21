import type { ReactNode } from 'react';

/**
 * Horizontal bars, one baseline, each bar labeled with its name and value (never colour alone).
 * Bars are capped at 12px thick with a 4px rounded data end.
 */
export function BarList({
  rows,
  max,
}: {
  rows: { key: string; label: ReactNode; value: number; display: string; color?: string; title?: string }[];
  max?: number;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} title={r.title}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-body text-ink">
            <span className="truncate">{r.label}</span>
            <span className="num shrink-0 text-[13px] text-muted">{r.display}</span>
          </div>
          <div className="h-3 w-full rounded-r-[4px] bg-surface-2">
            <div
              className="h-3 rounded-r-[4px]"
              style={{ width: `${Math.max(1.5, (r.value / top) * 100)}%`, background: r.color ?? 'var(--color-forest-700)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

'use client';

import type { AssistantChart } from '@recycleiq/engine';
import { MapPin } from 'lucide-react';
import { BarList } from '@/components/bar-list';
import { TrendChart } from '@/components/trend-chart';
import { Kpi } from '@/components/ui';

/** Draws an assistant tool result with the dashboard's own chart components. */
export function AssistantChartView({ chart, locale }: { chart: AssistantChart; locale: string }) {
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <figure className="rounded-card border border-line bg-surface p-3">
      <figcaption className="mb-2 text-caption font-semibold text-ink">{chart.title}</figcaption>
      {chart.type === 'bar' && (
        <BarList
          rows={chart.items.map((it, i) => ({
            key: `${i}-${it.label}`,
            label: it.label,
            value: it.value,
            display: `${nf.format(it.value)}${chart.unit ? ` ${chart.unit}` : ''}${it.hint ? ` · ${it.hint}` : ''}`,
            color: it.color,
          }))}
        />
      )}
      {chart.type === 'line' && <TrendChart data={chart.points.map((p) => ({ day: p.x, n: p.y }))} locale={locale} seriesLabel={chart.title} />}
      {chart.type === 'kpis' && (
        <div className="grid grid-cols-2 gap-2">
          {chart.items.map((k) => (
            <Kpi key={k.label} label={k.label} value={k.value} hint={k.hint} />
          ))}
        </div>
      )}
      {chart.type === 'table' && (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 bg-surface">
              <tr>{chart.columns.map((c) => <th key={c} className="border-b border-line px-2 py-1 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {chart.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-line px-2 py-1">{typeof c === 'number' ? nf.format(c) : c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {chart.type === 'map-list' && (
        <ul className="flex flex-col divide-y divide-line">
          {chart.items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <MapPin size={14} className="shrink-0 text-forest-700" aria-hidden />
              <span className="flex-1 truncate">{it.label}</span>
              {it.status && it.status !== 'available' && <span className="text-[11px] font-bold text-warn">{it.status}</span>}
              {it.detail && <span className="num text-muted">{it.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

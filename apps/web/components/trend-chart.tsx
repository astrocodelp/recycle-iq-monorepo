'use client';

import { useMemo, useState } from 'react';

interface Point {
  day: string;
  n: number;
}

const W = 720;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

/** Single-series daily line with a 10% area wash, crosshair and tooltip on hover. */
export function TrendChart({ data, locale, seriesLabel }: { data: Point[]; locale: string; seriesLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.n)));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const df = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }), [locale]);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join('');
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 6);
  const h = hover != null ? data[hover] : undefined;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={seriesLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.left) / iw) * (data.length - 1));
          setHover(Math.min(data.length - 1, Math.max(0, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-chart-grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="num fill-muted text-[11px]">
              {nf.format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">
              {df.format(new Date(d.day))}
            </text>
          ) : null,
        )}
        <path d={area} fill="var(--color-forest-700)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--color-forest-700)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.length > 0 && (
          <circle cx={x(data.length - 1)} cy={y(data[data.length - 1]!.n)} r={4} fill="var(--color-forest-700)" stroke="var(--color-surface)" strokeWidth={2} />
        )}
        {h && hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--color-line-strong)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(h.n)} r={5} fill="var(--color-forest-700)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-0 rounded-control bg-ink px-2.5 py-1.5 text-caption text-white shadow-pop"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div className="text-white/70">{df.format(new Date(h.day))}</div>
          <div className="num">{nf.format(h.n)}</div>
        </div>
      )}
    </div>
  );
}

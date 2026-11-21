'use client';

import { useState } from 'react';

export interface MapDistrict {
  id: string;
  name: string;
  path: string;
  value: number;
  valueLabel: string;
  detail: string;
  href: string;
}
export interface MapPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

// Sequential single-hue ramp (forest), light -> dark, for request volume.
const RAMP = ['#F0FAF3', '#BBE6C9', '#8CD3A5', '#52B77A', '#1C7A44'];

/** Choropleth of the 38 districts in the prototype's stylised Athens projection, with optional points. */
export function AthensMap({
  districts,
  points,
  selected,
  legend,
}: {
  districts: MapDistrict[];
  points: MapPoint[];
  selected?: string;
  legend: { low: string; high: string; title: string };
}) {
  const [hover, setHover] = useState<MapDistrict | null>(null);
  const max = Math.max(1, ...districts.map((d) => d.value));
  const step = (v: number) => RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length))]!;

  return (
    <div className="relative">
      <svg viewBox="0 0 1209 1199" className="h-auto w-full" role="img" aria-label={legend.title}>
        {districts.map((d) => (
          <a key={d.id} href={d.href} aria-label={`${d.name}: ${d.valueLabel}`}>
            <path
              d={d.path}
              fill={step(d.value)}
              stroke={d.id === selected ? 'var(--color-ink)' : 'var(--color-surface)'}
              strokeWidth={d.id === selected ? 4 : 2}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-opacity hover:opacity-80"
            />
          </a>
        ))}
        {points.map((p) => (
          <circle key={p.id} cx={p.x} cy={p.y} r={10} fill={p.color} stroke="var(--color-surface)" strokeWidth={2}>
            <title>{p.name}</title>
          </circle>
        ))}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-control bg-ink px-3 py-2 text-caption text-white shadow-pop">
          <div className="font-bold">{hover.name}</div>
          <div className="num">{hover.valueLabel}</div>
          <div className="text-white/70">{hover.detail}</div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-caption text-muted">
        <span>{legend.low}</span>
        <span className="flex">
          {RAMP.map((c) => (
            <span key={c} className="h-2.5 w-8 first:rounded-l-pill last:rounded-r-pill" style={{ background: c }} />
          ))}
        </span>
        <span>{legend.high}</span>
      </div>
    </div>
  );
}


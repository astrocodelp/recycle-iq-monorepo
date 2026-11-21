'use client';

import dynamic from 'next/dynamic';

export interface MapDistrict {
  id: string;
  name: string;
  /** Outline in the prototype's linear Athens projection (see packages/engine/src/geo.ts). */
  path: string;
  value: number;
  valueLabel: string;
  detail: string;
  href: string;
}
export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  color: string;
  name: string;
}

// Sequential single-hue ramp (forest), light -> dark, for request volume.
const RAMP = ['#F0FAF3', '#BBE6C9', '#8CD3A5', '#52B77A', '#1C7A44'];

// Leaflet touches `window` on import, so the map only renders in the browser.
const LeafletAthensMap = dynamic(() => import('./athens-map-leaflet'), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse rounded-control bg-surface-2" />,
});

/** Choropleth of the 38 districts over an OpenStreetMap base map, with optional collection points. */
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
  const max = Math.max(1, ...districts.map((d) => d.value));
  const fill = (v: number) => RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length))]!;

  return (
    <div role="region" aria-label={legend.title}>
      <LeafletAthensMap districts={districts} points={points} selected={selected} fill={fill} />
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

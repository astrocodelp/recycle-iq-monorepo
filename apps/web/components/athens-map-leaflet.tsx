'use client';

import 'leaflet/dist/leaflet.css';
import { parsePath, unprojectXY } from '@recycleiq/engine';
import { colors } from '@recycleiq/tokens';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { MapDistrict, MapPoint } from './athens-map';

// OpenStreetMap's standard tiles are fine for a pilot dashboard with attribution. For heavy public
// use, point NEXT_PUBLIC_MAP_TILE_URL at a tile provider or your own tile server (OSM tile policy).
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** District outlines are stored in the prototype's linear Athens projection; turn them back into lat/lng. */
function toLatLngRings(path: string): LatLngTuple[][] {
  return parsePath(path).map((ring) =>
    ring.map(([x, y]) => {
      const { lng, lat } = unprojectXY(x, y);
      return [lat, lng] as LatLngTuple;
    }),
  );
}

function boundsOf(rings: LatLngTuple[][]): LatLngBoundsExpression {
  const pts = rings.flat();
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function FitTo({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    // The container can still be settling when Leaflet first measures it; refit after layout.
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [16, 16] });
    };
    const raf = requestAnimationFrame(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [map, bounds]);
  return null;
}

export default function LeafletAthensMap({
  districts,
  points,
  selected,
  fill,
}: {
  districts: MapDistrict[];
  points: MapPoint[];
  selected?: string;
  fill: (value: number) => string;
}) {
  const router = useRouter();
  const shapes = useMemo(() => districts.map((d) => ({ d, rings: toLatLngRings(d.path) })), [districts]);
  const bounds = useMemo(() => {
    const sel = shapes.find((s) => s.d.id === selected);
    return boundsOf(sel ? sel.rings : shapes.flatMap((s) => s.rings));
  }, [shapes, selected]);

  return (
    <MapContainer
      bounds={bounds}
      scrollWheelZoom={false}
      zoomSnap={0.25}
      className="riq-map h-[560px] w-full rounded-control"
      attributionControl
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <FitTo bounds={bounds} />
      {shapes.map(({ d, rings }) => {
        const isSel = d.id === selected;
        return (
          <Polygon
            key={d.id}
            positions={rings}
            pathOptions={{
              fillColor: fill(d.value),
              fillOpacity: selected && !isSel ? 0.25 : 0.6,
              color: isSel ? colors.ink : colors.surface,
              weight: isSel ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => router.push(d.href),
              mouseover: (e) => e.target.setStyle({ fillOpacity: 0.8 }),
              mouseout: (e) => e.target.setStyle({ fillOpacity: selected && !isSel ? 0.25 : 0.6 }),
            }}
          >
            <Tooltip sticky>
              <div className="font-bold">{d.name}</div>
              <div className="num">{d.valueLabel}</div>
              <div className="text-muted">{d.detail}</div>
            </Tooltip>
          </Polygon>
        );
      })}
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={6}
          pathOptions={{ fillColor: p.color, fillOpacity: 1, color: colors.surface, weight: 2 }}
        >
          <Tooltip>{p.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

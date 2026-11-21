'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { FleetSim } from '@/lib/ops/fleet-sim';

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const truckIcon = (color: string, heading: number, selected: boolean, broken: boolean) =>
  L.divIcon({
    className: 'riq-truck',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:9px;background:${broken ? '#9CA3AF' : color};border:2px solid ${selected ? '#17211D' : '#fff'};box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 14 14" style="transform:rotate(${heading}deg)"><path d="M7 1 L12 12 L7 9 L2 12 Z" fill="#fff"/></svg></div>`,
  });
const siteIcon = (label: string) =>
  L.divIcon({
    className: 'riq-site',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div title="${label}" style="width:22px;height:22px;border-radius:5px;background:#17211D;color:#C7F36B;font:700 11px/22px var(--font-sans);text-align:center;border:2px solid #fff">${label}</div>`,
  });
const reportIcon = (status: string) =>
  L.divIcon({
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<div class="riq-report ${status === 'new' ? 'riq-pulse' : ''}" style="width:14px;height:14px;border-radius:50%;background:${status === 'new' ? '#DC2626' : '#D97706'};border:2px solid #fff"></div>`,
  });

function Layers({ sim, version, selected, onSelect, lang }: { sim: FleetSim; version: number; selected: string | null; onSelect: (id: string) => void; lang: 'el' | 'en' }) {
  const map = useMap();
  const truckMarkers = useRef(new Map<string, L.Marker>());
  const reportMarkers = useRef(new Map<string, L.Marker>());
  // Last status drawn per report: the icon is replaced only when it changes, so the pulse is not restarted every tick.
  const reportStatus = useRef(new Map<string, string>());
  const routeLine = useRef<L.Polyline | null>(null);
  const truckColor = useMemo(() => new Map(sim.trucks.map((t) => [t.id, t.color])), [sim]);

  // Static layers: bins (coloured by the truck whose sector they are in), sites, fit to the bins.
  useEffect(() => {
    // The selected truck's route sits above the bins and below the trucks, as SVG.
    if (!map.getPane('riq-route')) map.createPane('riq-route').style.zIndex = '450';
    const renderer = L.canvas({ padding: 0.3 });
    const binMarkers = sim.bins.map((b) =>
      L.circleMarker([b.lat, b.lon], { renderer, radius: 3, weight: 0, fillColor: truckColor.get(b.truck ?? '') ?? '#64748B', fillOpacity: 0.55 })
        .bindTooltip(`${b.id} · ${b.truck ?? ''}`)
        .addTo(map),
    );
    const sites = sim.sites.map((s) => L.marker([s.lat, s.lon], { icon: siteIcon(s.id) }).bindTooltip(`${s.name[lang]} (${lang === 'el' ? 'ενδεικτική θέση' : 'demo location'})`).addTo(map));
    if (sim.bins.length) map.fitBounds(L.latLngBounds(sim.bins.map((b) => [b.lat, b.lon] as [number, number])), { padding: [20, 20] });
    return () => {
      binMarkers.forEach((m) => m.remove());
      sites.forEach((m) => m.remove());
    };
  }, [sim, map, truckColor, lang]);

  // Dynamic layers, refreshed every tick.
  useEffect(() => {
    for (const t of sim.trucks) {
      let m = truckMarkers.current.get(t.id);
      const icon = truckIcon(t.color, t.heading, t.id === selected, t.state === 'breakdown');
      if (!m) {
        m = L.marker([t.lat, t.lon], { icon, zIndexOffset: 1000 }).bindTooltip(t.id).on('click', () => onSelect(t.id)).addTo(map);
        truckMarkers.current.set(t.id, m);
      } else {
        m.setLatLng([t.lat, t.lon]);
        m.setIcon(icon);
      }
    }
    for (const r of sim.reports) {
      let m = reportMarkers.current.get(r.id);
      if (r.status === 'collected') {
        m?.remove();
        reportMarkers.current.delete(r.id);
        reportStatus.current.delete(r.id);
        continue;
      }
      if (!m) {
        m = L.marker([r.lat, r.lon], { icon: reportIcon(r.status), zIndexOffset: 900 }).bindTooltip(r.name).addTo(map);
        reportMarkers.current.set(r.id, m);
        reportStatus.current.set(r.id, r.status);
      } else if (reportStatus.current.get(r.id) !== r.status) {
        m.setIcon(reportIcon(r.status));
        reportStatus.current.set(r.id, r.status);
      }
    }
    const pts = selected ? sim.routeOf(selected) : [];
    if (pts.length > 1) {
      if (!routeLine.current)
        routeLine.current = L.polyline(pts, {
          pane: 'riq-route',
          renderer: L.svg({ pane: 'riq-route' }),
          className: 'riq-route',
          color: truckColor.get(selected!) ?? '#17211D',
          weight: 5,
          opacity: 0.9,
          dashArray: '8 6',
        }).addTo(map);
      else routeLine.current.setLatLngs(pts).setStyle({ color: truckColor.get(selected!) ?? '#17211D' });
    } else {
      routeLine.current?.remove();
      routeLine.current = null;
    }
  }, [version, sim, map, selected, onSelect, truckColor]);

  useEffect(() => {
    const trucks = truckMarkers.current;
    const reports = reportMarkers.current;
    const statuses = reportStatus.current;
    return () => {
      // Remove and forget, so a remount (React Strict Mode in dev) recreates them on the map.
      trucks.forEach((m) => m.remove());
      trucks.clear();
      reports.forEach((m) => m.remove());
      reports.clear();
      statuses.clear();
      routeLine.current?.remove();
      routeLine.current = null;
    };
  }, []);
  return null;
}

export default function FleetMapLeaflet(props: { sim: FleetSim; version: number; selected: string | null; onSelect: (id: string) => void; lang: 'el' | 'en' }) {
  return (
    <MapContainer center={[37.985, 23.735]} zoom={13} zoomSnap={0.25} scrollWheelZoom={false} preferCanvas className="riq-map h-[560px] w-full rounded-control">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <Layers {...props} />
    </MapContainer>
  );
}

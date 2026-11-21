'use client';

import type { L10n } from '@recycleiq/engine';
import { Check, Truck as TruckIcon, Wrench } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveBin } from '@/app/(dashboard)/alerts/actions';
import { FleetSim, type BinKind, type SimReport, type Stream, type TruckState } from '@/lib/ops/fleet-sim';
import { RoadGraph, type RoadData } from '@/lib/ops/router';

const FleetMap = dynamic(() => import('./fleet-map-leaflet'), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse rounded-control bg-surface-2" />,
});

export interface FleetBin {
  id: string;
  lat: number;
  lon: number;
  kind: BinKind;
}
export interface FleetReport {
  id: string;
  name: L10n;
  stream: Stream;
  lat: number;
  lon: number;
  reports: number;
}

const SPEEDS = [1, 5, 10] as const;
const TICK_MS = 500;

export function FleetView({ lang, bins, reports, sourceLabel }: { lang: 'el' | 'en'; bins: FleetBin[]; reports: FleetReport[]; sourceLabel: string }) {
  const t = (el: string, en: string) => (lang === 'el' ? el : en);
  const f = (n: number, d = 0) => n.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
  const [sim, setSim] = useState<FleetSim | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const note = useCallback((s: string) => setLog((l) => [s, ...l].slice(0, 6)), []);

  // Load the street network once, then build the fleet over the bins of the current bin source.
  useEffect(() => {
    let cancelled = false;
    fetch('/ops/roads.json')
      .then((r) => r.json() as Promise<RoadData>)
      .then((data) => {
        if (cancelled) return;
        const graph = new RoadGraph(data);
        const s = new FleetSim(
          graph,
          bins,
          reports.map((r) => ({ id: r.id, name: r.name[lang], stream: r.stream, lat: r.lat, lon: r.lon })),
        );
        s.onReportCollected = (r: SimReport) => {
          // The truck emptied the reported bin: close the report for real (also mirrored to the city's request system).
          const fd = new FormData();
          fd.set('pointId', r.id);
          resolveBin(fd).then(
            () => note(t(`✓ ${r.name}: συλλέχθηκε από ${r.assignedTruck}, η αναφορά έκλεισε.`, `✓ ${r.name}: collected by ${r.assignedTruck}, report closed.`)),
            () => note(t(`${r.name}: συλλέχθηκε, αλλά η αναφορά δεν έκλεισε (σφάλμα).`, `${r.name}: collected, but closing the report failed.`)),
          );
        };
        setSim(s);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // The fleet is built once per page load from the server-provided bins and reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sim) return;
    const id = setInterval(() => {
      sim.tick(TICK_MS / 1000, speedRef.current);
      setVersion((v) => v + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [sim]);

  const statusLabel: Record<TruckState, string> = {
    route: t('διαδρομή', 'en route'),
    idle: t('αναμονή', 'idle'),
    collecting: t('συλλογή', 'collecting'),
    unloading: t('εκφόρτωση', 'unloading'),
    breakdown: t('βλάβη', 'breakdown'),
  };
  const statusTone: Record<TruckState, string> = {
    route: 'bg-forest-50 text-forest-700',
    idle: 'bg-surface-2 text-muted',
    collecting: 'bg-info-soft text-info',
    unloading: 'bg-warn-soft text-warn',
    breakdown: 'bg-danger-soft text-danger',
  };

  if (failed) return <p className="text-body text-danger">{t('Δεν φορτώθηκε το οδικό δίκτυο.', 'The road network did not load.')}</p>;
  const k = sim?.kpi();
  const simMin = sim ? sim.simT / 60 : 0;

  return (
    <div className="flex flex-col gap-6" data-version={version}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-muted">
          {t('Χρόνος προσομοίωσης', 'Simulated time')}: <span className="num text-ink">{f(simMin, 1)} {t('λεπτά', 'min')}</span> · {sourceLabel}
        </p>
        <div className="inline-flex items-center gap-2">
          <span className="text-caption text-muted">{t('Ταχύτητα', 'Speed')}</span>
          <div className="inline-flex rounded-pill bg-surface-2 p-1" role="group" aria-label={t('Ταχύτητα προσομοίωσης', 'Simulation speed')}>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`rounded-pill px-3 py-1 text-caption ${speed === s ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink'}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          [t('Οχήματα σε λειτουργία', 'Trucks running'), `${sim?.trucks.filter((x) => x.state !== 'breakdown').length ?? 0}/${sim?.trucks.length ?? 0}`],
          [t('Συλλέχθηκαν', 'Collected'), k ? `${f(k.collectedKg)} kg` : '—'],
          [t('Ανοιχτές αναφορές πολιτών', 'Open citizen reports'), k ? f(k.openReports) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="card flex flex-col gap-2 p-4">
            <span className="eyebrow">{label}</span>
            <span className="num text-[30px] leading-none font-bold text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-4">
          {sim ? <FleetMap sim={sim} version={version} selected={selected} onSelect={setSelected} lang={lang} /> : <div className="h-[560px] w-full animate-pulse rounded-control bg-surface-2" />}
          <p className="mt-3 text-caption text-muted">
            {t('Χρώμα = όχημα και η περιοχή του · κόκκινος κύκλος = αναφορά πολίτη · πάτα ένα όχημα για να δεις τη διαδρομή του.', 'Colour = a truck and its area · red circle = citizen report · click a truck to see its route.')}
          </p>
        </section>

        <section className="card flex flex-col gap-3 p-4" aria-label={t('Αναφορές πολιτών', 'Citizen reports')}>
          <h2 className="text-h3 text-ink">
            {t('Αναφορές πολιτών', 'Citizen reports')} <span className="num text-muted">{sim?.reports.filter((r) => r.status !== 'collected').length ?? ''}</span>
          </h2>
          {!sim?.reports.length && <p className="text-body text-muted">{t('Καμία ανοιχτή αναφορά.', 'No open reports.')}</p>}
          <ul className="flex max-h-[460px] flex-col divide-y divide-line overflow-auto">
            {sim?.reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-body" title={r.name}>
                  {r.name}
                </span>
                {r.status === 'new' && (
                  <button
                    onClick={() => {
                      const tr = sim.assign(r.id);
                      if (tr) {
                        setSelected(tr.id);
                        note(t(`${r.name} → ${tr.id}`, `${r.name} → ${tr.id}`));
                      } else note(t('Κανένα διαθέσιμο όχημα.', 'No truck available.'));
                      setVersion((v) => v + 1);
                    }}
                    title={t('Ανάθεση στο πλησιέστερο όχημα', 'Assign to the nearest truck')}
                    className="flex shrink-0 items-center gap-1.5 rounded-control bg-forest-700 px-2.5 py-1 text-caption font-semibold text-white hover:bg-forest-800"
                  >
                    <TruckIcon size={14} aria-hidden /> {t('Ανάθεση', 'Assign')}
                  </button>
                )}
                {r.status === 'assigned' && <span className="shrink-0 text-caption font-semibold text-warn">{t(`${r.assignedTruck} καθ’ οδόν`, `${r.assignedTruck} on the way`)}</span>}
                {r.status === 'collected' && (
                  <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-forest-700">
                    <Check size={14} aria-hidden /> {t('Έκλεισε', 'Closed')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {log.length > 0 && (
            <ul className="mt-auto flex flex-col gap-1 border-t border-line pt-2 text-caption text-muted" aria-live="polite">
              {log.slice(0, 3).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-h3 text-ink">{t('Οχήματα', 'Trucks')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-body">
            <thead className="text-caption text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">{t('Όχημα', 'Truck')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Κατάσταση', 'Status')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Φορτίο', 'Load')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Κάδοι', 'Bins')}</th>
                <th className="py-2 font-semibold">
                  <span className="sr-only">{t('Ενέργειες', 'Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sim?.trucks.map((tr) => (
                <tr key={tr.id} className={`cursor-pointer ${selected === tr.id ? 'bg-forest-50' : 'hover:bg-surface-2'}`} onClick={() => setSelected(tr.id === selected ? null : tr.id)}>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="inline-block size-3 rounded-[3px]" style={{ background: tr.color }} />
                      <span className="font-semibold">{tr.id}</span>
                      <span className="text-caption text-muted">{tr.type === 'recycling' ? t('ανακύκλωση', 'recycling') : t('σύμμεικτα', 'mixed')}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${statusTone[tr.state]}`}>{statusLabel[tr.state]}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="h-2.5 w-28 rounded-r-[4px] bg-surface-2" role="img" aria-label={`${f((tr.loadKg / tr.capacityKg) * 100)}%`}>
                      <div className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.min(100, (tr.loadKg / tr.capacityKg) * 100)}%`, background: tr.color }} />
                    </div>
                  </td>
                  <td className="num py-2 pr-3 text-right">{f(tr.sector.length)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sim.breakdown(tr.id)) note(t(`Βλάβη στο ${tr.id}: οι αναφορές του ξαναμοιράζονται.`, `${tr.id} broke down: its reports are reassigned.`));
                        setVersion((v) => v + 1);
                      }}
                      disabled={tr.state === 'breakdown'}
                      title={t('Προσομοίωση βλάβης', 'Simulate a breakdown')}
                      aria-label={t(`Βλάβη στο ${tr.id}`, `Breakdown on ${tr.id}`)}
                      className="inline-flex items-center rounded-control bg-surface-2 p-1.5 text-ink hover:bg-line disabled:opacity-40"
                    >
                      <Wrench size={13} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

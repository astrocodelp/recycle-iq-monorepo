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

const SPEEDS = [1, 2, 5, 10] as const;
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          [t('Διαθεσιμότητα στόλου', 'Fleet availability'), k ? `${f(k.availability * 100)}%` : '—', `${sim?.trucks.filter((x) => x.state !== 'breakdown').length ?? 0}/${sim?.trucks.length ?? 0} ${t('οχήματα', 'trucks')}`],
          [t('Χιλιόμετρα', 'Kilometres'), k ? f(k.km, 1) : '—', t('σε πραγματικούς δρόμους', 'on real streets')],
          [t('Συλλογή', 'Collected'), k ? `${f(k.collectedKg)} kg` : '—', k ? `${t('σύμμεικτα', 'mixed')} ${f(k.collectedGeneralKg)} · ${t('ανακύκλ.', 'recycl.')} ${f(k.collectedRecyclingKg)}` : ''],
          [t('kg ανά km', 'kg per km'), k?.kgPerKm != null ? f(k.kgPerKm, 1) : '—', t('αποδοτικότητα', 'efficiency')],
          [t('Κάδοι > 80%', 'Bins > 80%'), k ? f(k.binsOver80) : '—', `${t('από', 'of')} ${f(sim?.bins.length ?? 0)}`],
          [t('Ανοιχτές αναφορές', 'Open reports'), k ? f(k.openReports) : '—', k?.avgResponseMin != null ? `${t('μέση απόκριση', 'avg response')} ${f(k.avgResponseMin, 1)}′` : t('από πολίτες', 'from citizens')],
        ].map(([label, value, hint]) => (
          <div key={label} className="card flex flex-col gap-2 p-4">
            <span className="eyebrow">{label}</span>
            <span className="num text-[26px] leading-none font-bold text-ink">{value}</span>
            <span className="text-caption text-muted">{hint}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-4">
          {sim ? <FleetMap sim={sim} version={version} selected={selected} onSelect={setSelected} lang={lang} /> : <div className="h-[560px] w-full animate-pulse rounded-control bg-surface-2" />}
          <p className="mt-3 text-caption text-muted">
            {t(
              'Κάδοι: χρώμα = όχημα του τομέα, ένταση = πληρότητα, μαύρο περίγραμμα = πάνω από 80%. Τετράγωνα: μονάδες (ενδεικτικές θέσεις). Κόκκινοι κύκλοι: αναφορές πολιτών. Πάτα ένα όχημα για τη διαδρομή του.',
              'Bins: colour = the sector’s truck, intensity = fill, dark ring = over 80%. Squares: plants (demo locations). Red circles: citizen reports. Click a truck for its route.',
            )}
          </p>
        </section>

        <section className="card flex flex-col gap-3 p-4" aria-label={t('Αναφορές πολιτών', 'Citizen reports')}>
          <h2 className="text-h3 text-ink">{t('Αναφορές πολιτών', 'Citizen reports')}</h2>
          <p className="text-caption text-muted">{t('Ανοιχτές αναφορές γεμάτων κάδων από την εφαρμογή. Όταν το όχημα αδειάσει τον κάδο, η αναφορά κλείνει.', 'Open full-bin reports from the app. When the truck empties the bin, the report closes.')}</p>
          {!sim?.reports.length && <p className="text-body text-muted">{t('Καμία ανοιχτή αναφορά.', 'No open reports.')}</p>}
          <ul className="flex max-h-[420px] flex-col divide-y divide-line overflow-auto">
            {sim?.reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 py-2.5">
                <span className="text-body font-semibold">{r.name}</span>
                <span className="text-caption text-muted">
                  {r.stream === 'recycling' ? t('Ανακύκλωση', 'Recycling') : t('Σύμμεικτα', 'Mixed waste')}
                  {r.binIdx === undefined && ` · ${t('εκτός τρέχουσας πηγής κάδων', 'outside the current bin source')}`}
                </span>
                {r.status === 'new' && (
                  <button
                    onClick={() => {
                      const tr = sim.assign(r.id);
                      if (tr) {
                        setSelected(tr.id);
                        note(t(`${r.name} → ${tr.id} (${tr.plate})`, `${r.name} → ${tr.id} (${tr.plate})`));
                      } else note(t('Κανένα διαθέσιμο όχημα.', 'No truck available.'));
                      setVersion((v) => v + 1);
                    }}
                    className="flex w-fit items-center gap-1.5 rounded-control bg-forest-700 px-3 py-1.5 text-caption font-semibold text-white hover:bg-forest-800"
                  >
                    <TruckIcon size={14} aria-hidden /> {t('Ανάθεση στο πλησιέστερο όχημα', 'Assign to the nearest truck')}
                  </button>
                )}
                {r.status === 'assigned' && <span className="text-caption font-semibold text-warn">{t(`Ανατέθηκε στο ${r.assignedTruck}, καθ’ οδόν`, `Assigned to ${r.assignedTruck}, on the way`)}</span>}
                {r.status === 'collected' && (
                  <span className="flex items-center gap-1 text-caption font-semibold text-forest-700">
                    <Check size={14} aria-hidden /> {t('Συλλέχθηκε', 'Collected')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {log.length > 0 && (
            <ul className="mt-auto flex flex-col gap-1 border-t border-line pt-2 text-caption text-muted" aria-live="polite">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-4">
        <h2 className="text-h3 text-ink">{t('Στόλος και κατανομή', 'Fleet and allocation')}</h2>
        <p className="mb-3 text-caption text-muted">
          {t(
            'Κάθε όχημα έχει έναν τομέα κάδων (ομαδοποίηση k-means ανά ροή): σύμμεικτα και ανακύκλωση. Αδειάζει πρώτα τους πιο γεμάτους και κοντινούς κάδους του και εκφορτώνει όταν γεμίσει 85%.',
            'Each truck owns a sector of bins (k-means per stream): mixed waste and recycling. It empties its fullest nearby bins first and unloads at 85% full.',
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-body">
            <thead className="text-caption text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">{t('Όχημα', 'Truck')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Ροή', 'Stream')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Κατάσταση', 'Status')}</th>
                <th className="py-2 pr-3 font-semibold">{t('Φορτίο', 'Load')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Κάδοι τομέα', 'Sector bins')}</th>
                <th className="py-2 pr-3 text-right font-semibold">km</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('Συλλογή kg', 'Collected kg')}</th>
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
                      <span className="num text-caption text-muted">{tr.plate}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-caption">{tr.type === 'recycling' ? t('Ανακύκλωση', 'Recycling') : t('Σύμμεικτα', 'Mixed')}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${statusTone[tr.state]}`}>{statusLabel[tr.state]}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-24 rounded-r-[4px] bg-surface-2" aria-hidden>
                        <div className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.min(100, (tr.loadKg / tr.capacityKg) * 100)}%`, background: tr.color }} />
                      </div>
                      <span className="num text-caption text-muted">
                        {f(tr.loadKg)}/{f(tr.capacityKg)} kg
                      </span>
                    </div>
                  </td>
                  <td className="num py-2 pr-3 text-right">{f(tr.sector.length)}</td>
                  <td className="num py-2 pr-3 text-right">{f(tr.km, 1)}</td>
                  <td className="num py-2 pr-3 text-right">{f(tr.collectedKg)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sim.breakdown(tr.id)) note(t(`Βλάβη στο ${tr.id}: οι αναφορές του επιστρέφουν για ανάθεση.`, `${tr.id} broke down: its reports return to the queue.`));
                        setVersion((v) => v + 1);
                      }}
                      disabled={tr.state === 'breakdown'}
                      className="inline-flex items-center gap-1 rounded-control bg-surface-2 px-2.5 py-1 text-caption font-semibold text-ink hover:bg-line disabled:opacity-40"
                    >
                      <Wrench size={13} aria-hidden /> {t('Βλάβη', 'Breakdown')}
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

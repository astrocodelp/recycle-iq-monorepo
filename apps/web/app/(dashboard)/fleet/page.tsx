import { FleetView } from '@/components/ops/fleet-view';
import { DemoBadge } from '@/components/ui';
import { getBinSource } from '@/lib/bins';
import { getLang, tr } from '@/lib/lang';
import { getFleetBins, getOpenReportLocations } from '@/lib/ops/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Στόλος' };

/**
 * Garbage-truck fleet on real Athens streets (OpenStreetMap road graph, A* routing), run in the browser.
 * Port of the RecycleIQ Delta Sort ops simulation (github.com/Mike17K/recycleiq-delta-sort). See docs/OPS.md.
 */
export default async function FleetPage() {
  const lang = await getLang();
  const t = tr(lang);
  const source = await getBinSource();
  const [bins, reports] = await Promise.all([getFleetBins(source), getOpenReportLocations()]);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{t('Λειτουργίες', 'Operations')}</p>
        <h1 className="mt-1 text-h1">{t('Στόλος απορριμματοφόρων', 'Garbage-truck fleet')}</h1>
        <p className="mt-1 max-w-3xl text-body text-muted">
          {t(
            'Τα οχήματα κινούνται στους πραγματικούς δρόμους της Αθήνας (μονόδρομοι, ταχύτητα ανά κατηγορία δρόμου) και αδειάζουν πρώτα τους πιο γεμάτους κάδους του τομέα τους. Οι αναφορές πολιτών ανατίθενται στο πλησιέστερο όχημα.',
            'Trucks drive on the real streets of Athens (one-way streets, speed per road class) and empty the fullest bins of their sector first. Citizen reports go to the nearest truck.',
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <DemoBadge>{t('Προσομοίωση: στόλος, κινήσεις και πληρότητα κάδων', 'Simulation: fleet, movements and bin fill')}</DemoBadge>
          <DemoBadge>{t('Οι αναφορές πολιτών και το κλείσιμό τους είναι πραγματικά', 'Citizen reports and closing them are real')}</DemoBadge>
        </div>
      </header>
      <FleetView
        lang={lang}
        bins={bins.map(({ id, lat, lon, kind }) => ({ id, lat, lon, kind }))}
        reports={reports}
        sourceLabel={
          source === 'osm'
            ? t(`${bins.length} πραγματικοί κάδοι · δρόμοι © OpenStreetMap`, `${bins.length} real bins · streets © OpenStreetMap`)
            : t(`${bins.length} συνθετικοί κάδοι · δρόμοι © OpenStreetMap`, `${bins.length} synthetic bins · streets © OpenStreetMap`)
        }
      />
    </div>
  );
}

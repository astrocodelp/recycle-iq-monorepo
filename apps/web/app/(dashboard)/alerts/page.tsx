import { AlertTriangle, Check, Clock, Wrench } from 'lucide-react';
import { AutoRefresh } from '@/components/auto-refresh';
import { Badge, Card, DemoBadge, Kpi } from '@/components/ui';
import { fmt } from '@/lib/format';
import { getLang, tr } from '@/lib/lang';
import { athensEnabled, CITY_STATUS_LABEL, syncCityStatuses, type CityStatus } from '@/lib/athens';
import { getAlertStats, getBulkyRequests, getOpenAlerts } from '@/lib/queries';
import { acknowledgeBin, resolveBin } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ειδοποιήσεις' };

export default async function Alerts() {
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  // Pull the city's latest status for the requests we filed (AthensGov), then read.
  const before = await Promise.all([getOpenAlerts(), getBulkyRequests()]);
  await syncCityStatuses([...before[0], ...before[1]].map((x) => x.cityRequestId).filter((x): x is string => !!x)).catch(() => {});
  const [alerts, stats, bulky] = await Promise.all([getOpenAlerts(), getAlertStats(), getBulkyRequests()]);
  const city = athensEnabled();
  const cityLabel = (s: string | null) => (s && s in CITY_STATUS_LABEL ? t(CITY_STATUS_LABEL[s as CityStatus]) : '—');
  const kindLabel: Record<string, string> = {
    full: t('Γεμάτος', 'Full'),
    overflowing: t('Ξεχειλίζει', 'Overflowing'),
    damaged: t('Χαλασμένος', 'Damaged'),
  };

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <header>
        <p className="eyebrow">{t('Αναφορές πολιτών', 'Citizen reports')}</p>
        <h1 className="mt-1 text-h1">{t('Γεμάτοι κάδοι', 'Full bins')}</h1>
        <p className="mt-1 max-w-3xl text-body text-muted">
          {t(
            'Οι κάτοικοι φωτογραφίζουν έναν γεμάτο ή χαλασμένο κάδο και η αναφορά έρχεται εδώ. Η φωτογραφία ελέγχεται στο κινητό και δεν αποστέλλεται. Η σελίδα ανανεώνεται μόνη της.',
            'Residents photograph a full or damaged bin and the report arrives here. The photo is checked on the phone and never uploaded. This page refreshes itself.',
          )}
        </p>
        <div className="mt-2">
          <DemoBadge>{t('Συνθετικά δεδομένα επίδειξης', 'Synthetic demo data')}</DemoBadge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label={t('Νέες αναφορές', 'New reports')} value={f.n(stats.open)} hint={t('χωρίς ανάληψη', 'not yet taken on')} />
        <Kpi label={t('Σε εξέλιξη', 'In progress')} value={f.n(stats.acknowledged)} hint={t('συνεργείο ενημερώθηκε', 'crew notified')} />
        <Kpi label={t('Επιλύθηκαν', 'Resolved')} value={f.n(stats.resolved7)} hint={t('τις τελευταίες 7 ημέρες', 'in the last 7 days')} />
        <Kpi
          label={t('Μέσος χρόνος επίλυσης', 'Avg time to resolve')}
          value={stats.avgHoursToResolve ? `${f.n(Math.round(stats.avgHoursToResolve * 10) / 10)} ${t('ώρ.', 'h')}` : '—'}
          hint={t('τελευταίες 7 ημέρες', 'last 7 days')}
        />
      </div>

      <Card title={t('Κάδοι που χρειάζονται ενέργεια', 'Bins that need action')} subtitle={t('Ένα στοιχείο ανά κάδο, οι παλαιότερες πρώτα', 'One row per bin, oldest first')}>
        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 text-body text-muted">
            <Check size={18} /> {t('Καμία ανοιχτή αναφορά.', 'No open reports.')}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.pointId} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
                <span className={`flex size-9 items-center justify-center rounded-control ${a.status === 'open' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}>
                  {a.kinds.includes('damaged') ? <Wrench size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
                </span>
                <div className="min-w-56 flex-1">
                  <p className="text-body font-semibold">{t(a.pointName)}</p>
                  <p className="text-caption text-muted">{a.district ? t(a.district) : '—'}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.kinds.map((k) => (
                    <Badge key={k} tone={k === 'damaged' ? 'neutral' : 'danger'}>{kindLabel[k] ?? k}</Badge>
                  ))}
                </div>
                <span className="w-28 text-caption text-muted">
                  {t(`${a.reports} ${a.reports === 1 ? 'αναφορά' : 'αναφορές'}`, `${a.reports} ${a.reports === 1 ? 'report' : 'reports'}`)}
                </span>
                <span className="flex w-28 items-center gap-1 text-caption text-muted">
                  <Clock size={13} aria-hidden /> {f.ago(a.firstAt)}
                </span>
                {city && (
                  <span className="w-36 text-caption text-muted" title={a.cityRequestId ?? undefined}>
                    {t('Δήμος:', 'City:')} <span className="font-semibold text-ink">{a.cityRequestId ? cityLabel(a.cityStatus) : t('δεν στάλθηκε', 'not sent')}</span>
                  </span>
                )}
                <span className="w-28">
                  {a.status === 'open' ? <Badge tone="danger">{t('Νέα', 'New')}</Badge> : <Badge tone="warn">{t('Σε εξέλιξη', 'In progress')}</Badge>}
                </span>
                <div className="flex gap-2">
                  {a.status === 'open' && (
                    <form action={acknowledgeBin}>
                      <input type="hidden" name="pointId" value={a.pointId} />
                      <button className="rounded-control bg-surface-2 px-3 py-1.5 text-caption font-semibold text-ink hover:bg-line">
                        {t('Ανάληψη', 'Take on')}
                      </button>
                    </form>
                  )}
                  <form action={resolveBin}>
                    <input type="hidden" name="pointId" value={a.pointId} />
                    <button className="rounded-control bg-forest-700 px-3 py-1.5 text-caption font-semibold text-white hover:bg-forest-800">
                      {t('Επιλύθηκε', 'Resolved')}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title={t('Παραλαβές ογκωδών', 'Bulky item pickups')}
        subtitle={
          city
            ? t('Αιτήματα κατοίκων από την εφαρμογή, καταχωρημένα στο σύστημα αιτημάτων του Δήμου', 'Requests from the app, filed in the city request system')
            : t('Η σύνδεση με το σύστημα αιτημάτων του Δήμου δεν είναι ενεργή (ATHENS_API_KEY).', 'The city request system is not connected (ATHENS_API_KEY).')
        }
      >
        {bulky.length === 0 ? (
          <p className="text-body text-muted">{t('Κανένα αίτημα ακόμη.', 'No requests yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {bulky.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 py-2.5 text-body">
                <span className="flex-1 font-semibold">{b.district ? t(b.district) : t('Χωρίς γειτονιά', 'No neighbourhood')}</span>
                <span className="num text-caption text-muted">{b.cityRequestId}</span>
                <span className="w-28 text-caption text-muted">{f.ago(b.createdAt)}</span>
                <Badge tone={b.cityStatus === 'resolved' ? 'neutral' : 'warn'}>{cityLabel(b.cityStatus)}</Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-caption text-muted">
          {t('Η διεύθυνση παραλαβής πηγαίνει μόνο στον Δήμο· το RecycleIQ κρατά τη γειτονιά και την κατάσταση.', 'The pickup address goes only to the city; RecycleIQ keeps the neighbourhood and the status.')}
        </p>
      </Card>
    </div>
  );
}

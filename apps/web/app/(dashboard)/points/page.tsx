import { Badge, Card, DemoBadge } from '@/components/ui';
import { getDistricts, getPoints } from '@/lib/data';
import { daysSince, fmt } from '@/lib/format';
import { getLang, tr } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Σημεία συλλογής' };

const KINDS = {
  blue_bin: ['Μπλε κάδος', 'Blue bin'],
  glass_bell: ['Καμπάνα γυαλιού', 'Glass bell'],
  brown_bin: ['Καφέ κάδος', 'Brown bin'],
  battery_point: ['Μπαταρίες', 'Batteries'],
  weee_point: ['Ηλεκτρικές συσκευές', 'WEEE'],
  clothing_bin: ['Ρούχα', 'Clothes'],
  green_point: ['Πράσινο σημείο', 'Green point'],
} as const;

export default async function PointsPage({ searchParams }: PageProps<'/points'>) {
  const sp = await searchParams;
  const kind = typeof sp.kind === 'string' && sp.kind in KINDS ? (sp.kind as keyof typeof KINDS) : undefined;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  const [points, districts] = await Promise.all([getPoints(), getDistricts()]);
  const dName = new Map(districts.map((d) => [d.id, d.name]));
  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  const shown = points
    .filter((p) => !kind || p.kind === kind)
    .filter((p) => !status || p.status === status)
    .sort((a, b) => (a.districtId ?? '').localeCompare(b.districtId ?? '') || a.id.localeCompare(b.id));
  const stale = points.filter((p) => p.lastVerifiedAt && daysSince(p.lastVerifiedAt) > 30).length;
  const href = (k?: string, s?: string) => {
    const p = new URLSearchParams();
    if (k) p.set('kind', k);
    if (s) p.set('status', s);
    return `/points${p.size ? `?${p}` : ''}`;
  };
  const kindLabel = (k: string) => {
    const v = KINDS[k as keyof typeof KINDS];
    return v ? t(v[0], v[1]) : k;
  };
  const statusLabel = { available: t('Διαθέσιμο', 'Available'), full: t('Γεμάτο', 'Full'), closed: t('Εκτός λειτουργίας', 'Out of service') };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{t('Υποδομή', 'Infrastructure')}</p>
        <h1 className="mt-1 text-h1">{t('Σημεία συλλογής', 'Collection points')}</h1>
        <p className="mt-1 text-body text-muted">
          {t(
            `${f.n(points.length)} σημεία · ${f.n(stale)} δεν έχουν επιβεβαιωθεί τις τελευταίες 30 ημέρες (κανόνας ATH-LOC-01).`,
            `${f.n(points.length)} points · ${f.n(stale)} not verified in the last 30 days (rule ATH-LOC-01).`,
          )}
        </p>
        <a href="/points/qr" className="mt-2 inline-block text-caption font-semibold text-forest-700 hover:underline">
          {t('Εκτύπωση QR αυτοκόλλητων για κάδους', 'Print QR stickers for bins')} →
        </a>
        <div className="mt-2">
          <DemoBadge>{t('Ενδεικτικά σημεία για την παρουσίαση — όχι επίσημα δημοτικά δεδομένα', 'Illustrative locations — not official municipal data')}</DemoBadge>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <a href={href(undefined, status)} className={`rounded-pill px-3 py-1.5 text-caption ${!kind ? 'bg-ink text-white' : 'bg-surface-2 text-muted'}`}>
          {t('Όλα', 'All')} · {f.n(points.length)}
        </a>
        {Object.entries(KINDS).map(([k, [el, en]]) => (
          <a key={k} href={href(k, status)} className={`rounded-pill px-3 py-1.5 text-caption ${kind === k ? 'bg-ink text-white' : 'bg-surface-2 text-muted'}`}>
            {t(el, en)} · {f.n(counts.get(k) ?? 0)}
          </a>
        ))}
        <span className="mx-2 w-px bg-line" />
        {(['full', 'closed'] as const).map((s) => (
          <a key={s} href={href(kind, status === s ? undefined : s)} className={`rounded-pill px-3 py-1.5 text-caption ${status === s ? 'bg-ink text-white' : 'bg-surface-2 text-muted'}`}>
            {statusLabel[s]}
          </a>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-body">
            <thead>
              <tr className="text-left text-caption text-muted">
                <th className="pb-2 font-semibold">{t('Σημείο', 'Point')}</th>
                <th className="pb-2 font-semibold">{t('Τύπος', 'Type')}</th>
                <th className="pb-2 font-semibold">{t('Συνοικία', 'District')}</th>
                <th className="pb-2 font-semibold">{t('Κατάσταση', 'Status')}</th>
                <th className="pb-2 text-right font-semibold">{t('Επιβεβαίωση', 'Verified')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const days = p.lastVerifiedAt ? daysSince(p.lastVerifiedAt) : null;
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2">{t(p.name)}</td>
                    <td className="py-2 text-muted">{kindLabel(p.kind)}</td>
                    <td className="py-2 text-muted">{p.districtId && dName.get(p.districtId) ? t(dName.get(p.districtId)!) : '—'}</td>
                    <td className="py-2">
                      <Badge tone={p.status === 'available' ? 'forest' : p.status === 'full' ? 'warn' : 'danger'}>{statusLabel[p.status]}</Badge>
                    </td>
                    <td className={`num py-2 text-right ${days != null && days > 30 ? 'text-warn' : 'text-muted'}`}>
                      {days == null ? '—' : t(`${days} ημ.`, `${days} d`)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { Badge, Card, DemoBadge } from '@/components/ui';
import { getDistricts, getPoints } from '@/lib/data';
import { getBinSource } from '@/lib/bins';
import { daysSince, fmt } from '@/lib/format';
import { getLang, tr } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Σημεία συλλογής' };

const PER_PAGE = 50;
const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
const OSM_TAGS = 'https://wiki.openstreetmap.org/wiki/Tag:amenity%3Drecycling';
/** The point on openstreetmap.org, where its tags and edit history can be checked. */
const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`;

const KINDS = {
  blue_bin: ['Μπλε κάδος', 'Blue bin'],
  glass_bell: ['Καμπάνα γυαλιού', 'Glass bell'],
  brown_bin: ['Καφέ κάδος', 'Brown bin'],
  battery_point: ['Μπαταρίες', 'Batteries'],
  weee_point: ['Ηλεκτρικές συσκευές', 'WEEE'],
  clothing_bin: ['Ρούχα', 'Clothes'],
  green_point: ['Πράσινο σημείο', 'Green point'],
  general_bin: ['Σύμμεικτα', 'Mixed waste'],
  litter_bin: ['Καλάθι απορριμμάτων', 'Litter bin'],
} as const;

export default async function PointsPage({ searchParams }: PageProps<'/points'>) {
  const sp = await searchParams;
  const kind = typeof sp.kind === 'string' && sp.kind in KINDS ? (sp.kind as keyof typeof KINDS) : undefined;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const pageArg = typeof sp.page === 'string' ? Number.parseInt(sp.page, 10) : 1;
  const lang = await getLang();
  const t = tr(lang);
  const f = fmt(lang);
  const source = await getBinSource();
  const [points, districts] = await Promise.all([getPoints(source), getDistricts()]);
  const dName = new Map(districts.map((d) => [d.id, d.name]));
  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  const shown = points
    .filter((p) => !kind || p.kind === kind)
    .filter((p) => !status || p.status === status)
    .sort((a, b) => (a.districtId ?? '').localeCompare(b.districtId ?? '') || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Number.isFinite(pageArg) ? Math.min(Math.max(1, pageArg), pages) : 1;
  const rows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const stale = points.filter((p) => p.lastVerifiedAt && daysSince(p.lastVerifiedAt) > 30).length;
  const href = (k?: string, s?: string, pg?: number) => {
    const p = new URLSearchParams();
    if (k) p.set('kind', k);
    if (s) p.set('status', s);
    if (pg && pg > 1) p.set('page', String(pg));
    return `/points${p.size ? `?${p}` : ''}`;
  };
  const kindLabel = (k: string) => {
    const v = KINDS[k as keyof typeof KINDS];
    return v ? t(v[0], v[1]) : k;
  };
  const statusLabel = { available: t('Διαθέσιμο', 'Available'), full: t('Γεμάτο', 'Full'), closed: t('Εκτός λειτουργίας', 'Out of service') };

  return (
    <div className="flex flex-col gap-6 pb-16">
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
          {source === 'osm' ? (
            <p className="flex flex-wrap items-center gap-2 text-caption text-muted">
              <Badge tone="neutral">{t('Πραγματικοί κάδοι από το OpenStreetMap', 'Real bins from OpenStreetMap')}</Badge>
              <span>
                {t('Πηγή: ', 'Source: ')}
                <a href={OSM_COPYRIGHT} target="_blank" rel="noopener" className="font-semibold text-forest-700 hover:underline">
                  © OpenStreetMap contributors, ODbL 1.0
                </a>
                {t(' · σημεία ', ' · points tagged ')}
                <a href={OSM_TAGS} target="_blank" rel="noopener" className="hover:underline">
                  amenity=recycling
                </a>
                {t(', waste_disposal και waste_basket μέσα στα όρια του Δήμου Αθηναίων. Κάθε σημείο ανοίγει στο openstreetmap.org.', ', waste_disposal and waste_basket inside the City of Athens. Each point opens on openstreetmap.org.')}
              </span>
            </p>
          ) : (
            <DemoBadge>{t('Ενδεικτικά σημεία για την παρουσίαση — όχι επίσημα δημοτικά δεδομένα', 'Illustrative locations — not official municipal data')}</DemoBadge>
          )}
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
        {pages > 1 && (
          <p className="num mb-3 flex items-center justify-end gap-3 text-caption text-muted">
            <span>{t(`Σελίδα ${page} από ${pages}`, `Page ${page} of ${pages}`)}</span>
            <PageLink href={href(kind, status, page - 1)} disabled={page === 1} label="←" />
            <PageLink href={href(kind, status, page + 1)} disabled={page === pages} label="→" />
          </p>
        )}
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
              {rows.map((p) => {
                const days = p.lastVerifiedAt ? daysSince(p.lastVerifiedAt) : null;
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2">
                      {p.source === 'osm' ? (
                        <a href={osmLink(p.lat, p.lng)} target="_blank" rel="noopener" className="hover:underline" title={t('Άνοιγμα στο OpenStreetMap', 'Open on OpenStreetMap')}>
                          {t(p.name)} <span className="text-caption text-muted">↗</span>
                        </a>
                      ) : (
                        t(p.name)
                      )}
                    </td>
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
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-caption text-muted" aria-label={t('Σελίδες', 'Pages')}>
          <span className="num">
            {shown.length === 0
              ? t('Κανένα σημείο', 'No points')
              : t(
                  `${f.n((page - 1) * PER_PAGE + 1)}–${f.n((page - 1) * PER_PAGE + rows.length)} από ${f.n(shown.length)}`,
                  `${f.n((page - 1) * PER_PAGE + 1)}–${f.n((page - 1) * PER_PAGE + rows.length)} of ${f.n(shown.length)}`,
                )}
          </span>
          {pages > 1 && (
            <span className="flex items-center gap-1">
              <PageLink href={href(kind, status, page - 1)} disabled={page === 1} label={t('← Προηγούμενη', '← Previous')} />
              {pageList(page, pages).map((pg, i) =>
                pg === 0 ? (
                  <span key={`gap-${i}`} className="px-1">…</span>
                ) : (
                  <a
                    key={pg}
                    href={href(kind, status, pg)}
                    aria-current={pg === page ? 'page' : undefined}
                    className={`num min-w-8 rounded-[8px] px-2 py-1 text-center ${pg === page ? 'bg-ink text-white' : 'hover:bg-surface-2 hover:text-ink'}`}
                  >
                    {pg}
                  </a>
                ),
              )}
              <PageLink href={href(kind, status, page + 1)} disabled={page === pages} label={t('Επόμενη →', 'Next →')} />
            </span>
          )}
        </nav>
      </Card>
    </div>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span className="px-2 py-1 opacity-40">{label}</span>;
  return (
    <a href={href} className="rounded-[8px] px-2 py-1 hover:bg-surface-2 hover:text-ink">
      {label}
    </a>
  );
}

/** 1 … 4 5 6 … 24: first, last and the current page with its neighbours; 0 marks a gap. */
function pageList(page: number, pages: number): number[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const out: number[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push(0);
    out.push(n);
    prev = n;
  }
  return out;
}

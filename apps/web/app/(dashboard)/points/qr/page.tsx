import { LogoMark } from '@/components/logo';
import { getDistricts, getPoints } from '@/lib/data';
import { getLang, tr } from '@/lib/lang';
import { qrSvg } from '@/lib/qr';
import { siteUrl } from '@/lib/site';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'QR αυτοκόλλητα' };

/** Printable QR stickers for the bins of one neighbourhood (A4, 3 per row). */
export default async function QrSheet({ searchParams }: PageProps<'/points/qr'>) {
  const sp = await searchParams;
  const t = tr(await getLang());
  const [districts, points, base] = await Promise.all([getDistricts(), getPoints(), siteUrl()]);
  const districtId = typeof sp.district === 'string' ? sp.district : districts[0]?.id;
  const district = districts.find((d) => d.id === districtId);
  const bins = points.filter((p) => p.districtId === districtId).sort((a, b) => a.kind.localeCompare(b.kind));
  const stickers = await Promise.all(bins.map(async (p) => ({ p, url: `${base}/b/${p.id}`, svg: await qrSvg(`${base}/b/${p.id}`) })));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="eyebrow">{t('Σημεία συλλογής', 'Collection points')}</p>
          <h1 className="mt-1 text-h1">{t('QR αυτοκόλλητα για κάδους', 'QR stickers for bins')}</h1>
          <p className="mt-1 max-w-2xl text-body text-muted">
            {t(
              'Κάθε αυτοκόλλητο ανοίγει την εφαρμογή στον συγκεκριμένο κάδο. Ο κάτοικος δεν χρειάζεται να δώσει τοποθεσία: ο κάδος δηλώνει τη γειτονιά.',
              'Each sticker opens the app at that bin. Residents never share their location: the bin tells the app the neighbourhood.',
            )}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <select name="district" defaultValue={districtId} className="rounded-control border border-line-strong bg-surface px-3 py-2 text-body">
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {t(d.name)}
              </option>
            ))}
          </select>
          <button className="rounded-control bg-ink px-3 py-2 text-body font-semibold text-white">{t('Εμφάνιση', 'Show')}</button>
          <PrintButton label={t('Εκτύπωση', 'Print')} />
        </form>
      </header>
      <p className="text-body text-muted print:hidden">
        {t(`${bins.length} κάδοι στη συνοικία ${district?.name.el ?? ''}`, `${bins.length} bins in ${district?.name.en ?? ''}`)}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-3">
        {stickers.map(({ p, svg, url }) => (
          <div key={p.id} className="flex break-inside-avoid flex-col items-center gap-2 rounded-card border-2 border-forest-700 bg-white p-4 text-center">
            <div className="flex items-center gap-2">
              <LogoMark size={24} />
              <span className="text-[14px] font-extrabold tracking-[-0.03em]">
                Recycle<span className="text-forest-500">IQ</span>
              </span>
            </div>
            <div className="w-40" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="text-[15px] leading-tight font-extrabold">{t('Σκάναρε πριν το πετάξεις', 'Scan before you throw')}</p>
            <p className="text-caption text-muted">{t('Μάθε σε ποιον κάδο πάει · ανέφερε αν είναι γεμάτος', 'Learn which bin · report it if full')}</p>
            <p className="text-[11px] text-muted">{t(p.name)}</p>
            <p className="num text-[9px] break-all text-faint">{url}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

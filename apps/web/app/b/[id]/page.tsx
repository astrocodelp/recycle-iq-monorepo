import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LogoMark } from '@/components/logo';
import { DemoBadge } from '@/components/ui';
import { getDistricts, pointById } from '@/lib/data';
import { getLang, tr } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Κάδος', robots: { index: false } };

/**
 * Where a bin's QR sticker lands. Opens the app straight to this bin (recycleiq://bin/<id>);
 * without the app, explains what it is and how to get it. No location is asked for: the bin
 * itself tells the app the neighbourhood.
 */
export default async function BinLanding({ params }: PageProps<'/b/[id]'>) {
  const { id } = await params;
  const [point, districts] = await Promise.all([pointById(id), getDistricts()]);
  if (!point) notFound();
  const t = tr(await getLang());
  const district = districts.find((d) => d.id === point.districtId);
  const deepLink = `recycleiq://bin/${encodeURIComponent(point.id)}`;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <div className="flex items-center gap-2.5">
        <LogoMark size={40} />
        <div className="text-[20px] font-extrabold tracking-[-0.03em]">
          Recycle<span className="text-forest-500">IQ</span>
        </div>
      </div>
      <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
        {t('Ξέρεις τι. Ξέρεις πού. Ανακυκλώνεις σωστά.', 'Know what. Know where. Recycle right.')}
      </h1>
      <div className="card p-5">
        <p className="eyebrow">{t('Αυτός ο κάδος', 'This bin')}</p>
        <p className="mt-1 text-h2">{t(point.name)}</p>
        {point.street && <p className="text-body text-muted">{t(point.street)}</p>}
        {district && <p className="mt-2 text-body">{t(`Γειτονιά: ${district.name.el}`, `Neighbourhood: ${district.name.en}`)}</p>}
      </div>
      <a href={deepLink} className="flex h-13 items-center justify-center rounded-card bg-forest-700 px-5 py-3.5 text-[15px] font-semibold text-white shadow-btn-primary">
        {t('Άνοιξε στην εφαρμογή', 'Open in the app')}
      </a>
      <div className="card p-5 text-body">
        <p className="font-bold">{t('Δεν έχεις την εφαρμογή;', "Don't have the app?")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>{t('Φωτογράφισε ό,τι θες να πετάξεις και μάθε σε ποιον κάδο πάει.', 'Snap what you want to throw away and learn which bin it goes in.')}</li>
          <li>{t('Ανέβα στην κατάταξη της γειτονιάς σου όσο περισσότερο σκανάρεις.', 'Climb your neighbourhood leaderboard as you scan.')}</li>
          <li>{t('Γεμάτος κάδος; Φωτογράφισέ τον και ενημερώνεται ο Δήμος.', 'Full bin? Snap it and the municipality is notified.')}</li>
          <li>{t('Δεν ζητάμε τη διεύθυνσή σου: ο κάδος μάς λέει τη γειτονιά.', "We never ask for your address: the bin tells us the neighbourhood.")}</li>
        </ul>
        <p className="mt-3 text-caption text-muted">
          {t('Πιλοτική έκδοση για Android και iPhone (TestFlight): ', 'Pilot app for Android and iPhone (TestFlight): ')}
          <a href="/download" className="font-semibold text-forest-700 underline">{t('κατέβασέ την', 'get it')}</a>.
        </p>
      </div>
      <DemoBadge>{t('Ενδεικτικά σημεία — όχι επίσημα δημοτικά δεδομένα', 'Illustrative points — not official municipal data')}</DemoBadge>
    </div>
  );
}

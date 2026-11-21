import type { Metadata } from 'next';
import { LogoMark } from '@/components/logo';
import { getLang, tr } from '@/lib/lang';

export const metadata: Metadata = { title: 'Delta Sort' };

/** Public page behind the sorting-video QR code. */
export default async function DeltaSort() {
  const t = tr(await getLang());
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
      <div className="flex items-center gap-2.5">
        <LogoMark size={40} />
        <div className="text-[20px] font-extrabold tracking-[-0.03em]">
          Recycle<span className="text-forest-500">IQ</span> Delta Sort
        </div>
      </div>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{t('Υποδομή διαλογής με ρομπότ', 'Robotic sorting infrastructure')}</h1>
      <p className="text-body text-muted">
        {t(
          'Ρομπότ delta πάνω σε ταινία ξεχωρίζουν τα ανακυκλώσιμα στο κέντρο διαλογής, και κινητά ρομπότ μεταφέρουν τους γεμάτους κάδους. Προσομοίωση: οι τύποι των αντικειμένων δίνονται, η όραση δεν περιλαμβάνεται.',
          'Delta robots on a conveyor sort recyclables at the sorting centre, and mobile robots haul the full bins. Simulation: item types are given, vision is not included.',
        )}
      </p>
      <video className="w-full rounded-card bg-ink" src="/media/delta-sort-demo.mp4" poster="/media/delta-sort-poster.jpg" controls playsInline muted loop autoPlay />
      <p className="text-caption text-muted">
        {t('Εκτίμηση: μία γραμμή ~80 αντικείμενα/λεπτό, απόσβεση ~3,5 χρόνια (υποθέσεις, όχι προσφορές).', 'Estimate: one line ~80 items/min, payback ~3.5 years (assumptions, not quotes).')}{' '}
        <a className="font-semibold text-forest-700 hover:underline" href="https://github.com/Mike17K/recycleiq-delta-sort">GitHub</a>
      </p>
    </div>
  );
}

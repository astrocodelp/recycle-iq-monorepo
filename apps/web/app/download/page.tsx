import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { getLang, tr } from '@/lib/lang';
import { RELEASE } from '@/lib/release';

export const metadata: Metadata = { title: 'Κατέβασε την εφαρμογή' };

/** Download page behind the app QR code: the Android pilot build now, the stores once published. */
export default async function Download() {
  const t = tr(await getLang());
  const btn = 'flex h-13 items-center justify-center rounded-card px-5 py-3.5 text-[15px] font-semibold';
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <div className="flex items-center gap-2.5">
        <LogoMark size={40} />
        <div className="text-[20px] font-extrabold tracking-[-0.03em]">
          Recycle<span className="text-forest-500">IQ</span>
        </div>
      </div>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{t('Κατέβασε το RecycleIQ', 'Get RecycleIQ')}</h1>
      <p className="text-body text-muted">
        {t('Σκανάρεις, μαθαίνεις σε ποιον κάδο πάει, και ενημερώνεις τον Δήμο για γεμάτους ή χαλασμένους κάδους.', 'Scan, learn which bin it goes in, and tell the city about full or damaged bins.')}
      </p>
      {RELEASE.googlePlay ? (
        <a href={RELEASE.googlePlay} className={`${btn} bg-forest-700 text-white shadow-btn-primary`}>Google Play</a>
      ) : (
        <a href={RELEASE.androidApk} className={`${btn} bg-forest-700 text-white shadow-btn-primary`}>{t('Android: κατέβασε την πιλοτική έκδοση (APK)', 'Android: download the pilot build (APK)')}</a>
      )}
      {RELEASE.appStore ? (
        <a href={RELEASE.appStore} className={`${btn} bg-ink text-white`}>App Store</a>
      ) : (
        <a href={RELEASE.testFlight} className={`${btn} bg-ink text-white`}>{t('iPhone: πιλοτική έκδοση (TestFlight)', 'iPhone: pilot build (TestFlight)')}</a>
      )}
      {!RELEASE.appStore && (
        <div className="card p-5 text-caption text-muted">
          <p className="font-semibold text-ink">{t('Εγκατάσταση σε iPhone', 'Installing on iPhone')}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{t('Πάτα το κουμπί: ανοίγει η σελίδα του TestFlight.', 'Tap the button: the TestFlight page opens.')}</li>
            <li>{t('Εγκατάστησε την εφαρμογή TestFlight της Apple, αν δεν την έχεις.', "Install Apple's TestFlight app if you don't have it.")}</li>
            <li>{t('Πάτα «Αποδοχή» και μετά «Εγκατάσταση».', 'Tap "Accept", then "Install".')}</li>
          </ol>
          <p className="mt-2">
            {t('Αν γράφει ότι δεν δέχεται δοκιμαστές, η Apple ελέγχει ακόμη την έκδοση. Μέχρι τότε, άνοιξε την ', "If it says it isn't accepting testers, Apple is still reviewing the build. Until then, open the ")}
            <a href="/app" className="font-semibold text-forest-700 underline">{t('εφαρμογή στο Safari', 'app in Safari')}</a>.
          </p>
        </div>
      )}
      {!RELEASE.googlePlay && (
        <div className="card p-5 text-caption text-muted">
          <p className="font-semibold text-ink">{t('Εγκατάσταση σε Android', 'Installing on Android')}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{t('Άνοιξε το αρχείο όταν κατέβει.', 'Open the file when it has downloaded.')}</li>
            <li>{t('Αν ζητηθεί, επίτρεψε εγκατάσταση από τον browser.', 'If asked, allow installs from your browser.')}</li>
            <li>{t('Πάτα «Εγκατάσταση». Πιλοτική έκδοση, όχι ακόμη στο Google Play.', 'Tap "Install". Pilot build, not yet on Google Play.')}</li>
          </ol>
        </div>
      )}
      <Link href="/" className="text-center text-caption font-semibold text-forest-700 hover:underline">{t('Το dashboard του Δήμου →', 'The municipal dashboard →')}</Link>
    </div>
  );
}

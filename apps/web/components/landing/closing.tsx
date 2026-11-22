import { History, ImageOff, MapPin, MessageSquareText, UserX } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { ButtonLink, Container, SectionHead, type T } from './ui';

export function Privacy({ t }: { t: T }) {
  const items = [
    {
      Icon: MapPin,
      title: t('Μόνο η γειτονιά', 'Neighbourhood only'),
      body: t('Το κινητό μετατρέπει την τοποθεσία σε γειτονιά. Ο server απορρίπτει συντεταγμένες.', 'The phone turns your location into a neighbourhood. The server rejects coordinates.'),
    },
    {
      Icon: ImageOff,
      title: t('Η φωτογραφία δεν κρατιέται', 'Photos are not kept'),
      body: t('Στέλνεται μία φορά για αναγνώριση και δεν αποθηκεύεται. Η φωτογραφία κάδου δεν φεύγει καν από το κινητό.', 'Sent once to be recognised, never stored. A full-bin photo never even leaves the phone.'),
    },
    {
      Icon: UserX,
      title: t('Χωρίς λογαριασμό', 'No account'),
      body: t('Ούτε όνομα ούτε email. Μόνο ένας τυχαίος κωδικός εγκατάστασης.', 'No name, no email. Just a random install id.'),
    },
    {
      Icon: History,
      title: t('Το ιστορικό μένει σε σένα', 'Your history stays with you'),
      body: t('Οι σαρώσεις σου αποθηκεύονται μόνο στο κινητό σου.', 'Your scans are stored only on your phone.'),
    },
  ];
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHead
          id="privacy-title"
          eyebrow={t('Ιδιωτικότητα', 'Privacy')}
          title={t('Ξέρουμε τη γειτονιά σου. Όχι πού μένεις.', 'We know your neighbourhood. Not where you live.')}
          lead={t('Σχεδιασμένο από την αρχή για τον GDPR: κρατάμε μόνο ό,τι χρειάζεται ο Δήμος.', 'Built for GDPR from the start: we keep only what the city needs.')}
        />
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map(({ Icon, title, body }) => (
            <li key={title} className="lp-reveal card p-5">
              <span className="grid size-10 place-items-center rounded-control bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                <Icon size={20} aria-hidden />
              </span>
              <h3 className="mt-4 text-[17px] font-bold tracking-[-0.02em] text-ink">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed font-medium text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function SurveyCta({ t }: { t: T }) {
  return (
    <section aria-labelledby="survey-title" className="pb-20 sm:pb-28">
      <Container>
        <div className="lp-reveal relative overflow-hidden rounded-hero bg-lime px-6 py-12 sm:px-12 sm:py-14">
          <div className="lp-survey-bg" aria-hidden />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-[560px]">
              <h2 id="survey-title" className="text-[clamp(28px,4vw,40px)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance text-ink">
                {t('Πες μας τι σε δυσκολεύει.', 'Tell us what gets in your way.')}
              </h2>
              <p className="mt-3 text-[17px] leading-relaxed font-semibold text-ink/75">
                {t('3 λεπτά, ανώνυμα. Οι απαντήσεις αλλάζουν το RecycleIQ.', '3 minutes, anonymous. Your answers shape RecycleIQ.')}
              </p>
            </div>
            <ButtonLink href="/feedback?src=landing" icon={MessageSquareText} className="md:shrink-0">
              {t('Απάντησε στην έρευνα', 'Take the survey')}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Footer({ t }: { t: T }) {
  const links = [
    { href: '/app', label: t('Εφαρμογή', 'App'), plain: true },
    { href: '/download', label: 'Android' },
    { href: '/city', label: t('Dashboard του Δήμου', 'City dashboard') },
    { href: '/feedback?src=landing', label: t('Έρευνα κατοίκων', 'Resident survey') },
    { href: '/developers', label: 'API' },
  ];
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-[420px] flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-[16px] font-extrabold tracking-[-0.03em] text-ink">
              Recycle<span className="text-forest-500">IQ</span>
            </span>
          </div>
          <p className="text-[14px] leading-relaxed font-medium text-muted">
            {t('Ομάδα StellarFirm · Apps4Athens 2026.', 'Team StellarFirm · Apps4Athens 2026.')}{' '}
            {t(
              'Πρωτότυπο διαγωνισμού, όχι επίσημη υπηρεσία του Δήμου Αθηναίων.',
              'A competition prototype, not an official City of Athens service.',
            )}
          </p>
        </div>
        <nav aria-label={t('Σύνδεσμοι', 'Links')}>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {links.map((l) => (
              <li key={l.href}>
                {l.plain ? (
                  <a href={l.href} className="text-[14px] font-semibold text-ink hover:text-forest-700 hover:underline">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="text-[14px] font-semibold text-ink hover:text-forest-700 hover:underline">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}

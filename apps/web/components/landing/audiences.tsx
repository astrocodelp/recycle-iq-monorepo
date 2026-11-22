import {
  Bell,
  Download,
  Globe,
  LayoutDashboard,
  Landmark,
  MessageSquareText,
  Plug,
  QrCode,
  Scale,
  Smartphone,
  Sofa,
  Sparkles,
  Truck,
  Trophy,
} from 'lucide-react';
import { RELEASE } from '@/lib/release';
import { ButtonLink, Container, Label, SectionHead, TextLink, type T } from './ui';

export function Residents({ t }: { t: T }) {
  const extras = [
    { Icon: Bell, text: t('Ανέφερε γεμάτο ή χαλασμένο κάδο με δύο πατήματα.', 'Report a full or broken bin in two taps.') },
    { Icon: Sofa, text: t('Ζήτα από τον Δήμο να πάρει έναν καναπέ ή ένα στρώμα.', 'Ask the city to collect a sofa or a mattress.') },
    { Icon: QrCode, text: t('Σκάναρε το QR του κάδου: ο Δήμος ξέρει τη γειτονιά χωρίς να ζητήσουμε τοποθεσία.', 'Scan the bin’s QR code: the city learns the neighbourhood without asking for your location.') },
    { Icon: Trophy, text: t('Ιστορίες της γειτονιάς σου και κατάταξη με ψευδώνυμο.', 'Neighbourhood stories and a leaderboard under a nickname.') },
  ];
  return (
    <section id="residents" aria-labelledby="residents-title" className="scroll-mt-20 border-t border-line bg-surface py-20 sm:py-28">
      <Container>
        <SectionHead
          id="residents-title"
          eyebrow={t('Για τους κατοίκους', 'For residents')}
          title={t('Στο κινητό σου, από σήμερα.', 'On your phone, today.')}
          lead={t('Δεν χρειάζεσαι λογαριασμό. Άνοιξέ το και ρώτα.', 'No account needed. Open it and ask.')}
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="lp-reveal flex flex-col rounded-card-lg bg-forest-700 p-6 text-white shadow-lift">
            <Globe size={26} aria-hidden className="text-lime" />
            <h3 className="mt-5 text-[20px] font-extrabold tracking-[-0.02em]">{t('Στον browser', 'In your browser')}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed font-medium text-white/80">
              {t('iPhone, Android ή υπολογιστής. Χωρίς εγκατάσταση.', 'iPhone, Android or laptop. Nothing to install.')}
            </p>
            <ButtonLink href="/app" plain variant="lime" icon={Smartphone} className="mt-6">
              {t('Άνοιξε την εφαρμογή', 'Open the app')}
            </ButtonLink>
          </article>
          <article className="lp-reveal card flex flex-col p-6">
            <Download size={26} aria-hidden className="text-forest-700" />
            <h3 className="mt-5 text-[20px] font-extrabold tracking-[-0.02em] text-ink">Android</h3>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed font-medium text-muted">
              {RELEASE.googlePlay
                ? t('Από το Google Play.', 'From Google Play.')
                : t('Πιλοτική έκδοση (APK). Δεν είναι ακόμη στο Google Play.', 'Pilot build (APK). Not on Google Play yet.')}
            </p>
            <ButtonLink href="/download" variant="secondary" icon={Download} className="mt-6">
              {t('Κατέβασέ το', 'Download')}
            </ButtonLink>
          </article>
          <article className="lp-reveal card flex flex-col p-6">
            <Smartphone size={26} aria-hidden className="text-forest-700" />
            <h3 className="mt-5 text-[20px] font-extrabold tracking-[-0.02em] text-ink">iPhone</h3>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed font-medium text-muted">
              {RELEASE.appStore
                ? t('Από το App Store.', 'From the App Store.')
                : t(
                    'Πιλοτική έκδοση στο TestFlight της Apple. Αν δεν δέχεται ακόμη δοκιμαστές, άνοιξέ τη στο Safari.',
                    'Pilot build on Apple’s TestFlight. If it isn’t accepting testers yet, open it in Safari.',
                  )}
            </p>
            <ButtonLink href={RELEASE.appStore ?? RELEASE.testFlight} plain variant="secondary" icon={Smartphone} className="mt-6">
              {RELEASE.appStore ? 'App Store' : 'TestFlight'}
            </ButtonLink>
          </article>
        </div>
        <ul className="mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {extras.map(({ Icon, text }) => (
            <li key={text} className="lp-reveal flex items-start gap-3">
              <Icon size={20} aria-hidden className="mt-0.5 shrink-0 text-forest-600" />
              <span className="text-[15px] leading-relaxed font-medium text-ink">{text}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function City({ t }: { t: T }) {
  const features = [
    {
      Icon: LayoutDashboard,
      title: t('Dashboard ανά γειτονιά', 'Dashboard per neighbourhood'),
      body: t('Τι ρωτούν οι κάτοικοι, πού μπερδεύονται, πώς πάει η ανακύκλωση. Ανοιχτό, χωρίς σύνδεση.', 'What residents ask, where they get confused, how recycling is going. Open, no login.'),
      label: t('Συνθετικά δεδομένα', 'Synthetic data'),
    },
    {
      Icon: Scale,
      title: t('Κανόνες του Δήμου', 'The city’s rules'),
      body: t('Όλοι οι κανόνες σε μία σελίδα. Αυτούς ακολουθεί η εφαρμογή όταν απαντά.', 'Every rule on one page. The app follows them when it answers.'),
      label: t('Ενδεικτικοί κανόνες', 'Sample rules'),
    },
    {
      Icon: Bell,
      title: t('Γεμάτοι κάδοι', 'Full bins'),
      body: t('Οι αναφορές των κατοίκων φτάνουν ως ειδοποιήσεις. Ανάληψη και επίλυση με ένα κουμπί.', 'Residents’ reports arrive as alerts. Take them on and resolve them in one click.'),
    },
    {
      Icon: Landmark,
      title: t('Αιτήματα στο AthensGov', 'Requests in AthensGov'),
      body: t('Αναφορές κάδων και παραλαβές ογκωδών πάνε στο σύστημα αιτημάτων του Δήμου, εκεί που ήδη δουλεύουν τα συνεργεία.', 'Bin reports and bulky pickups go into the city’s request system, where crews already work.'),
      label: 'Sandbox',
    },
    {
      Icon: MessageSquareText,
      title: t('Ρώτα το RecycleIQ', 'Ask RecycleIQ'),
      body: t('Ένας βοηθός AI πάνω στα δεδομένα του dashboard, με γραφήματα. Κάθε ενέργεια θέλει έγκριση.', 'An AI assistant on the dashboard’s data, with charts. Every action needs approval.'),
    },
    {
      Icon: Plug,
      title: t('Σύνδεση MCP', 'MCP connector'),
      body: t('Το RecycleIQ μέσα στο AI που ήδη χρησιμοποιεί ο Δήμος, όπως Claude ή ChatGPT.', 'RecycleIQ inside the AI the city already uses, such as Claude or ChatGPT.'),
      label: t('Demo σύνδεση', 'Demo login'),
    },
    {
      Icon: Truck,
      title: t('Στόλος και διαλογή', 'Fleet and sorting'),
      body: t('Δρομολόγηση απορριμματοφόρων στους δρόμους της Αθήνας και ρομπότ διαλογής Delta Sort.', 'Garbage-truck routing on Athens streets and Delta Sort sorting robots.'),
      label: t('Προσομοίωση', 'Simulation'),
    },
  ];
  return (
    <section id="city" aria-labelledby="city-title" className="relative scroll-mt-16 overflow-hidden bg-canvas py-20 text-white sm:py-28">
      <div className="lp-city-bg" aria-hidden />
      <Container className="relative">
        <SectionHead
          id="city-title"
          tone="dark"
          eyebrow={t('Για τον Δήμο', 'For the city')}
          title={t('Ο Δήμος βλέπει τι δυσκολεύει κάθε γειτονιά.', 'The city sees what each neighbourhood struggles with.')}
          lead={t(
            'Κάθε ερώτηση γίνεται ανώνυμο δεδομένο ανά γειτονιά. Ο Δήμος ξέρει πού να εξηγήσει, πού να βάλει κάδο, πού να στείλει όχημα.',
            'Every question becomes anonymous data per neighbourhood. The city knows where to explain, where to add a bin, where to send a truck.',
          )}
        />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-card-lg bg-white/10 ring-1 ring-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, body, label }) => (
            <li key={title} className="lp-reveal flex flex-col gap-3 bg-canvas p-6">
              <div className="flex items-center justify-between gap-3">
                <Icon size={24} aria-hidden className="text-lime" />
                {label && <Label tone="dark">{label}</Label>}
              </div>
              <h3 className="text-[17px] font-bold tracking-[-0.02em]">{title}</h3>
              <p className="text-[15px] leading-relaxed font-medium text-white/70">{body}</p>
            </li>
          ))}
          <li className="lp-reveal flex flex-col justify-between gap-6 bg-forest-800 p-6 lg:col-span-2 lg:flex-row lg:items-end">
            <div className="flex flex-col gap-3">
              <Sparkles size={24} aria-hidden className="text-lime" />
              <p className="max-w-[340px] text-[20px] leading-snug font-extrabold tracking-[-0.02em]">
                {t('Δες το ζωντανά, χωρίς σύνδεση.', 'See it live, no login.')}
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <ButtonLink href="/city" variant="lime" icon={LayoutDashboard}>
                {t('Άνοιξε το dashboard', 'Open the dashboard')}
              </ButtonLink>
              <TextLink href="/developers" tone="dark">
                {t('API για εφαρμογές', 'API for apps')}
              </TextLink>
            </div>
          </li>
        </ul>
        <p className="mt-6 max-w-[760px] text-[13.5px] leading-relaxed font-medium text-white/65">
          {t(
            'Για την επίδειξη: τα δεδομένα του dashboard είναι συνθετικά και οι κανόνες ενδεικτικοί. Ο στόλος και η διαλογή είναι προσομοιώσεις. Οι πραγματικοί κάδοι στον χάρτη έρχονται από το OpenStreetMap.',
            'For the demo: dashboard data is synthetic and the rules are samples. Fleet and sorting are simulations. The real bins on the map come from OpenStreetMap.',
          )}
        </p>
      </Container>
    </section>
  );
}

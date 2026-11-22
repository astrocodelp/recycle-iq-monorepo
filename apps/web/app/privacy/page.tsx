import type { Lang } from '@recycleiq/engine';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { getLang } from '@/lib/lang';

/**
 * Privacy policy for the RecycleIQ app (iOS, Android, /app) and this website. Public, no login, plain HTML:
 * the page the Google Play and App Store listings link to. Keep it in step with the code: every data flow
 * described here is in apps/mobile/src/lib (api, cloud-vision, location, dictation) and apps/web/app/api/v1.
 */
const UPDATED = { el: '22 Νοεμβρίου 2026', en: '22 November 2026' };
const CONTACT = 'hey@astrocode.tech';

export const metadata: Metadata = {
  title: 'Πολιτική απορρήτου · Privacy policy',
  description: 'How the RecycleIQ app and website handle your data.',
  alternates: { canonical: '/privacy' },
};

type Props = { searchParams: Promise<{ lang?: string }> };

type Section = { h: string; p?: string[]; li?: string[] };

const EL: Section[] = [
  {
    h: 'Με λίγα λόγια',
    li: [
      'Δεν χρειάζεται λογαριασμός. Δεν ζητάμε όνομα, τηλέφωνο ή email για να χρησιμοποιήσεις την εφαρμογή.',
      'Η τοποθεσία σου γίνεται γειτονιά πάνω στο κινητό. Οι συντεταγμένες σου δεν φεύγουν ποτέ από τη συσκευή.',
      'Οι φωτογραφίες αναγνωρίζονται πρώτα στο κινητό. Μόνο όταν το κινητό δεν είναι σίγουρο, στέλνεται μια μικρή εικόνα για αναγνώριση, και δεν την κρατάμε.',
      'Δεν έχουμε διαφημίσεις, δεν χρησιμοποιούμε εργαλεία παρακολούθησης ή analytics τρίτων και δεν πουλάμε δεδομένα.',
    ],
  },
  {
    h: 'Ποιοι είμαστε',
    p: [
      `Το RecycleIQ είναι υπηρεσία ανοιχτού κώδικα που αναπτύσσει η ομάδα StellarFirm, ξεκινώντας από το Apps4Athens 3.0 Gov Hackathon. Είναι πιλοτική εφαρμογή και δεν είναι ακόμη επίσημη υπηρεσία του Δήμου Αθηναίων. Η πολιτική αυτή ισχύει για τις εφαρμογές RecycleIQ για iPhone και Android, την εφαρμογή στο recycleiq.eu/app και τον ιστότοπο recycleiq.eu (και recycleiq.gr). Υπεύθυνος επεξεργασίας των δεδομένων είναι, προς το παρόν, η Astro Code L.P. (astrocode.tech). Επικοινωνία για θέματα απορρήτου: ${CONTACT}.`,
    ],
  },
  {
    h: 'Τι δεδομένα χρησιμοποιούμε και γιατί',
    li: [
      'Αναγνωριστικό εγκατάστασης: ένας τυχαίος κωδικός που δημιουργείται στο κινητό σου την πρώτη φορά. Τον χρησιμοποιούμε για το ιστορικό σου, το ψευδώνυμο και την κατάταξη, και για τα όρια χρήσης του βοηθού. Δεν συνδέεται με το όνομά σου ή με κάποιον λογαριασμό. Τον βλέπεις στις Ρυθμίσεις.',
      'Γειτονιά: αν δώσεις άδεια τοποθεσίας, το κινητό βρίσκει σε ποια γειτονιά της Αθήνας είσαι και στέλνει μόνο αυτή. Οι συντεταγμένες μένουν στη μνήμη του κινητού, για να δείξει τους κοντινούς κάδους, και δεν αποστέλλονται ούτε αποθηκεύονται. Μπορείς και να διαλέξεις γειτονιά με το χέρι.',
      'Σαρώσεις: το αντικείμενο που επέλεξες ή αναγνωρίστηκε, οι απαντήσεις σου στις ερωτήσεις, η γειτονιά, η ώρα και το αναγνωριστικό εγκατάστασης. Τα κρατάμε για να σου δείξουμε τι να κάνεις, για το ιστορικό και την κατάταξη, και για ανώνυμα στατιστικά ανά γειτονιά για τον Δήμο.',
      'Φωτογραφίες για αναγνώριση: η φωτογραφία αναλύεται πρώτα στο κινητό, με μοντέλο που τρέχει στη συσκευή. Αν δεν είναι σίγουρο, μια σμικρυμένη εικόνα στέλνεται στον server μας και στο μοντέλο Gemini της Google (μέσω του Vercel AI Gateway) μόνο για να αναγνωριστεί το αντικείμενο. Δεν την αποθηκεύουμε.',
      'Αναφορές γεμάτων ή χαλασμένων κάδων: ο κάδος, το είδος του προβλήματος και το αναγνωριστικό εγκατάστασης. Η αναφορά καταχωρείται και στο σύστημα αιτημάτων πολιτών του Δήμου Αθηναίων. Η φωτογραφία του κάδου μένει στο κινητό σου.',
      'Παραλαβή ογκωδών: η διεύθυνση και η σημείωση που γράφεις στέλνονται μόνο στον Δήμο Αθηναίων, για να κανονίσει την παραλαβή. Το RecycleIQ δεν αποθηκεύει τη διεύθυνση· κρατά μόνο τη γειτονιά, τον αριθμό του αιτήματος και την κατάστασή του.',
      'Βοηθός: οι ερωτήσεις σου στέλνονται στον server μας και σε μοντέλο τεχνητής νοημοσύνης ανοιχτών βαρών (μέσω του Vercel AI Gateway) για να απαντηθούν. Δεν αποθηκεύουμε τις συνομιλίες. Για να μην γίνεται κατάχρηση, μετράμε τις ερωτήσεις ανά αναγνωριστικό εγκατάστασης και ανά διεύθυνση IP, την οποία αποθηκεύουμε μόνο ως μη αναστρέψιμο hash· οι μετρητές διαγράφονται μέσα σε λίγες ημέρες. Μη γράφεις προσωπικά στοιχεία στον βοηθό.',
      'Φωνή: όταν μιλάς στον βοηθό, τη φωνή τη μετατρέπει σε κείμενο η υπηρεσία αναγνώρισης ομιλίας του κινητού σου (Apple ή Google) ή του browser σου. Το RecycleIQ δεν λαμβάνει ήχο, μόνο το κείμενο που στέλνεις.',
      'Ψευδώνυμο: προαιρετικό, για την κατάταξη. Μπορείς να το αλλάξεις ή να το σβήσεις στις Ρυθμίσεις.',
      'Έρευνα στον ιστότοπο (recycleiq.eu/feedback): οι απαντήσεις είναι ανώνυμες. Email ζητάμε μόνο αν θέλεις να συμμετάσχεις στο πιλοτικό, και το χρησιμοποιούμε μόνο γι’ αυτό.',
      'Τεχνικά αρχεία: ο πάροχος φιλοξενίας μας (Vercel) επεξεργάζεται διευθύνσεις IP και αρχεία αιτημάτων για την ασφάλεια και τη λειτουργία της υπηρεσίας.',
      'Λήψη του μοντέλου: το μοντέλο αναγνώρισης (περίπου 63 MB) κατεβαίνει στο κινητό από το Hugging Face μία φορά: με την πρώτη σάρωση φωτογραφίας (μπορείς να την ακυρώσεις) ή στο παρασκήνιο όταν είσαι σε Wi-Fi. Όπως σε κάθε λήψη, το Hugging Face βλέπει τη διεύθυνση IP.',
    ],
  },
  {
    h: 'Άδειες της εφαρμογής',
    li: [
      'Κάμερα: για να φωτογραφίσεις αντικείμενα και κάδους.',
      'Τοποθεσία (μόνο όταν χρησιμοποιείς την εφαρμογή): για να βρεθεί η γειτονιά σου πάνω στο κινητό.',
      'Μικρόφωνο και αναγνώριση ομιλίας: για να κάνεις ερωτήσεις στον βοηθό με τη φωνή σου.',
      'Όλες είναι προαιρετικές. Χωρίς αυτές, η εφαρμογή λειτουργεί με αναζήτηση και επιλογή από λίστα.',
    ],
  },
  {
    h: 'Με ποιους μοιραζόμαστε δεδομένα',
    p: ['Δεν πουλάμε και δεν δίνουμε δεδομένα για διαφήμιση. Δεδομένα επεξεργάζονται μόνο όσοι χρειάζονται για να λειτουργήσει η υπηρεσία:'],
    li: [
      'Vercel Inc.: φιλοξενία του ιστότοπου και του API, και το AI Gateway που προωθεί τα αιτήματα στα μοντέλα.',
      'Neon (Databricks): η βάση δεδομένων.',
      'Google: το μοντέλο Gemini, για την αναγνώριση φωτογραφιών όταν το κινητό δεν είναι σίγουρο.',
      'Πάροχοι μοντέλων ανοιχτών βαρών μέσω του Vercel AI Gateway: για τις απαντήσεις του βοηθού.',
      'Δήμος Αθηναίων: οι αναφορές κάδων και τα αιτήματα παραλαβής που επιλέγεις να στείλεις.',
      'Hugging Face: η λήψη του μοντέλου αναγνώρισης.',
      'Apple και Google: η αναγνώριση ομιλίας του κινητού και η διανομή της εφαρμογής από τα καταστήματά τους, με τους δικούς τους όρους.',
    ],
  },
  {
    h: 'Πού επεξεργάζονται τα δεδομένα',
    p: [
      'Κάποιοι πάροχοι μπορεί να επεξεργάζονται δεδομένα εκτός Ευρωπαϊκής Ένωσης (π.χ. στις ΗΠΑ). Σε αυτή την περίπτωση η διαβίβαση γίνεται με τις Τυποποιημένες Συμβατικές Ρήτρες της ΕΕ ή με το Πλαίσιο Προστασίας Δεδομένων ΕΕ-ΗΠΑ.',
    ],
  },
  {
    h: 'Πόσο καιρό τα κρατάμε',
    li: [
      'Φωτογραφίες για αναγνώριση και συνομιλίες με τον βοηθό: δεν αποθηκεύονται.',
      'Μετρητές ορίων του βοηθού: διαγράφονται μέσα σε λίγες ημέρες.',
      'Σαρώσεις, αναφορές και ψευδώνυμο: όσο διαρκεί η πιλοτική λειτουργία, και το πολύ 24 μήνες. Μετά διαγράφονται ή κρατιούνται μόνο ως ανώνυμα συνολικά στατιστικά.',
      'Email της έρευνας: μέχρι το τέλος του πιλοτικού ή μέχρι να ζητήσεις διαγραφή.',
    ],
  },
  {
    h: 'Τα δικαιώματά σου',
    p: [
      `Σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR), μπορείς να ζητήσεις πρόσβαση, διόρθωση ή διαγραφή των δεδομένων σου, ή να αντιταχθείς στην επεξεργασία τους. Επειδή δεν ξέρουμε ποιος είσαι, γράψε μας στο ${CONTACT} με το αναγνωριστικό εγκατάστασης από τις Ρυθμίσεις της εφαρμογής, και θα διαγράψουμε ό,τι συνδέεται με αυτό. Αν απεγκαταστήσεις την εφαρμογή, το αναγνωριστικό χάνεται και τα παλιά δεδομένα δεν συνδέονται πλέον με τη συσκευή σου. Έχεις επίσης δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr).`,
    ],
  },
  {
    h: 'Παιδιά',
    p: ['Η εφαρμογή δεν απευθύνεται σε παιδιά κάτω των 13 ετών και δεν συλλέγουμε εν γνώσει μας δεδομένα παιδιών.'],
  },
  {
    h: 'Αλλαγές',
    p: ['Αν αλλάξει ο τρόπος που χειριζόμαστε δεδομένα, θα ενημερώσουμε αυτή τη σελίδα και την ημερομηνία της.'],
  },
];

const EN: Section[] = [
  {
    h: 'In short',
    li: [
      'No account is needed. We do not ask for your name, phone number or email to use the app.',
      'Your location is turned into a neighbourhood on your phone. Your coordinates never leave the device.',
      'Photos are recognised on the phone first. Only when the phone is not sure is a small image sent for recognition, and we do not keep it.',
      'We show no ads, use no third-party tracking or analytics tools, and do not sell data.',
    ],
  },
  {
    h: 'Who we are',
    p: [
      `RecycleIQ is an open-source service developed by the StellarFirm team, started at the Apps4Athens 3.0 Gov Hackathon. It is a pilot and not yet an official City of Athens service. This policy covers the RecycleIQ apps for iPhone and Android, the app at recycleiq.eu/app and the website recycleiq.eu (and recycleiq.gr). For now, the data controller is Astro Code L.P. (astrocode.tech). Privacy contact: ${CONTACT}.`,
    ],
  },
  {
    h: 'What data we use and why',
    li: [
      'Install ID: a random code created on your phone the first time you open the app. We use it for your history, nickname and leaderboard, and for the assistant’s usage limits. It is not linked to your name or to any account. You can see it in Settings.',
      'Neighbourhood: if you allow location, the phone works out which Athens neighbourhood you are in and sends only that. The coordinates stay in the phone’s memory to show nearby bins and are never sent or stored. You can also pick a neighbourhood by hand.',
      'Scans: the item you picked or that was recognised, your answers to its questions, the neighbourhood, the time and the install ID. We keep them to tell you what to do, for your history and the leaderboard, and for anonymous per-neighbourhood statistics for the city.',
      'Photos for recognition: the photo is analysed on the phone first, by a model that runs on the device. If it is not sure, a reduced image is sent to our server and to Google’s Gemini model (through the Vercel AI Gateway) only to recognise the item. We do not store it.',
      'Full or damaged bin reports: the bin, the kind of problem and the install ID. The report is also filed in the City of Athens citizen request system. The photo of the bin stays on your phone.',
      'Bulky-item pickup: the address and note you enter are sent only to the City of Athens to arrange the pickup. RecycleIQ does not store the address; it keeps only the neighbourhood, the request number and its status.',
      'Assistant: your questions are sent to our server and to an open-weight AI model (through the Vercel AI Gateway) to be answered. We do not store conversations. To prevent overuse we count questions per install ID and per IP address, which we store only as a one-way hash; the counters are deleted within a few days. Please do not type personal details into the assistant.',
      'Voice: when you speak to the assistant, your phone’s speech recognition service (Apple or Google) or your browser’s turns your voice into text. RecycleIQ never receives audio, only the text you send.',
      'Nickname: optional, for the leaderboard. You can change or clear it in Settings.',
      'Website survey (recycleiq.eu/feedback): answers are anonymous. We ask for an email only if you want to join the pilot, and use it only for that.',
      'Technical logs: our hosting provider (Vercel) processes IP addresses and request logs to keep the service secure and running.',
      'Model download: the recognition model (about 63 MB) is downloaded to the phone from Hugging Face once: on your first photo scan (you can cancel it) or in the background on Wi-Fi. As with any download, Hugging Face sees the IP address.',
    ],
  },
  {
    h: 'App permissions',
    li: [
      'Camera: to photograph items and bins.',
      'Location (only while you use the app): to find your neighbourhood on the phone.',
      'Microphone and speech recognition: to ask the assistant questions by voice.',
      'All are optional. Without them the app works with search and a pick list.',
    ],
  },
  {
    h: 'Who we share data with',
    p: ['We do not sell data or share it for advertising. Data is processed only by those needed to run the service:'],
    li: [
      'Vercel Inc.: hosting of the website and API, and the AI Gateway that forwards requests to the models.',
      'Neon (Databricks): the database.',
      'Google: the Gemini model, for photo recognition when the phone is not sure.',
      'Open-weight model providers through the Vercel AI Gateway: for the assistant’s answers.',
      'City of Athens: the bin reports and pickup requests you choose to send.',
      'Hugging Face: the recognition model download.',
      'Apple and Google: the phone’s speech recognition and app distribution through their stores, under their own terms.',
    ],
  },
  {
    h: 'Where data is processed',
    p: [
      'Some providers may process data outside the European Union (for example in the USA). Such transfers rely on the EU Standard Contractual Clauses or the EU-US Data Privacy Framework.',
    ],
  },
  {
    h: 'How long we keep it',
    li: [
      'Photos for recognition and assistant conversations: not stored.',
      'Assistant usage counters: deleted within a few days.',
      'Scans, reports and nickname: for the duration of the pilot, at most 24 months. Then they are deleted or kept only as anonymous totals.',
      'Survey email: until the end of the pilot or until you ask us to delete it.',
    ],
  },
  {
    h: 'Your rights',
    p: [
      `Under the General Data Protection Regulation (GDPR) you can ask to access, correct or delete your data, or object to its processing. Because we do not know who you are, write to ${CONTACT} with the install ID from the app’s Settings and we will delete everything linked to it. If you uninstall the app, the ID is lost and old data is no longer linked to your device. You also have the right to complain to the Hellenic Data Protection Authority (www.dpa.gr).`,
    ],
  },
  {
    h: 'Children',
    p: ['The app is not directed at children under 13, and we do not knowingly collect children’s data.'],
  },
  {
    h: 'Changes',
    p: ['If the way we handle data changes, we will update this page and its date.'],
  },
];

async function pageLang(searchParams: Props['searchParams']): Promise<Lang> {
  const { lang } = await searchParams;
  return lang === 'en' || lang === 'el' ? lang : getLang();
}

export default async function Privacy({ searchParams }: Props) {
  const lang = await pageLang(searchParams);
  const en = lang === 'en';
  const sections = en ? EN : EL;
  return (
    <main lang={lang} className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={36} />
          <span className="text-[18px] font-extrabold tracking-[-0.03em]">
            Recycle<span className="text-forest-500">IQ</span>
          </span>
        </Link>
        <a href={en ? '/privacy?lang=el' : '/privacy?lang=en'} className="text-caption font-semibold text-forest-700 hover:underline" hrefLang={en ? 'el' : 'en'}>
          {en ? 'Ελληνικά' : 'English'}
        </a>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-tight font-extrabold tracking-[-0.02em]">{en ? 'Privacy policy' : 'Πολιτική απορρήτου'}</h1>
        <p className="text-body text-muted">
          {en ? 'RecycleIQ app and website · last updated ' : 'Εφαρμογή και ιστότοπος RecycleIQ · τελευταία ενημέρωση '}
          {UPDATED[lang]}
        </p>
      </header>
      {sections.map((s) => (
        <section key={s.h} className="flex flex-col gap-2">
          <h2 className="text-[20px] font-bold tracking-[-0.01em]">{s.h}</h2>
          {s.p?.map((p) => (
            <p key={p} className="text-body leading-relaxed">
              {p}
            </p>
          ))}
          {s.li && (
            <ul className="list-disc space-y-2 pl-5 text-body leading-relaxed">
              {s.li.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="border-t border-line pt-4 text-caption text-muted">
        {en ? 'Contact: ' : 'Επικοινωνία: '}
        <a href={`mailto:${CONTACT}`} className="font-semibold text-forest-700 hover:underline">
          {CONTACT}
        </a>
        {en ? ' · Source code: ' : ' · Κώδικας: '}
        <a href="https://github.com/astrocodelp/recycle-iq-monorepo" className="hover:underline">
          GitHub
        </a>
      </p>
    </main>
  );
}

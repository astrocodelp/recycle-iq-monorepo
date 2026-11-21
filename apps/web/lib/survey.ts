/**
 * Resident survey: how to make RecycleIQ accessible to everyone and how to reward people.
 * One definition drives the public form (/feedback), validation (/api/v1/survey) and the results page.
 */
export const SURVEY_VERSION = '2026-11-v1';

export type Question =
  | { id: string; type: 'single'; title: string; help?: string; options: string[]; required?: boolean; other?: boolean }
  | { id: string; type: 'multi'; title: string; help?: string; options: string[]; required?: boolean; other?: boolean }
  | { id: string; type: 'scale'; title: string; help?: string; min: 1; max: 5; low: string; high: string; required?: boolean }
  | { id: string; type: 'grid'; title: string; help?: string; rows: string[]; columns: string[]; required?: boolean }
  | { id: string; type: 'text'; title: string; help?: string; long?: boolean; required?: boolean };

export interface Section {
  id: string;
  title: string;
  intro?: string;
  questions: Question[];
}

export const GRID_COLUMNS = ['Καθόλου', 'Λίγο', 'Αρκετά', 'Πολύ', 'Πάρα πολύ'];

export const SURVEY: Section[] = [
  {
    id: 'about',
    title: 'Λίγα για σένα',
    questions: [
      { id: 'area', type: 'single', title: 'Πού μένεις;', options: ['Δήμος Αθηναίων', 'Άλλος Δήμος της Αττικής', 'Άλλη πόλη'], required: true },
      { id: 'neighbourhood', type: 'text', title: 'Σε ποια γειτονιά; (προαιρετικό)', help: 'Π.χ. Κυψέλη, Παγκράτι, Κουκάκι.' },
      { id: 'age', type: 'single', title: 'Ηλικία', options: ['Κάτω από 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65–74', '75 και πάνω', 'Προτιμώ να μην πω'], required: true },
      { id: 'frequency', type: 'single', title: 'Πόσο συχνά ανακυκλώνεις;', options: ['Κάθε μέρα', 'Κάθε εβδομάδα', 'Πού και πού', 'Σχεδόν ποτέ'], required: true },
      { id: 'confidence', type: 'scale', title: 'Πόσο σίγουρος/η είσαι συνήθως για το σε ποιον κάδο πάει κάτι;', min: 1, max: 5, low: 'Καθόλου', high: 'Απόλυτα', required: true },
      { id: 'device', type: 'single', title: 'Τι κινητό έχεις;', options: ['iPhone', 'Android', 'Δεν έχω smartphone'], required: true },
    ],
  },
  {
    id: 'access',
    title: 'Να μπορεί να το χρησιμοποιεί ο καθένας',
    intro: 'Η εφαρμογή πρέπει να δουλεύει για όλους: ηλικιωμένους, άτομα με αναπηρία, όσους δεν μιλούν ελληνικά, όσους δεν έχουν smartphone.',
    questions: [
      {
        id: 'barriers',
        type: 'multi',
        title: 'Τι σε δυσκολεύει σήμερα στην ανακύκλωση;',
        options: [
          'Δεν ξέρω τι πάει πού',
          'Ο σωστός κάδος είναι μακριά',
          'Ο κάδος είναι συχνά γεμάτος',
          'Δεν υπάρχει καφέ κάδος (οργανικά) στη γειτονιά μου',
          'Δύσκολη πρόσβαση στον κάδο (πεζοδρόμιο, σκαλιά, αμαξίδιο)',
          'Δεν βλέπω καλά τις οδηγίες πάνω στους κάδους',
          'Οι οδηγίες δεν είναι στη γλώσσα μου',
          'Δεν έχω χρόνο',
          'Τίποτα, ανακυκλώνω χωρίς πρόβλημα',
        ],
        other: true,
        required: true,
      },
      {
        id: 'helps',
        type: 'multi',
        title: 'Τι θα σε βοηθούσε να χρησιμοποιείς το RecycleIQ;',
        help: 'Διάλεξε όσα θέλεις.',
        options: [
          'Ερωτήσεις με τη φωνή (μιλάω αντί να γράφω)',
          'Απαντήσεις που διαβάζονται φωναχτά',
          'Μεγάλα γράμματα και έντονες αντιθέσεις',
          'Συμβατότητα με VoiceOver / TalkBack',
          'Πολύ απλά ελληνικά, με εικόνες',
          'Άλλες γλώσσες (αγγλικά, αραβικά, ουκρανικά, αλβανικά κ.ά.)',
          'Σκανάρισμα QR πάνω στον κάδο, χωρίς να κατεβάσω εφαρμογή',
          'Λειτουργία χωρίς internet',
          'Ερώτηση μέσω Viber / WhatsApp',
          'Τηλέφωνο ή SMS για όσους δεν έχουν smartphone',
        ],
        other: true,
        required: true,
      },
      {
        id: 'needs',
        type: 'multi',
        title: 'Έχεις εσύ ή κάποιος στο σπίτι σου κάποια από τις παρακάτω ανάγκες; (προαιρετικό)',
        options: ['Όρασης', 'Ακοής', 'Κινητικότητας', 'Μαθησιακή ή γνωστική', 'Ηλικιωμένος/η που χρειάζεται βοήθεια', 'Όχι', 'Προτιμώ να μην πω'],
      },
      { id: 'easier', type: 'text', long: true, title: 'Τι θα έκανε την ανακύκλωση πιο εύκολη για σένα ή για κάποιον δικό σου;' },
    ],
  },
  {
    id: 'rewards',
    title: 'Τι θα σε έκανε να ανακυκλώνεις συχνότερα;',
    intro: 'Σήμερα κάθε σάρωση ξεκλειδώνει ιστορίες της γειτονιάς σου και ανεβάζει τη γειτονιά στην κατάταξη. Θέλουμε να μάθουμε τι άλλο θα μετρούσε για σένα.',
    questions: [
      {
        id: 'motivators',
        type: 'grid',
        title: 'Πόσο θα σε παρακινούσε το καθένα;',
        rows: [
          'Ιστορίες και φωτογραφίες της γειτονιάς μου',
          'Κατάταξη: η γειτονιά μου απέναντι σε άλλες',
          'Να βλέπω πόσο CO₂ γλίτωσα',
          'Έκπτωση στα δημοτικά τέλη',
          'Εκπτώσεις σε μαγαζιά της γειτονιάς',
          'Δωρεάν εισιτήρια ΜΜΜ',
          'Δωρεάν είσοδος σε μουσεία και εκδηλώσεις του Δήμου',
          'Ο Δήμος φυτεύει δέντρα στη γειτονιά μου',
          'Δωρεά σε κοινωφελή σκοπό',
          'Νέος κάδος ή βελτίωση στη γειτονιά μου',
        ],
        columns: GRID_COLUMNS,
        required: true,
      },
      { id: 'who', type: 'single', title: 'Ποιος να κερδίζει;', options: ['Εγώ προσωπικά', 'Όλη η γειτονιά μαζί', 'Και τα δύο'], required: true },
      {
        id: 'proof',
        type: 'single',
        title: 'Θα ήθελες ανταμοιβή μόνο όταν αποδεικνύεται ότι ανακύκλωσες σωστά; (π.χ. QR στον κάδο ή έλεγχος από τον Δήμο)',
        options: ['Ναι, είναι πιο δίκαιο', 'Όχι, αρκεί να ρωτάω στην εφαρμογή', 'Δεν ξέρω'],
        required: true,
      },
      { id: 'share', type: 'single', title: 'Θα μοιραζόσουν τη θέση σου ή τις ιστορίες της γειτονιάς στα social media;', options: ['Ναι', 'Ίσως', 'Όχι'] },
      { id: 'weekly', type: 'text', long: true, title: 'Ποια ανταμοιβή θα σε έκανε να ανοίγεις την εφαρμογή κάθε εβδομάδα;' },
    ],
  },
  {
    id: 'end',
    title: 'Σχεδόν τελειώσαμε',
    questions: [
      { id: 'likely', type: 'scale', title: 'Πόσο πιθανό είναι να δοκιμάσεις το RecycleIQ;', min: 1, max: 5, low: 'Καθόλου πιθανό', high: 'Σίγουρα', required: true },
      { id: 'other_comments', type: 'text', long: true, title: 'Κάτι άλλο που θέλεις να μας πεις;' },
    ],
  },
];

export const ALL_QUESTIONS = SURVEY.flatMap((s) => s.questions);
export const OTHER = '__other__';

export type Answers = Record<string, string | string[] | number | Record<string, string>>;

/** Keeps only known questions and allowed values; returns the cleaned answers or the first problem. */
export function cleanAnswers(raw: unknown): { ok: true; answers: Answers } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'answers missing' };
  const a = raw as Record<string, unknown>;
  const out: Answers = {};
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  for (const q of ALL_QUESTIONS) {
    const v = a[q.id];
    if (q.type === 'single') {
      if (typeof v === 'string' && q.options.includes(v)) out[q.id] = v;
    } else if (q.type === 'multi') {
      if (Array.isArray(v)) {
        const picked = v.filter((x): x is string => typeof x === 'string' && q.options.includes(x));
        if (picked.length) out[q.id] = [...new Set(picked)];
      }
      const other = text(a[`${q.id}${OTHER}`], 300);
      if (q.other && other) out[`${q.id}${OTHER}`] = other;
    } else if (q.type === 'scale') {
      if (typeof v === 'number' && Number.isInteger(v) && v >= q.min && v <= q.max) out[q.id] = v;
    } else if (q.type === 'grid') {
      if (v && typeof v === 'object') {
        const g: Record<string, string> = {};
        for (const row of q.rows) {
          const c = (v as Record<string, unknown>)[row];
          if (typeof c === 'string' && q.columns.includes(c)) g[row] = c;
        }
        if (Object.keys(g).length) out[q.id] = g;
      }
    } else {
      const t = text(v, 2000);
      if (t) out[q.id] = t;
    }
    const answered = out[q.id] !== undefined || out[`${q.id}${OTHER}`] !== undefined;
    if (q.required && !answered) return { ok: false, error: `missing: ${q.id}` };
    if (q.type === 'grid' && q.required && Object.keys((out[q.id] as Record<string, string>) ?? {}).length < q.rows.length)
      return { ok: false, error: `incomplete: ${q.id}` };
  }
  return { ok: true, answers: out };
}

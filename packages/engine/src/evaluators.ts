// One evaluator per catalog object, ported 1:1 from the prototype's decision engine.
// Each returns what to do given the answers, the neighbourhood and which municipal rules are on.
import { DESTINATIONS as D } from './categories';
import { te } from './l10n';
import type {
  Answers,
  CatalogObject,
  CategoryId,
  Certainty,
  DistrictContext,
  L10n,
  PointQuery,
  RuleCode,
} from './types';

export interface EvalContext {
  obj: CatalogObject;
  answers: Answers;
  district: DistrictContext;
  on: (code: RuleCode) => boolean;
}

export interface EvalResult {
  category: CategoryId;
  destination: L10n;
  confidence: number;
  certainty?: Certainty;
  rules: RuleCode[];
  headline: L10n;
  why: L10n;
  prep: L10n[];
  warnings: L10n[];
  notes: L10n[];
  alternatives?: L10n;
  condition: L10n;
  uncertain?: boolean;
  glassBell?: boolean;
  /** Narrows nearby points beyond the category (prototype `point` filter). */
  pointFilter?: Pick<PointQuery, 'glassBell' | 'accepts'>;
}

export type Evaluator = (ctx: EvalContext) => EvalResult;

/** Answers assumed when the user skips the question. */
export const DEFAULT_ANSWERS: Record<string, Answers> = {
  'pizza-box': { greasy: 'unsure' },
  'food-scraps': { content: 'plant' },
  battery: { kind: 'rechargeable' },
  'glass-bottle': { form: 'bottle' },
  'coffee-maker': { works: 'broken' },
};

export const ruleDisabledNote = (code: RuleCode) =>
  te(
    `Ο κανόνας ${code} είναι ανενεργός — ισχύει η προεπιλεγμένη ασφαλής οδηγία.`,
    `Rule ${code} is disabled — the default safe instruction was applied.`,
  );

const plasticBottle: Evaluator = ({ on }) =>
  on('ATH-PKG-01')
    ? {
        category: 'packaging',
        destination: D.blue,
        confidence: 0.97,
        rules: ['ATH-PKG-01'],
        headline: te('Ρίξ’ το στον μπλε κάδο', 'Put it in the blue recycling bin'),
        why: te(
          'Το πλαστικό μπουκάλι PET είναι συσκευασία και ανακυκλώνεται.',
          'A clean PET plastic bottle is packaging that is fully recyclable.',
        ),
        prep: [
          te('Άδειασέ το εντελώς.', 'Empty it completely.'),
          te('Ξέπλυνέ το πρόχειρα με λίγο νερό.', 'Give it a quick rinse.'),
          te('Πάτησέ το για να πιάνει λιγότερο χώρο.', 'Squash it to save space.'),
          te('Βάλε το καπάκι πάνω του.', 'Screw the cap back on.'),
        ],
        warnings: [],
        notes: [],
        condition: te('Καθαρό — δεν χρειάζεται διευκρίνιση', 'Clean — no clarification needed'),
      }
    : {
        category: 'general',
        destination: D.general,
        confidence: 0.6,
        rules: [],
        certainty: 'medium',
        headline: te('Ρίξ’ το προς το παρόν στον πράσινο κάδο', 'Put it in general waste for now'),
        why: te(
          'Δεν ισχύει κανόνας ανακύκλωσης συσκευασιών, γι’ αυτό προτείνουμε την ασφαλή επιλογή.',
          'No active packaging rule applies, so the safe default is used.',
        ),
        prep: [],
        warnings: [],
        notes: [ruleDisabledNote('ATH-PKG-01')],
        condition: te('Καθαρό', 'Clean'),
      };

/** Plain packaging that goes in the blue bin under ATH-PKG-01, with a safe default when the rule is off. */
const bluePackaging =
  (why: L10n, prep: L10n[], warnings: L10n[] = []): Evaluator =>
  ({ on }) =>
    on('ATH-PKG-01')
      ? {
          category: 'packaging',
          destination: D.blue,
          confidence: 0.95,
          rules: ['ATH-PKG-01'],
          headline: te('Ρίξ’ το στον μπλε κάδο', 'Put it in the blue recycling bin'),
          why,
          prep,
          warnings,
          notes: [],
          condition: te('Καθαρό — δεν χρειάζεται διευκρίνιση', 'Clean — no clarification needed'),
        }
      : {
          category: 'general',
          destination: D.general,
          confidence: 0.6,
          rules: [],
          certainty: 'medium',
          headline: te('Ρίξ’ το προς το παρόν στον πράσινο κάδο', 'Put it in general waste for now'),
          why: te(
            'Δεν ισχύει κανόνας ανακύκλωσης συσκευασιών, γι’ αυτό προτείνουμε την ασφαλή επιλογή.',
            'No active packaging rule applies, so the safe default is used.',
          ),
          prep: [],
          warnings: [],
          notes: [ruleDisabledNote('ATH-PKG-01')],
          condition: te('Καθαρό', 'Clean'),
        };

const can = bluePackaging(
  te(
    'Τα κουτάκια αλουμινίου και οι κονσέρβες είναι μεταλλικές συσκευασίες και ανακυκλώνονται ξανά και ξανά.',
    'Aluminium cans and tins are metal packaging and can be recycled again and again.',
  ),
  [
    te('Άδειασέ το εντελώς.', 'Empty it completely.'),
    te('Ξέπλυνε πρόχειρα τις κονσέρβες φαγητού.', 'Give food tins a quick rinse.'),
    te('Μη βάζεις άλλα σκουπίδια μέσα του.', 'Do not stuff other rubbish inside it.'),
  ],
);

const paper = bluePackaging(
  te(
    'Το καθαρό χαρτί (εφημερίδες, περιοδικά, χαρτιά γραφείου, φάκελοι) ανακυκλώνεται στον μπλε κάδο.',
    'Clean paper (newspapers, magazines, office paper, envelopes) is recycled in the blue bin.',
  ),
  [
    te('Βάλ’ το χύμα, όχι σε δεμένη σακούλα.', 'Put it in loose, not in a tied bag.'),
    te('Αφαίρεσε πλαστικές μεμβράνες και σπιράλ.', 'Remove plastic wrapping and spirals.'),
  ],
  [
    te(
      'Χρησιμοποιημένες χαρτοπετσέτες, χαρτομάντιλα και λερωμένο χαρτί πάνε στον πράσινο κάδο.',
      'Used napkins, tissues and soiled paper go in the general waste bin.',
    ),
  ],
);

const cardboardBox = bluePackaging(
  te('Το καθαρό χαρτόνι ανακυκλώνεται κανονικά.', 'Clean cardboard is recycled normally.'),
  [
    te('Άδειασέ το και αφαίρεσε φελιζόλ και πλαστικά.', 'Empty it and remove foam and plastic.'),
    te('Δίπλωσέ το για να χωράει στον κάδο.', 'Flatten it so it fits in the bin.'),
  ],
  [
    te(
      'Αν έχει λάδια ή φαγητά (όπως ένα λερωμένο κουτί πίτσας), πάει στον πράσινο κάδο.',
      'If it has grease or food on it (like a greasy pizza box), it goes in general waste.',
    ),
  ],
);

const pizzaBox: Evaluator = ({ answers, on }) => {
  const greasy = answers.greasy;
  const cutLid = te(
    'Κόψε το καθαρό καπάκι και ρίξ’ το στον μπλε κάδο· το λερωμένο μέρος πάει στον πράσινο.',
    'Cut off the clean lid for the blue bin; the soiled part goes to general waste.',
  );
  const generalPrep = [
    te('Πέτα ό,τι φαγητό έχει μείνει.', 'Remove any leftover food.'),
    te('Ρίξ’ το όπως είναι στον πράσινο κάδο.', 'Put it in the general waste bin as it is.'),
  ];
  if (greasy === 'no')
    return {
      category: 'packaging',
      destination: D.blue,
      confidence: 0.95,
      rules: ['ATH-PKG-01'],
      headline: te('Ρίξ’ το στον μπλε κάδο', 'Put it in the blue recycling bin'),
      why: te('Το καθαρό χαρτόνι ανακυκλώνεται κανονικά.', 'Clean cardboard is recycled normally.'),
      prep: [
        te('Αφαίρεσε αυτοκόλλητα και πλαστικά στηρίγματα.', 'Remove stickers and plastic supports.'),
        te('Δίπλωσέ το για να πιάνει λιγότερο χώρο.', 'Flatten it to save space.'),
      ],
      warnings: [],
      notes: [],
      condition: te('Καθαρό, χωρίς λάδια', 'Clean, no grease'),
    };
  if (greasy === 'yes')
    return on('ATH-PKG-02')
      ? {
          category: 'general',
          destination: D.general,
          confidence: 0.96,
          rules: ['ATH-PKG-02'],
          headline: te('Ρίξ’ το στον πράσινο κάδο', 'Put it in the general waste bin'),
          why: te(
            'Το λάδι και τα υπολείμματα φαγητού λερώνουν το χαρτόνι και δεν γίνεται να ανακυκλωθεί.',
            'Grease and food residue contaminate the cardboard and rule out recycling.',
          ),
          prep: generalPrep,
          warnings: [],
          notes: [],
          alternatives: cutLid,
          condition: te('Λερωμένο με λάδια', 'Soiled with grease'),
        }
      : {
          category: 'packaging',
          destination: D.blue,
          confidence: 0.7,
          rules: ['ATH-PKG-01'],
          certainty: 'medium',
          headline: te('Ρίξ’ το στον μπλε κάδο', 'Put it in the blue recycling bin'),
          why: te(
            'Ο κανόνας για το λερωμένο χαρτί είναι ανενεργός, οπότε ισχύει ο γενικός κανόνας για τις συσκευασίες.',
            'The soiled-paper rule is disabled, so the general packaging rule applies.',
          ),
          prep: [],
          warnings: [
            te(
              'Το λερωμένο χαρτόνι μπορεί να λερώσει και τα υπόλοιπα υλικά του μπλε κάδου.',
              'Soiled cardboard may contaminate the recycling stream.',
            ),
          ],
          notes: [ruleDisabledNote('ATH-PKG-02')],
          condition: te('Λερωμένο με λάδια', 'Soiled with grease'),
        };
  return on('ATH-GEN-01')
    ? {
        category: 'general',
        destination: D.general,
        confidence: 0.78,
        rules: ['ATH-PKG-02', 'ATH-GEN-01'],
        certainty: 'medium',
        headline: te('Ρίξ’ το στον πράσινο κάδο', 'Put it in the general waste bin'),
        why: te(
          'Επειδή δεν είμαστε σίγουροι αν έχει λάδια, διαλέγουμε την ασφαλή επιλογή, για να μη λερωθεί η ανακύκλωση.',
          'Since we are not sure about grease, we take the safe route so recycling is not contaminated.',
        ),
        prep: generalPrep,
        warnings: [],
        notes: [cutLid],
        alternatives: cutLid,
        condition: te('Άγνωστη κατάσταση — ασφαλής επιλογή', 'Unknown condition — safe default'),
      }
    : {
        category: 'packaging',
        destination: D.blue,
        confidence: 0.6,
        rules: ['ATH-PKG-01'],
        certainty: 'low',
        headline: te('Ρίξ’ το στον μπλε κάδο μόνο αν είναι καθαρό', 'Blue bin only if it is clean'),
        why: te(
          'Αφού δεν ξέρουμε σε τι κατάσταση είναι, ισχύει ο γενικός κανόνας για τις συσκευασίες.',
          'Without confirmation of its condition, the general packaging rule applies.',
        ),
        prep: [],
        warnings: [te('Αν έχει λάδια, μην το ανακυκλώσεις.', 'If it has grease, do not recycle it.')],
        notes: [ruleDisabledNote('ATH-GEN-01')],
        alternatives: cutLid,
        condition: te('Άγνωστη κατάσταση', 'Unknown condition'),
      };
};

const foodScraps: Evaluator = ({ answers, district, on }) => {
  const content = answers.content ?? 'plant';
  const service = district.organicService;
  const brownAvailable = on('ATH-ORG-01') && service !== 'none';
  const notPlant = content !== 'plant';
  const condition =
    content === 'plant'
      ? te('Φυτικά υπολείμματα', 'Plant-based scraps')
      : content === 'cooked'
        ? te('Μαγειρεμένο φαγητό', 'Cooked food')
        : te('Κρέας ή ψάρι', 'Meat or fish');

  if (brownAvailable && notPlant && !on('ATH-ORG-02'))
    return {
      category: 'general',
      destination: D.general,
      confidence: 0.84,
      rules: ['ATH-ORG-01', 'ATH-ORG-02'],
      headline: te('Ρίξ’ το στον πράσινο κάδο', 'Put it in the general waste bin'),
      why: te(
        'Με τους κανόνες που ισχύουν, ο καφέ κάδος δεν δέχεται μαγειρεμένο φαγητό, κρέας και ψάρι.',
        'Cooked food, meat and fish are not accepted in the brown bin under the current rules.',
      ),
      prep: [te('Στράγγισέ το πριν το πετάξεις.', 'Drain off liquids before binning.')],
      warnings: [],
      notes: [],
      condition,
    };

  if (brownAvailable)
    return {
      category: 'organic',
      destination: D.brown,
      confidence: service === 'full' ? 0.93 : 0.82,
      rules: notPlant ? ['ATH-ORG-01', 'ATH-ORG-02'] : ['ATH-ORG-01'],
      headline: te('Ρίξ’ το στον καφέ κάδο', 'Put it in the brown organic bin'),
      why: notPlant
        ? te(
            'Στη γειτονιά σου ο καφέ κάδος δέχεται και μαγειρεμένο φαγητό ή κρέας, αρκεί να είναι σε κλειστή βιοδιασπώμενη σακούλα.',
            'In your area the brown bin also accepts cooked food or meat, when sealed in a bag.',
          )
        : te(
            'Τα φυτικά υπολείμματα γίνονται κομπόστ· δεν ανήκουν στα κοινά σκουπίδια.',
            'Plant scraps become compost and do not belong in general waste.',
          ),
      prep: [
        te('Αφαίρεσε πλαστικά, ετικέτες και συσκευασίες.', 'Remove plastic, labels and packaging.'),
        te('Χρησιμοποίησε βιοδιασπώμενη ή χάρτινη σακούλα.', 'Use a compostable bag or paper.'),
      ],
      warnings:
        service === 'partial'
          ? [
              te(
                'Ο καφέ κάδος δεν καλύπτει όλη τη γειτονιά — δες αν υπάρχει στο τετράγωνό σου.',
                'The brown bin does not cover every street in this area — check whether one is on your block.',
              ),
            ]
          : [],
      notes: notPlant
        ? [
            te(
              'Βάλ’ το σε κλειστή βιοδιασπώμενη σακούλα για να μη μυρίζει.',
              'Place it in a sealed compostable bag to avoid odours.',
            ),
          ]
        : [],
      condition,
      certainty: service === 'partial' ? 'medium' : undefined,
    };

  return {
    category: 'general',
    destination: D.general,
    confidence: 0.88,
    rules: ['ATH-ORG-01'],
    headline: te('Ρίξ’ το στον πράσινο κάδο', 'Put it in the general waste bin'),
    why: on('ATH-ORG-01')
      ? te(
          'Στη γειτονιά σου δεν λειτουργεί ακόμη καφέ κάδος.',
          'There is no brown organic bin service in your area yet.',
        )
      : te(
          'Ο κανόνας για τον καφέ κάδο είναι ανενεργός, γι’ αυτό τα υπολείμματα πάνε στον πράσινο κάδο.',
          'The organic service is disabled in the policy settings.',
        ),
    prep: [te('Τύλιξέ το καλά για να μη στάζει.', 'Wrap it well so nothing leaks.')],
    warnings: [],
    notes: [
      te(
        'Ζήτησε καφέ κάδο από τον Δήμο — κάθε αίτημα μετράει στον σχεδιασμό της υπηρεσίας.',
        'Request a brown bin from the municipality — every request counts towards service planning.',
      ),
    ],
    condition,
  };
};

const battery: Evaluator = ({ answers, on }) => {
  const kind = answers.kind ?? 'rechargeable';
  const rules: RuleCode[] = ['ATH-SPC-01'];
  const warnings: L10n[] = [];
  const prep = [
    te('Μην την πετάξεις ποτέ σε κάδο — ούτε στον μπλε.', 'Never throw it in any bin — not even the blue one.'),
    te(
      'Φύλαξέ τη σε ένα κλειστό δοχείο μέχρι να την παραδώσεις.',
      'Keep it in a closed container until you drop it off.',
    ),
  ];
  if (kind === 'rechargeable')
    prep.push(te('Κάλυψε τους πόλους με διαφανή ταινία.', 'Cover the terminals with clear tape.'));
  if (kind === 'damaged') {
    rules.push('ATH-SPC-02');
    if (on('ATH-SPC-02'))
      warnings.push(
        te(
          'Κίνδυνος πυρκαγιάς: μην την πετάξεις σε κάδο, μην την πιέσεις και μην την τρυπήσεις.',
          'Fire risk: never put it in a bin, and never press or puncture it.',
        ),
        te(
          'Μόνωσε τους πόλους με ταινία και κράτα την μακριά από ζέστη.',
          'Tape the terminals and keep it away from heat.',
        ),
      );
  }
  const ruleOn = on('ATH-SPC-01');
  return {
    category: 'special',
    destination: D.battery,
    confidence: kind === 'damaged' ? 0.99 : 0.97,
    rules,
    glassBell: false,
    headline: te(
      'Παράδωσέ την σε σημείο συλλογής μπαταριών',
      'Hand it in at a battery collection point',
    ),
    why:
      kind === 'damaged'
        ? te(
            'Μια φουσκωμένη ή χαλασμένη μπαταρία μπορεί να πάρει φωτιά. Παράδωσέ την μόνο σε σημείο ειδικής συλλογής.',
            'A swollen or damaged battery can catch fire. It must be handed in at a special point.',
          )
        : te(
            'Οι μπαταρίες περιέχουν μέταλλα και χημικές ουσίες που δεν πρέπει να καταλήξουν στα σκουπίδια.',
            'Batteries contain metals and chemicals that must not end up in the rubbish.',
          ),
    prep,
    warnings,
    notes: ruleOn ? [] : [ruleDisabledNote('ATH-SPC-01')],
    certainty: ruleOn ? undefined : 'medium',
    condition:
      kind === 'small'
        ? te('Μικρή οικιακή μπαταρία', 'Small household battery')
        : kind === 'rechargeable'
          ? te('Επαναφορτιζόμενη', 'Rechargeable')
          : te('Φουσκωμένη ή χαλασμένη — κίνδυνος', 'Swollen or damaged — hazard'),
    pointFilter: { accepts: 'batteries' },
  };
};

const sofa: Evaluator = ({ on }) => {
  const ruleOn = on('ATH-BLK-01');
  return {
    category: 'bulky',
    destination: D.bulky,
    confidence: 0.95,
    rules: ['ATH-BLK-01'],
    certainty: ruleOn ? undefined : 'medium',
    headline: te('Κλείσε ραντεβού για αποκομιδή ογκωδών', 'Book a bulky-waste pickup'),
    why: te(
      'Ο καναπές είναι ογκώδες αντικείμενο: δεν χωράει σε κάδο και παραλαμβάνεται ξεχωριστά, κατόπιν ραντεβού.',
      'A sofa is a bulky item: it does not fit a bin and is collected separately, by appointment.',
    ),
    prep: [
      te('Κάλεσε το 1595 πριν τον κατεβάσεις (ενδεικτικά).', 'Book an appointment on 1595 (indicative).'),
      te(
        'Μην τον αφήσεις στο πεζοδρόμιο πριν την ημέρα αποκομιδής.',
        'Do not leave it on the pavement before pickup day.',
      ),
      te(
        'Αφαίρεσε μαξιλάρια και αποσπώμενα καλύμματα, αν υπάρχουν.',
        'Remove loose cushions and covers, if any.',
      ),
    ],
    warnings: [],
    notes: ruleOn ? [] : [ruleDisabledNote('ATH-BLK-01')],
    alternatives: te(
      'Αν είναι σε καλή κατάσταση, σκέψου να τον δωρίσεις σε κάποια οργάνωση ή σε ομάδα ανταλλαγής της γειτονιάς.',
      'If it is in good shape, consider donating it to a charity or a neighbourhood swap group.',
    ),
    condition: te(
      'Μεγάλο μέγεθος — δεν χρειάζεται διευκρίνιση',
      'Large size — no clarification needed',
    ),
  };
};

const glassBottle: Evaluator = ({ answers, on }) => {
  const form = answers.form ?? 'bottle';
  if (form === 'broken' && on('ATH-GLS-02'))
    return {
      category: 'general',
      destination: D.general,
      confidence: 0.92,
      rules: ['ATH-GLS-02'],
      headline: te(
        'Τύλιξέ το καλά και ρίξ’ το στον πράσινο κάδο',
        'Put it, well wrapped, in general waste',
      ),
      why: te(
        'Το τζάμι και τα ποτήρια έχουν άλλη σύνθεση από το γυαλί συσκευασίας και δεν ανακυκλώνονται μαζί του.',
        'Window glass and drinking glasses have a different composition than packaging glass and spoil recycling.',
      ),
      prep: [
        te('Τύλιξέ το σε χαρτί ή εφημερίδα.', 'Wrap it in paper or newspaper.'),
        te('Γράψε πάνω «προσοχή, γυαλί».', 'Mark the package “caution glass”.'),
        te('Μην το βάλεις στην καμπάνα γυαλιού.', 'Do not put it in the glass bell.'),
      ],
      warnings: [te('Μπορεί να κοπείς: φόρεσε γάντια.', 'Risk of injury: wear gloves.')],
      notes: [],
      condition: te('Σπασμένο τζάμι ή ποτήρι', 'Broken window or drinking glass'),
    };
  const bell = on('ATH-PKG-03');
  const base: RuleCode = bell ? 'ATH-PKG-03' : 'ATH-PKG-01';
  return {
    category: 'packaging',
    destination: bell ? D.glass : D.blue,
    glassBell: bell,
    confidence: 0.94,
    rules: form === 'broken' ? ['ATH-GLS-02', base] : [base],
    headline: bell
      ? te('Ρίξ’ το στην καμπάνα γυαλιού', 'Put it in the glass bell')
      : te('Ρίξ’ το στον μπλε κάδο', 'Put it in the blue recycling bin'),
    why: bell
      ? te(
          'Το γυαλί συσκευασίας ανακυκλώνεται ξανά και ξανά και συλλέγεται ξεχωριστά για καλύτερη ποιότητα.',
          'Packaging glass is recycled endlessly and collected separately for better quality.',
        )
      : te(
          'Όπου δεν χρησιμοποιούνται καμπάνες, το γυαλί συσκευασίας πηγαίνει στον μπλε κάδο.',
          'Where glass bells are not used, packaging glass goes in the blue bin.',
        ),
    prep: [
      te('Άδειασέ το και ξέπλυνέ το πρόχειρα.', 'Empty it and give it a quick rinse.'),
      te(
        'Αφαίρεσε καπάκια και πώματα και βάλ’ τα στον μπλε κάδο.',
        'Remove lids and caps and put them in the blue bin.',
      ),
      te('Δεν χρειάζεται να ξεκολλήσεις την ετικέτα.', 'No need to peel off the label.'),
    ],
    warnings: [],
    notes: [],
    condition: te('Μπουκάλι ή βάζο συσκευασίας', 'Packaging bottle or jar'),
    pointFilter: bell ? { glassBell: true } : undefined,
  };
};

const coffeeMaker: Evaluator = ({ answers, on }) => {
  const works = answers.works === 'works';
  const reuse = works && on('ATH-WEE-02');
  const ruleOn = on('ATH-WEE-01');
  return {
    category: 'special',
    destination: D.weee,
    confidence: 0.92,
    rules: reuse ? ['ATH-WEE-01', 'ATH-WEE-02'] : ['ATH-WEE-01'],
    certainty: ruleOn ? undefined : 'medium',
    headline: te(
      'Παράδωσέ τη σε σημείο συλλογής ηλεκτρικών συσκευών',
      'Hand it in at a WEEE collection point',
    ),
    why: te(
      'Οι ηλεκτρικές συσκευές έχουν πολύτιμα μέταλλα και εξαρτήματα και δεν μπαίνουν σε κάδο.',
      'Electrical appliances contain valuable metals and parts that must not go in a bin.',
    ),
    prep: [
      te(
        'Βγάλ’ τη από την πρίζα και άδειασε νερό και υπολείμματα.',
        'Unplug it and empty any water and residue.',
      ),
      te('Κράτα το καλώδιο μαζί της.', 'Keep the cable with it.'),
      te(
        'Ή επίστρεψέ τη σε κατάστημα όταν αγοράζεις καινούργια.',
        'Alternatively, return it to a shop when buying a new one.',
      ),
    ],
    warnings: [],
    notes: ruleOn ? [] : [ruleDisabledNote('ATH-WEE-01')],
    alternatives: reuse
      ? te(
          'Αφού λειτουργεί, σκέψου πρώτα να τη δωρίσεις ή να την πας σε repair café της γειτονιάς — κάποιος άλλος μπορεί να τη χρησιμοποιήσει.',
          'Since it still works, consider donating it or visiting a neighbourhood repair café first.',
        )
      : undefined,
    condition: works
      ? te('Λειτουργεί — προτείνεται επαναχρησιμοποίηση', 'Working — reuse suggested')
      : te('Χαλασμένη', 'Broken'),
    pointFilter: { accepts: 'weee' },
  };
};

const unknown: Evaluator = () => ({
  category: 'general',
  destination: te('Δεν έχει καθοριστεί ακόμη', 'Not determined yet'),
  confidence: 0.41,
  certainty: 'low',
  uncertain: true,
  rules: [],
  headline: te('Δεν είμαστε αρκετά σίγουροι', 'We are not sure enough'),
  why: te(
    'Η φωτογραφία είναι θολή και δεν βρήκαμε κάτι με αρκετή βεβαιότητα. Διάλεξε αυτό που του μοιάζει περισσότερο ή τράβηξε νέα φωτογραφία.',
    'The photo is blurry and the top candidate classes have low confidence. Pick the closest match or retake the photo.',
  ),
  prep: [
    te('Τράβηξε νέα φωτογραφία με περισσότερο φως.', 'Take a new photo in better light.'),
    te('Ή περίγραψε το αντικείμενο με λίγα λόγια.', 'Or describe the item in a few words.'),
  ],
  warnings: [],
  notes: [],
  condition: te('Δεν αρκούν τα στοιχεία της εικόνας', 'Not enough information in the image'),
});

export const EVALUATORS: Record<string, Evaluator> = {
  'plastic-bottle': plasticBottle,
  can,
  paper,
  'cardboard-box': cardboardBox,
  'pizza-box': pizzaBox,
  'food-scraps': foodScraps,
  battery,
  sofa,
  'glass-bottle': glassBottle,
  'coffee-maker': coffeeMaker,
  unknown,
};

/** Simulated runner-up classes from the vision model, shown in the recognition trace. */
export const RUNNER_UPS: Record<string, [L10n, number][]> = {
  'plastic-bottle': [
    [te('Γυάλινο μπουκάλι', 'Glass bottle'), 0.02],
    [te('Πλαστικό δοχείο', 'Plastic container'), 0.01],
  ],
  can: [
    [te('Κονσέρβα', 'Food tin'), 0.03],
    [te('Πλαστικό μπουκάλι', 'Plastic bottle'), 0.01],
  ],
  paper: [
    [te('Χαρτόνι', 'Cardboard'), 0.04],
    [te('Χαρτοπετσέτα', 'Paper napkin'), 0.02],
  ],
  'cardboard-box': [
    [te('Κουτί πίτσας', 'Pizza box'), 0.04],
    [te('Χαρτί', 'Paper'), 0.02],
  ],
  'pizza-box': [
    [te('Χάρτινο κουτί', 'Cardboard box'), 0.05],
    [te('Συσκευασία τροφίμων', 'Food packaging'), 0.01],
  ],
  'food-scraps': [
    [te('Σκουπίδια κουζίνας', 'Kitchen waste'), 0.06],
    [te('Φυτικά υπολείμματα', 'Plant matter'), 0.03],
  ],
  battery: [
    [te('Φορητός φορτιστής', 'Power bank'), 0.03],
    [te('Κυλινδρικό αντικείμενο', 'Cylindrical object'), 0.01],
  ],
  sofa: [
    [te('Πολυθρόνα', 'Armchair'), 0.03],
    [te('Στρώμα', 'Mattress'), 0.02],
  ],
  'glass-bottle': [
    [te('Βάζο', 'Jar'), 0.04],
    [te('Πλαστικό μπουκάλι', 'Plastic bottle'), 0.03],
  ],
  'coffee-maker': [
    [te('Βραστήρας', 'Kettle'), 0.05],
    [te('Μικρή συσκευή κουζίνας', 'Kitchen appliance'), 0.03],
  ],
  unknown: [
    [te('Γυάλινο μπουκάλι', 'Glass bottle'), 0.33],
    [te('Καφετιέρα', 'Coffee maker'), 0.12],
  ],
};

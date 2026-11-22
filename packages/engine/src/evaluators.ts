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
  /** The city can collect it from the door, on request (AthensGov "bulky_waste"). Always true for bulky. */
  pickup?: boolean;
}

export type Evaluator = (ctx: EvalContext) => EvalResult;

/** Answers assumed when the user skips the question. */
export const DEFAULT_ANSWERS: Record<string, Answers> = {
  'pizza-box': { greasy: 'unsure' },
  'food-scraps': { content: 'plant' },
  battery: { kind: 'rechargeable' },
  'glass-bottle': { form: 'bottle' },
  'coffee-maker': { works: 'broken' },
  'power-bank': { kind: 'rechargeable' },
  'light-bulb': { type: 'led' },
};
for (const id of ['mobile-phone', 'laptop', 'small-appliance', 'hair-dryer', 'vacuum', 'microwave', 'tv', 'printer', 'fridge', 'washing-machine', 'oven', 'air-conditioner', 'water-heater'])
  DEFAULT_ANSWERS[id] = { works: 'broken' };

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

const clothes: Evaluator = () => ({
  category: 'special',
  destination: D.textiles,
  confidence: 0.95,
  rules: [],
  headline: te('Ρίξ’ τα στον μωβ κάδο ρούχων', 'Put them in the purple clothing bin'),
  why: te(
    'Τα ρούχα, τα παπούτσια και τα υφάσματα συλλέγονται χωριστά, για να ξαναφορεθούν ή να γίνουν νέες ίνες.',
    'Clothes, shoes and textiles are collected separately, to be worn again or turned into new fibres.',
  ),
  prep: [
    te('Βάλ’ τα καθαρά και στεγνά σε δεμένη σακούλα.', 'Put them clean and dry in a tied bag.'),
    te('Δέσε τα παπούτσια ανά ζευγάρι.', 'Tie shoes together in pairs.'),
  ],
  warnings: [
    te(
      'Βρεγμένα ή μουχλιασμένα υφάσματα δεν ξαναχρησιμοποιούνται: πάνε στον πράσινο κάδο.',
      'Wet or mouldy textiles cannot be reused: they go in the general waste bin.',
    ),
  ],
  notes: [],
  alternatives: te(
    'Αν είναι σε καλή κατάσταση, σκέψου πρώτα να τα δωρίσεις σε κοινωνικό παντοπωλείο ή ενορία.',
    'If they are in good condition, consider donating them to a social grocery or parish first.',
  ),
  condition: te('Καθαρά και στεγνά', 'Clean and dry'),
  pointFilter: { accepts: 'textiles' },
});

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

// ---- Generic evaluators for the wider catalogue (appliances, batteries, textiles, bulky items) ----

interface Extra {
  why?: L10n;
  prep?: L10n[];
  warnings?: L10n[];
}

const shopTakeBack = te(
  'Ή δώσ’ το στο κατάστημα όταν αγοράζεις καινούργιο: τα καταστήματα ηλεκτρικών παίρνουν πίσω την παλιά συσκευή.',
  'Or give it to the shop when you buy a new one: electrical shops take the old appliance back.',
);
const reuseFirst = te(
  'Αφού λειτουργεί, σκέψου πρώτα να το δωρίσεις ή να το πας σε repair café της γειτονιάς: κάποιος άλλος μπορεί να το χρησιμοποιήσει.',
  'Since it still works, consider donating it or taking it to a neighbourhood repair café first: someone else can use it.',
);
const worksCondition = (answers: Answers, fallback: L10n): L10n =>
  answers.works === 'works'
    ? te('Λειτουργεί — προτείνεται επαναχρησιμοποίηση', 'Working — reuse suggested')
    : answers.works === 'broken'
      ? te('Δεν λειτουργεί', 'Does not work')
      : fallback;

/** Small and medium electrical items: WEEE point or shop take-back, reuse first when they work. */
const weee =
  (extra: Extra & { pickup?: boolean } = {}): Evaluator =>
  ({ answers, on }) => {
    const reuse = answers.works === 'works' && on('ATH-WEE-02');
    const ruleOn = on('ATH-WEE-01');
    return {
      category: 'special',
      destination: D.weee,
      confidence: 0.92,
      rules: reuse ? ['ATH-WEE-01', 'ATH-WEE-02'] : ['ATH-WEE-01'],
      certainty: ruleOn ? undefined : 'medium',
      headline: te('Πήγαινέ το σε σημείο συλλογής ηλεκτρικών συσκευών', 'Take it to a WEEE collection point'),
      why:
        extra.why ??
        te(
          'Οι ηλεκτρικές και ηλεκτρονικές συσκευές έχουν πολύτιμα μέταλλα και ουσίες που δεν πρέπει να καταλήξουν σε κάδο.',
          'Electrical and electronic items contain valuable metals and substances that must not end up in a bin.',
        ),
      prep: [...(extra.prep ?? []), shopTakeBack],
      warnings: extra.warnings ?? [],
      notes: ruleOn ? [] : [ruleDisabledNote('ATH-WEE-01')],
      alternatives: reuse ? reuseFirst : undefined,
      condition: worksCondition(answers, te('Ηλεκτρικό ή ηλεκτρονικό', 'Electrical or electronic')),
      pointFilter: { accepts: 'weee' },
      pickup: extra.pickup,
    };
  };

/** Large appliances: the city collects them from the door, or the shop takes the old one back. */
const largeAppliance =
  (extra: Extra = {}): Evaluator =>
  ({ answers, on }) => {
    const reuse = answers.works === 'works' && on('ATH-WEE-02');
    const ruleOn = on('ATH-BLK-01');
    return {
      category: 'bulky',
      destination: te('Παραλαβή από τον Δήμο ή επιστροφή στο κατάστημα', 'City pickup or shop take-back'),
      confidence: 0.93,
      rules: reuse ? ['ATH-BLK-01', 'ATH-WEE-01', 'ATH-WEE-02'] : ['ATH-BLK-01', 'ATH-WEE-01'],
      certainty: ruleOn ? undefined : 'medium',
      headline: te('Ζήτα από τον Δήμο να το παραλάβει', 'Ask the city to collect it'),
      why:
        extra.why ??
        te(
          'Οι μεγάλες συσκευές δεν χωράνε σε κάδο και έχουν μέταλλα και ουσίες που θέλουν ειδική επεξεργασία. Ο Δήμος τις παραλαμβάνει από την πόρτα σου, κατόπιν αιτήματος.',
          'Large appliances do not fit a bin and contain metals and substances that need special treatment. The city collects them from your door, on request.',
        ),
      prep: [
        te('Κάνε αίτημα από την εφαρμογή ή κάλεσε το 1595.', 'Send a request from the app or call 1595.'),
        ...(extra.prep ?? []),
        te('Μην το βγάλεις στο πεζοδρόμιο πριν από την ημέρα παραλαβής.', 'Do not put it out on the pavement before pickup day.'),
        te(
          'Αν αγοράζεις καινούργιο, το κατάστημα παίρνει συνήθως το παλιό κατά την παράδοση.',
          'If you are buying a new one, the shop usually takes the old one away on delivery.',
        ),
      ],
      warnings: extra.warnings ?? [],
      notes: ruleOn ? [] : [ruleDisabledNote('ATH-BLK-01')],
      alternatives: reuse ? reuseFirst : undefined,
      condition: worksCondition(answers, te('Μεγάλη συσκευή', 'Large appliance')),
      pointFilter: { accepts: 'weee' },
      pickup: true,
    };
  };

/** Furniture and other bulky items: city pickup from the door, by request. */
const bulkyItem =
  (why: L10n, extra: Extra = {}): Evaluator =>
  ({ on }) => {
    const ruleOn = on('ATH-BLK-01');
    return {
      category: 'bulky',
      destination: D.bulky,
      confidence: 0.94,
      rules: ['ATH-BLK-01'],
      certainty: ruleOn ? undefined : 'medium',
      headline: te('Ζήτα από τον Δήμο να το παραλάβει', 'Ask the city to collect it'),
      why,
      prep: [
        te('Κάνε αίτημα από την εφαρμογή ή κάλεσε το 1595.', 'Send a request from the app or call 1595.'),
        ...(extra.prep ?? []),
        te('Μην το βγάλεις στο πεζοδρόμιο πριν από την ημέρα παραλαβής.', 'Do not put it out on the pavement before pickup day.'),
      ],
      warnings: extra.warnings ?? [],
      notes: ruleOn ? [] : [ruleDisabledNote('ATH-BLK-01')],
      alternatives: te(
        'Αν είναι σε καλή κατάσταση, σκέψου να το δωρίσεις σε κάποια οργάνωση ή σε ομάδα ανταλλαγής της γειτονιάς.',
        'If it is in good shape, consider donating it to a charity or a neighbourhood swap group.',
      ),
      condition: te('Μεγάλο μέγεθος — δεν χωράει σε κάδο', 'Large size — does not fit a bin'),
      pickup: true,
    };
  };

const dataWipe = te(
  'Σβήσε τα δεδομένα σου (επαναφορά εργοστασίου) και βγάλε την κάρτα SIM και την κάρτα μνήμης.',
  'Wipe your data (factory reset) and remove the SIM and memory cards.',
);
const swollen = te(
  'Αν η μπαταρία έχει φουσκώσει, μην το πιέσεις και μην το φορτίσεις: κίνδυνος φωτιάς.',
  'If the battery has swollen, do not press or charge it: fire risk.',
);
const refrigerant = te(
  'Μην κόψεις και μην τρυπήσεις τους σωλήνες: έχουν ψυκτικό αέριο που βλάπτει το κλίμα.',
  'Do not cut or pierce the pipes: they hold refrigerant gas that harms the climate.',
);

const lightBulb: Evaluator = ({ answers, on }) => {
  if (answers.type === 'incandescent')
    return {
      category: 'general',
      destination: D.general,
      confidence: 0.9,
      rules: [],
      headline: te('Τύλιξέ τη και ρίξ’ τη στον πράσινο κάδο', 'Wrap it and put it in general waste'),
      why: te(
        'Οι παλιές λάμπες πυράκτωσης και αλογόνου δεν έχουν ηλεκτρονικά ούτε υδράργυρο και δεν ανακυκλώνονται.',
        'Old incandescent and halogen bulbs have no electronics or mercury and are not recycled.',
      ),
      prep: [te('Τύλιξέ τη σε χαρτί, για να μην κοπεί κανείς αν σπάσει.', 'Wrap it in paper so no one is cut if it breaks.')],
      warnings: [],
      notes: [],
      condition: te('Πυράκτωσης ή αλογόνου', 'Incandescent or halogen'),
    };
  const ruleOn = on('ATH-WEE-01');
  return {
    category: 'special',
    destination: te('Κάδος ανακύκλωσης λαμπτήρων', 'Lamp recycling bin'),
    confidence: 0.92,
    rules: ['ATH-WEE-01'],
    certainty: ruleOn ? undefined : 'medium',
    headline: te('Ρίξ’ τη στον κάδο ανακύκλωσης λαμπτήρων', 'Put it in a lamp recycling bin'),
    why: te(
      'Οι λάμπες LED και οικονομίας έχουν ηλεκτρονικά και λίγο υδράργυρο. Οι κάδοι λαμπτήρων βρίσκονται σε σούπερ μάρκετ και καταστήματα ηλεκτρικών.',
      'LED and energy-saving bulbs contain electronics and a little mercury. Lamp bins are in supermarkets and electrical shops.',
    ),
    prep: [te('Παράδωσέ τη ολόκληρη, χωρίς να τη σπάσεις.', 'Hand it in whole, unbroken.')],
    warnings: [
      te(
        'Αν σπάσει λάμπα οικονομίας, άνοιξε το παράθυρο και μάζεψε τα κομμάτια με χαρτί, όχι με ηλεκτρική σκούπα.',
        'If an energy-saving bulb breaks, open the window and pick up the pieces with paper, not a vacuum cleaner.',
      ),
    ],
    notes: ruleOn ? [] : [ruleDisabledNote('ATH-WEE-01')],
    condition: te('LED ή οικονομίας', 'LED or energy-saving'),
    pointFilter: { accepts: 'weee' },
  };
};

const carBattery: Evaluator = ({ on }) => {
  const ruleOn = on('ATH-SPC-01');
  return {
    category: 'special',
    destination: te('Συνεργείο, κατάστημα ανταλλακτικών ή Πράσινο Σημείο', 'Garage, parts shop or recycling centre'),
    confidence: 0.95,
    rules: ['ATH-SPC-01'],
    certainty: ruleOn ? undefined : 'medium',
    headline: te('Δώσ’ τη σε συνεργείο ή κατάστημα ανταλλακτικών', 'Give it to a garage or a parts shop'),
    why: te(
      'Οι μπαταρίες αυτοκινήτου έχουν μόλυβδο και οξύ. Τα συνεργεία και τα καταστήματα που τις πουλάνε τις παίρνουν πίσω για ανακύκλωση.',
      'Car batteries contain lead and acid. Garages and the shops that sell them take them back for recycling.',
    ),
    prep: [
      te('Μετέφερέ τη όρθια, για να μη χυθεί οξύ.', 'Carry it upright so no acid spills.'),
      te('Φόρεσε γάντια αν έχει διαρροή.', 'Wear gloves if it is leaking.'),
    ],
    warnings: [te('Ποτέ σε κάδο και ποτέ στο έδαφος: το οξύ καίει και μολύνει.', 'Never in a bin or on the ground: the acid burns and pollutes.')],
    notes: ruleOn ? [] : [ruleDisabledNote('ATH-SPC-01')],
    condition: te('Μπαταρία μολύβδου', 'Lead-acid battery'),
    pointFilter: { accepts: 'batteries' },
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
  clothes,
  'coffee-maker': coffeeMaker,
  'mobile-phone': weee({ prep: [dataWipe], warnings: [swollen] }),
  laptop: weee({ prep: [dataWipe], warnings: [swollen] }),
  'small-appliance': weee({ prep: [te('Βγάλ’ το από την πρίζα και άδειασέ το από νερό και υπολείμματα.', 'Unplug it and empty any water and residue.')] }),
  'hair-dryer': weee(),
  vacuum: weee({ prep: [te('Άδειασε τη σακούλα ή το δοχείο σκόνης στον πράσινο κάδο.', 'Empty the dust bag or bin into general waste.')], warnings: [swollen] }),
  microwave: weee({ pickup: true, prep: [te('Καθάρισέ τον και βγάλε το γυάλινο πιάτο.', 'Clean it and take out the glass plate.')] }),
  tv: weee({ pickup: true, prep: [te('Μετέφερέ τη προσεκτικά, χωρίς να σπάσει η οθόνη.', 'Carry it carefully so the screen does not break.')] }),
  printer: weee({ prep: [te('Βγάλε τα μελάνια ή το τόνερ: τα παίρνουν πίσω τα καταστήματα που τα πουλάνε.', 'Take out the ink or toner: the shops that sell them take them back.')] }),
  cables: weee({
    why: te(
      'Τα καλώδια, οι φορτιστές και τα ακουστικά είναι ηλεκτρικός εξοπλισμός: ο χαλκός τους ανακτάται μόνο σε σημείο συλλογής.',
      'Cables, chargers and headphones are electrical equipment: their copper is recovered only at a collection point.',
    ),
    prep: [te('Μάζεψέ τα σε μια σακούλα και παράδωσέ τα μαζί.', 'Gather them in one bag and hand them in together.')],
  }),
  'light-bulb': lightBulb,
  fridge: largeAppliance({ prep: [te('Άδειασέ το, ξεπάγωσέ το και άφησε την πόρτα ανοιχτή να στεγνώσει.', 'Empty and defrost it, and leave the door open to dry.')], warnings: [refrigerant] }),
  'washing-machine': largeAppliance({ prep: [te('Άδειασε το νερό από το φίλτρο και αποσύνδεσε τα λάστιχα.', 'Drain the water from the filter and disconnect the hoses.')] }),
  oven: largeAppliance({ prep: [te('Αν είναι συνδεδεμένη μόνιμα στο ρεύμα, την αποσυνδέει ηλεκτρολόγος.', 'If it is wired in, have an electrician disconnect it.')] }),
  'air-conditioner': largeAppliance({ prep: [te('Την αποξήλωση την κάνει τεχνικός ψύξης.', 'Have a refrigeration technician remove it.')], warnings: [refrigerant] }),
  'water-heater': largeAppliance({ prep: [te('Την αποσύνδεση την κάνει υδραυλικός· άδειασέ τον από το νερό.', 'Have a plumber disconnect it, and drain the water.')] }),
  'power-bank': battery,
  'car-battery': carBattery,
  shoes: clothes,
  'home-textiles': clothes,
  mattress: bulkyItem(
    te('Το στρώμα δεν χωράει σε κάδο: ο Δήμος το παραλαμβάνει ξεχωριστά, για να ανακτηθούν ελατήρια και αφρώδες υλικό.', 'A mattress does not fit a bin: the city collects it separately so its springs and foam can be recovered.'),
    { prep: [te('Τύλιξέ το σε νάιλον αν βρέχει, για να μείνει στεγνό.', 'Wrap it in plastic if it rains, to keep it dry.')] },
  ),
  armchair: bulkyItem(te('Τα έπιπλα είναι ογκώδη: δεν μπαίνουν σε κάδο και παραλαμβάνονται ξεχωριστά, κατόπιν αιτήματος.', 'Furniture is bulky: it does not go in a bin and is collected separately, on request.')),
  wardrobe: bulkyItem(
    te('Τα έπιπλα είναι ογκώδη: δεν μπαίνουν σε κάδο και παραλαμβάνονται ξεχωριστά, κατόπιν αιτήματος.', 'Furniture is bulky: it does not go in a bin and is collected separately, on request.'),
    { prep: [te('Αν μπορείς, λύσ’ το σε κομμάτια και βγάλε τζάμια και καθρέφτες.', 'If you can, take it apart and remove glass panels and mirrors.')] },
  ),
  table: bulkyItem(
    te('Τα έπιπλα είναι ογκώδη: δεν μπαίνουν σε κάδο και παραλαμβάνονται ξεχωριστά, κατόπιν αιτήματος.', 'Furniture is bulky: it does not go in a bin and is collected separately, on request.'),
    { prep: [te('Αν έχει γυάλινη επιφάνεια, τύλιξέ τη για να μη σπάσει.', 'If it has a glass top, wrap it so it does not break.')] },
  ),
  bed: bulkyItem(
    te('Τα έπιπλα είναι ογκώδη: δεν μπαίνουν σε κάδο και παραλαμβάνονται ξεχωριστά, κατόπιν αιτήματος.', 'Furniture is bulky: it does not go in a bin and is collected separately, on request.'),
    { prep: [te('Λύσ’ το σε κομμάτια, αν γίνεται.', 'Take it apart, if you can.')] },
  ),
  carpet: bulkyItem(
    te('Τα χαλιά είναι ογκώδη και βαριά: δεν μπαίνουν σε κάδο και παραλαμβάνονται ξεχωριστά, κατόπιν αιτήματος.', 'Carpets are bulky and heavy: they do not go in a bin and are collected separately, on request.'),
    { prep: [te('Τύλιξέ το σε ρολό και δέσ’ το.', 'Roll it up and tie it.')] },
  ),
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
  clothes: [
    [te('Υφάσματα σπιτιού', 'Household textiles'), 0.03],
    [te('Τσάντα', 'Bag'), 0.02],
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

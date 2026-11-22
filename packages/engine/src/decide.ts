import { CATEGORIES } from './categories';
import { getObject } from './catalog';
import { DEFAULT_ANSWERS, EVALUATORS, RUNNER_UPS } from './evaluators';
import { formatDistance, te } from './l10n';
import { DEFAULT_LOCATION, type LngLat, rankPoints } from './points';
import { ruleLookup } from './rules';
import type {
  Answers,
  Certainty,
  CollectionPoint,
  Decision,
  DistrictContext,
  L10n,
  OrganicService,
  Outcome,
  RankedPoint,
  RuleState,
  TraceStep,
} from './types';

export interface DecideInput {
  objectId: string;
  /** Answers the user actually gave. Missing answers fall back to DEFAULT_ANSWERS. */
  answers?: Answers;
}

export interface DecideContext {
  district: DistrictContext;
  rules: readonly RuleState[];
}

/** Stable key for a decision: `pizza-box:greasy=yes`. */
export function decisionKey(objectId: string, answers: Answers): string {
  const parts = Object.keys(answers)
    .sort()
    .map((k) => `${k}=${answers[k]}`);
  return parts.length ? `${objectId}:${parts.join(',')}` : objectId;
}

/** Drop answers that are not valid options of the object's questions. */
export function sanitizeAnswers(objectId: string, answers: Answers = {}): Answers {
  const obj = getObject(objectId);
  const out: Answers = {};
  for (const q of obj?.questions ?? []) {
    const a = answers[q.id];
    if (a && q.options.some((o) => o.id === a)) out[q.id] = a;
  }
  return out;
}

export const needsClarification = (objectId: string, answers: Answers = {}) =>
  (getObject(objectId)?.questions ?? []).some((q) => !answers[q.id]);

const certaintyOf = (confidence: number): Certainty =>
  confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'medium' : 'low';

/** Step 1: apply the municipal rules. Pure, synchronous, no I/O. */
export function evaluate(input: DecideInput, ctx: DecideContext): Outcome {
  const obj = getObject(input.objectId) ?? getObject('unknown')!;
  const given = sanitizeAnswers(obj.id, input.answers);
  const answers = { ...(DEFAULT_ANSWERS[obj.id] ?? {}), ...given };
  const evaluator = EVALUATORS[obj.id] ?? EVALUATORS.unknown!;
  const r = evaluator({ obj, answers, district: ctx.district, on: ruleLookup(ctx.rules) });
  return {
    key: decisionKey(obj.id, given),
    objectId: obj.id,
    answers: given,
    district: ctx.district,
    category: r.category,
    destination: r.destination,
    headline: r.headline,
    why: r.why,
    prep: r.prep,
    warnings: r.warnings,
    notes: r.notes,
    alternatives: r.alternatives,
    condition: r.condition,
    confidence: r.confidence,
    certainty: r.certainty ?? certaintyOf(r.confidence),
    rulesApplied: Array.from(new Set(r.rules)),
    uncertain: !!r.uncertain,
    glassBell: !!r.glassBell,
    pickup: !r.uncertain && (r.category === 'bulky' || !!r.pickup),
    // No points for general waste: green bins are on every street, and listing nearby recycling bins
    // next to "general waste" reads as "put it in the blue bin".
    pointQuery:
      r.uncertain || r.category === 'general'
        ? null
        : {
            category: r.category,
            ...(r.pointFilter ?? {}),
          },
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const coverage = (s: OrganicService): L10n =>
  s === 'full'
    ? te('πλήρης κάλυψη', 'full coverage')
    : s === 'partial'
      ? te('μερική κάλυψη', 'partial coverage')
      : te('χωρίς κάλυψη', 'no coverage');

/** Step 2: attach the nearby points and the 6-step explainable trace. */
export function explain(outcome: Outcome, nearby: readonly RankedPoint[] = []): Decision {
  const obj = getObject(outcome.objectId) ?? getObject('unknown')!;
  const { district } = outcome;
  const question = obj.questions[0];
  const effective = { ...(DEFAULT_ANSWERS[obj.id] ?? {}), ...outcome.answers };
  const chosen = question?.options.find((o) => o.id === effective[question.id]);
  const nearest = nearby[0];
  const finalOutput = outcome.uncertain
    ? te('Χρειάζεται επιβεβαίωση από τον χρήστη', 'User confirmation required')
    : te(
        `${outcome.destination.el} · ${pct(outcome.confidence)}`,
        `${outcome.destination.en} · ${pct(outcome.confidence)}`,
      );
  const certaintyEl =
    outcome.certainty === 'high' ? 'υψηλή' : outcome.certainty === 'medium' ? 'μέτρια' : 'χαμηλή';

  const trace: TraceStep[] = [
    {
      stage: 'recognition',
      title: te('Αναγνώριση αντικειμένου', 'Object recognition'),
      summary: te(
        'Το μοντέλο όρασης κοιτάζει τη φωτογραφία και προτείνει τι μπορεί να είναι το αντικείμενο.',
        'The vision model analyses the photo and proposes candidate classes.',
      ),
      inputs: [
        {
          label: te('Μοντέλο όρασης', 'Vision model'),
          value: te('έκδοση 2.3 · 3 υποψήφια αντικείμενα', 'v2.3 · 3 candidate classes'),
        },
        {
          label: te('Πρώτη επιλογή', 'Top class'),
          value: te(
            `${obj.name.el} · ${pct(obj.recognitionConfidence)}`,
            `${obj.name.en} · ${pct(obj.recognitionConfidence)}`,
          ),
        },
        ...(RUNNER_UPS[obj.id] ?? []).map(([name, c]) => ({
          label: te('Υποψήφια', 'Candidate'),
          value: te(`${name.el} · ${pct(c)}`, `${name.en} · ${pct(c)}`),
        })),
      ],
      output:
        obj.id === 'unknown'
          ? te('Δεν είμαστε σίγουροι τι είναι', 'Low confidence — not recognised')
          : te(`Αναγνωρίστηκε: ${obj.name.el}`, `Recognised: ${obj.name.en}`),
      confidence: obj.recognitionConfidence,
      durationMs: 420,
    },
    {
      stage: 'material',
      title: te('Υλικό αντικειμένου', 'Material classification'),
      summary: te(
        'Βρίσκουμε από ποιο υλικό είναι φτιαγμένο το αντικείμενο και σε ποια κατηγορία αποβλήτων ανήκει.',
        'The item is mapped to a material and waste stream.',
      ),
      inputs: [
        { label: te('Αντικείμενο', 'Item'), value: obj.name },
        {
          label: te('Κατάλογος υλικών', 'Material catalogue'),
          value: te(
            'Ευρωπαϊκός κατάλογος αποβλήτων (απλοποιημένος)',
            'European waste catalogue · simplified',
          ),
        },
      ],
      output: obj.material,
      confidence: Math.max(0.3, obj.recognitionConfidence - 0.02),
      durationMs: 180,
    },
    {
      stage: 'condition',
      title: te('Κατάσταση αντικειμένου', 'Condition assessment'),
      summary: question
        ? te(
            'Σου κάναμε μια ερώτηση, γιατί η φωτογραφία από μόνη της δεν αρκεί.',
            'We asked one clarifying question because the image alone is not enough.',
          )
        : te(
            'Η φωτογραφία αρκεί· δεν χρειάστηκε να ρωτήσουμε τίποτα.',
            'The image is enough; no clarification was needed.',
          ),
      inputs: question
        ? [{ label: question.prompt, value: chosen ? chosen.label : te('Δεν απάντησες', 'Skipped') }]
        : [{ label: te('Ερώτηση', 'Clarification'), value: te('Δεν χρειάστηκε', 'Not required') }],
      output: outcome.condition,
      confidence:
        question && (!effective[question.id] || effective[question.id] === 'unsure')
          ? 0.78
          : Math.min(0.99, obj.recognitionConfidence + 0.01),
      durationMs: 90,
    },
    {
      stage: 'rules',
      title: te('Κανόνες του Δήμου', 'Municipal rules'),
      summary: te(
        'Ελέγχουμε ποιοι ενεργοί κανόνες του Δήμου αφορούν αυτό το αντικείμενο.',
        'Active municipal rules that concern the item are applied.',
      ),
      inputs: outcome.rulesApplied.length
        ? outcome.rulesApplied.map((code) => ({ label: te('Κανόνας', 'Rule'), value: te(code, code) }))
        : [{ label: te('Κανόνες', 'Rules'), value: te('Κανένας ενεργός κανόνας', 'No active rule') }],
      output: outcome.uncertain
        ? te('Αναμονή για επιβεβαίωση', 'Awaiting confirmation')
        : te(
            `Κατηγορία: ${CATEGORIES[outcome.category].short.el}`,
            `Category: ${CATEGORIES[outcome.category].short.en}`,
          ),
      confidence: outcome.confidence,
      durationMs: 140,
      ruleCodes: outcome.rulesApplied,
    },
    {
      stage: 'location',
      title: te('Τι υπάρχει στη γειτονιά', 'Location availability'),
      summary: te(
        'Ελέγχουμε ποιες υπηρεσίες και ποια σημεία υπάρχουν στη γειτονιά σου.',
        'We check which services and points exist in your neighbourhood.',
      ),
      inputs: [
        { label: te('Γειτονιά', 'Neighbourhood'), value: district.name },
        { label: te('Καφέ κάδος', 'Brown bin'), value: coverage(district.organicService) },
        ...(nearest
          ? [
              {
                label: te('Κοντινότερο σημείο', 'Nearest point'),
                value: te(
                  `${nearest.name.el} · ${formatDistance(nearest.distance, 'el')}`,
                  `${nearest.name.en} · ${formatDistance(nearest.distance, 'en')}`,
                ),
              },
            ]
          : []),
      ],
      output:
        district.id === 'athens'
          ? te(
              `Όλη η πόλη · καφέ κάδος: ${coverage(district.organicService).el}`,
              `Whole city · brown bin: ${coverage(district.organicService).en}`,
            )
          : te(
              `${district.name.el} · καφέ κάδος: ${coverage(district.organicService).el}`,
              `${district.name.en} · brown bin: ${coverage(district.organicService).en}`,
            ),
      durationMs: 210,
    },
    {
      stage: 'final',
      title: te('Τελική σύσταση', 'Final recommendation'),
      summary: te('Βάζουμε τα παραπάνω σε μία σαφή οδηγία.', 'All steps are combined into one clear instruction.'),
      inputs: [
        {
          label: te('Κατηγορία', 'Category'),
          value: outcome.uncertain ? te('—', '—') : CATEGORIES[outcome.category].short,
        },
        {
          label: te('Βεβαιότητα', 'Certainty'),
          value: te(
            `${pct(outcome.confidence)} · ${certaintyEl}`,
            `${pct(outcome.confidence)} · ${outcome.certainty}`,
          ),
        },
      ],
      output: finalOutput,
      confidence: outcome.confidence,
      durationMs: 60,
    },
  ];

  const { district: _d, ...rest } = outcome;
  return { ...rest, districtId: district.id, nearbyPointIds: nearby.map((p) => p.id), trace };
}

/** Convenience: evaluate, rank nearby points from an in-memory list, explain. */
export function decide(
  input: DecideInput,
  ctx: DecideContext & { points?: readonly CollectionPoint[]; from?: LngLat },
): { decision: Decision; nearby: RankedPoint[] } {
  const outcome = evaluate(input, ctx);
  const nearby =
    outcome.pointQuery && ctx.points
      ? rankPoints(ctx.points, outcome.pointQuery, ctx.from ?? DEFAULT_LOCATION)
      : [];
  return { decision: explain(outcome, nearby), nearby };
}

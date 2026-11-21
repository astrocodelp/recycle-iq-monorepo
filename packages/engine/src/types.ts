export type Lang = 'el' | 'en';

/** Every user-facing string is bilingual. Greek is written first. */
export interface L10n {
  el: string;
  en: string;
}

export const CATEGORY_IDS = ['packaging', 'organic', 'general', 'special', 'bulky'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type OrganicService = 'full' | 'partial' | 'none';
export type Certainty = 'high' | 'medium' | 'low';

export const RULE_CODES = [
  'ATH-PKG-01',
  'ATH-PKG-02',
  'ATH-PKG-03',
  'ATH-GLS-02',
  'ATH-ORG-01',
  'ATH-ORG-02',
  'ATH-SPC-01',
  'ATH-SPC-02',
  'ATH-WEE-01',
  'ATH-WEE-02',
  'ATH-BLK-01',
  'ATH-GEN-01',
  'ATH-LOC-01',
] as const;
export type RuleCode = (typeof RULE_CODES)[number];

export interface QuestionOption {
  id: string;
  label: L10n;
  hint?: L10n;
}

export interface Question {
  id: string;
  prompt: L10n;
  helper?: L10n;
  options: QuestionOption[];
}

export interface CatalogObject {
  id: string;
  name: L10n;
  aliases: string[];
  material: L10n;
  /** Lucide icon name (PascalCase). */
  icon: string;
  thumbTone: string;
  /** Confidence of the (simulated) vision model for this class. */
  recognitionConfidence: number;
  fact?: L10n;
  /** At most one clarifying question is asked. */
  questions: Question[];
  /** Only for `unknown`: the top guesses offered to the user. */
  guesses?: { objectId: string; confidence: number }[];
}

export interface Rule {
  id: string;
  code: RuleCode;
  enabled: boolean;
  version: string;
  updatedAt: string;
  title: L10n;
  text: L10n;
  appliesTo: string[];
  source: L10n;
}

/** The minimum the engine needs to know about a rule at decision time. */
export interface RuleState {
  code: RuleCode;
  enabled: boolean;
}

/** Where the user is. `id: 'athens'` means the whole city. */
export interface DistrictContext {
  id: string;
  name: L10n;
  organicService: OrganicService;
}

export type Answers = Record<string, string>;

/** Declarative, serialisable description of which collection points fit a decision. */
export interface PointQuery {
  category: CategoryId;
  glassBell?: boolean;
  /** Raw acceptance tag the point must take: batteries, weee (small or large), ... */
  accepts?: 'batteries' | 'weee';
}

export type PointStatus = 'available' | 'full' | 'closed';

export interface CollectionPoint {
  id: string;
  kind: string;
  name: L10n;
  lng: number;
  lat: number;
  districtId: string | null;
  categories: CategoryId[];
  /** Raw tags: paper, plastic, glass, batteries, weee_small, weee_large, ... */
  accepts: string[];
  glassBell: boolean;
  status: PointStatus;
}

export interface RankedPoint extends CollectionPoint {
  /** Metres from the reference location. */
  distance: number;
}

export type TraceStage = 'recognition' | 'material' | 'condition' | 'rules' | 'location' | 'final';

export interface TraceStep {
  stage: TraceStage;
  title: L10n;
  summary: L10n;
  inputs: { label: L10n; value: L10n }[];
  output: L10n;
  confidence?: number;
  durationMs: number;
  ruleCodes?: RuleCode[];
}

/** Result of the rules, before nearby points and the trace are attached. */
export interface Outcome {
  key: string;
  objectId: string;
  answers: Answers;
  district: DistrictContext;
  category: CategoryId;
  destination: L10n;
  headline: L10n;
  why: L10n;
  prep: L10n[];
  warnings: L10n[];
  notes: L10n[];
  alternatives?: L10n;
  condition: L10n;
  confidence: number;
  certainty: Certainty;
  rulesApplied: RuleCode[];
  uncertain: boolean;
  glassBell: boolean;
  /** null when the decision is uncertain and no point should be suggested. */
  pointQuery: PointQuery | null;
}

export interface Decision extends Omit<Outcome, 'district'> {
  districtId: string;
  nearbyPointIds: string[];
  trace: TraceStep[];
}

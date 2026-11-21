import 'server-only';
import { dbSource, type BinSource } from '@/lib/bins';
import {
  collectionPoints,
  decisions,
  districts,
  getDb,
  rules as rulesTable,
  asc,
  eq,
} from '@recycleiq/db';
import {
  unlockedAt,
  DEFAULT_LOCATION,
  cityContext,
  evaluate,
  explain,
  rankPoints,
  type CollectionPoint,
  type Decision,
  type DistrictContext,
  type LngLat,
  type RankedPoint,
  type RuleState,
  type Story,
} from '@recycleiq/engine';
import { scansInDistrict, storiesFor } from './stories';

export async function getRuleStates(): Promise<RuleState[]> {
  return getDb().select({ code: rulesTable.code, enabled: rulesTable.enabled }).from(rulesTable);
}

export async function getDistricts() {
  return getDb()
    .select({
      id: districts.id,
      name: districts.name,
      communityId: districts.communityId,
      organicService: districts.organicService,
      areaKm2: districts.areaKm2,
      lng: districts.lng,
      lat: districts.lat,
    })
    .from(districts)
    .orderBy(asc(districts.id));
}

/** District context for the engine, or the whole city when no district is given. */
export async function getDistrictContext(districtId?: string | null) {
  const all = await getDistricts();
  const d = districtId ? all.find((x) => x.id === districtId) : undefined;
  const ctx: DistrictContext = d
    ? { id: d.id, name: d.name, organicService: d.organicService }
    : cityContext(all);
  const centre: LngLat = d ? { lng: d.lng, lat: d.lat } : DEFAULT_LOCATION;
  return { ctx, centre, known: !!d };
}

export async function getPoints(source: BinSource = 'synthetic'): Promise<(CollectionPoint & { street: unknown; hours: unknown; lastVerifiedAt: Date | null; source: string })[]> {
  const rows = await getDb().select().from(collectionPoints).where(eq(collectionPoints.source, dbSource(source)));
  return rows.map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.name,
    street: p.street,
    lng: p.lng,
    lat: p.lat,
    districtId: p.districtId,
    categories: p.categories,
    accepts: p.accepts,
    glassBell: p.glassBell,
    status: p.status,
    hours: p.hours,
    lastVerifiedAt: p.lastVerifiedAt,
    source: p.source,
  }));
}

export interface DecisionRequest {
  objectId: string;
  answers?: Record<string, string>;
  districtId?: string | null;
  deviceId?: string | null;
  via?: 'search' | 'scan' | 'api';
  /** Persist the decision (dashboard analytics). */
  record?: boolean;
  /** Bin inventory for the nearby suggestions. */
  binSource?: BinSource;
}

/** The one path every recommendation goes through: rules from the DB, engine, nearby points, log. */
export async function makeDecision(req: DecisionRequest): Promise<{
  id: string | null;
  decision: Decision;
  nearby: RankedPoint[];
  /** A neighbourhood story this scan unlocked, if any. */
  unlockedStory: (Story & { threshold: number }) | null;
}> {
  const [rules, { ctx, centre, known }, points] = await Promise.all([
    getRuleStates(),
    getDistrictContext(req.districtId),
    getPoints(req.binSource ?? 'synthetic'),
  ]);
  const outcome = evaluate({ objectId: req.objectId, answers: req.answers }, { district: ctx, rules });
  const nearby = outcome.pointQuery ? rankPoints(points, outcome.pointQuery, centre) : [];
  const decision = explain(outcome, nearby);
  let id: string | null = null;
  if (req.record !== false) {
    const [row] = await getDb()
      .insert(decisions)
      .values({
        deviceId: req.deviceId ?? null,
        objectId: decision.objectId,
        decisionKey: decision.key,
        answers: decision.answers,
        districtId: known ? ctx.id : null,
        category: decision.category,
        confidence: decision.confidence,
        certainty: decision.certainty,
        uncertain: decision.uncertain,
        clarified: Object.keys(decision.answers).length > 0,
        rulesApplied: decision.rulesApplied,
        via: req.via ?? 'api',
        payload: decision,
      })
      .returning({ id: decisions.id });
    id = row?.id ?? null;
  }
  let unlockedStory: (Story & { threshold: number }) | null = null;
  if (id && known && req.deviceId) {
    const [stories, scans] = await Promise.all([storiesFor(ctx.id, req.binSource ?? 'synthetic'), scansInDistrict(req.deviceId, ctx.id)]);
    const i = unlockedAt(scans, stories.length);
    if (i != null) unlockedStory = stories[i]!;
  }
  return { id, decision, nearby, unlockedStory };
}

export const pointById = async (id: string) =>
  (await getDb().select().from(collectionPoints).where(eq(collectionPoints.id, id)))[0];

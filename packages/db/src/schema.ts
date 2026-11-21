import type { L10n, RuleCode } from '@recycleiq/engine';
import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const wasteCategory = pgEnum('waste_category', [
  'packaging',
  'organic',
  'general',
  'special',
  'bulky',
]);
export const organicService = pgEnum('organic_service', ['full', 'partial', 'none']);
export const certainty = pgEnum('certainty', ['high', 'medium', 'low']);
export const pointKind = pgEnum('point_kind', [
  'green_point',
  'blue_bin',
  'glass_bell',
  'brown_bin',
  'battery_point',
  'weee_point',
  'clothing_bin',
]);
export const pointStatus = pgEnum('point_status', ['available', 'full', 'closed']);

/** The 7 municipal communities (Δημοτικές Κοινότητες) of Athens. */
export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: jsonb('name').$type<L10n>().notNull(),
});

/** The 38 official districts (συνοικίες) of the Municipality of Athens. */
export const districts = pgTable('districts', {
  id: text('id').primaryKey(),
  geoId: text('geo_id').notNull(),
  name: jsonb('name').$type<L10n>().notNull(),
  communityId: text('community_id')
    .notNull()
    .references(() => communities.id),
  areaKm2: real('area_km2').notNull(),
  organicService: organicService('organic_service').notNull(),
  lng: doublePrecision('lng').notNull(),
  lat: doublePrecision('lat').notNull(),
  /** Stylised SVG outline in the prototype's 1209x1199 Athens map space. */
  svgPath: text('svg_path').notNull(),
  svgCentroid: jsonb('svg_centroid').$type<{ x: number; y: number }>().notNull(),
});

export interface OpeningHours {
  label: L10n;
  periods: { days: string[]; open: string; close: string }[];
}

export const collectionPoints = pgTable(
  'collection_points',
  {
    id: text('id').primaryKey(),
    kind: pointKind('kind').notNull(),
    name: jsonb('name').$type<L10n>().notNull(),
    street: jsonb('street').$type<L10n>(),
    districtId: text('district_id').references(() => districts.id),
    lng: doublePrecision('lng').notNull(),
    lat: doublePrecision('lat').notNull(),
    categories: wasteCategory('categories').array().notNull(),
    /** paper, plastic, metal, cartons, glass, batteries, weee_small, weee_large, lamps, textiles, ... */
    accepts: text('accepts').array().notNull(),
    glassBell: boolean('glass_bell').notNull().default(false),
    staffed: boolean('staffed').notNull().default(false),
    /** null = always accessible (street bins). */
    hours: jsonb('hours').$type<OpeningHours>(),
    status: pointStatus('status').notNull().default('available'),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    /** mock | osm | municipal */
    source: text('source').notNull().default('mock'),
    /** Illustrative locations, not official municipal data. */
    illustrative: boolean('illustrative').notNull().default(true),
  },
  (t) => [index('points_district_idx').on(t.districtId), index('points_kind_idx').on(t.kind)],
);

/** Municipal rule registry. Toggled from the dashboard; read by the engine on every decision. */
export const rules = pgTable('rules', {
  code: text('code').$type<RuleCode>().primaryKey(),
  slug: text('slug').notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  version: text('version').notNull(),
  title: jsonb('title').$type<L10n>().notNull(),
  body: jsonb('body').$type<L10n>().notNull(),
  appliesTo: text('applies_to').array().notNull(),
  source: jsonb('source').$type<L10n>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
});

/** Audit log of rule toggles. */
export const ruleChanges = pgTable('rule_changes', {
  id: serial('id').primaryKey(),
  code: text('code')
    .$type<RuleCode>()
    .notNull()
    .references(() => rules.code),
  enabled: boolean('enabled').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  changedBy: text('changed_by'),
});

/** Every recommendation shown to a resident. The dashboard aggregates this table. */
export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Anonymous app-install id. No personal data. */
    deviceId: text('device_id'),
    objectId: text('object_id').notNull(),
    decisionKey: text('decision_key').notNull(),
    answers: jsonb('answers').$type<Record<string, string>>().notNull().default({}),
    /** null = whole city (no neighbourhood chosen). */
    districtId: text('district_id').references(() => districts.id),
    category: wasteCategory('category').notNull(),
    confidence: real('confidence').notNull(),
    certainty: certainty('certainty').notNull(),
    uncertain: boolean('uncertain').notNull().default(false),
    /** The user answered a clarifying question. */
    clarified: boolean('clarified').notNull().default(false),
    rulesApplied: text('rules_applied').array().notNull().default(sql`'{}'::text[]`),
    /** search | scan | api */
    via: text('via').notNull().default('search'),
    /** Full explained decision as shown to the user (null for synthetic rows). */
    payload: jsonb('payload'),
    synthetic: boolean('synthetic').notNull().default(false),
  },
  (t) => [
    index('decisions_created_idx').on(t.createdAt),
    index('decisions_district_idx').on(t.districtId),
  ],
);

/** Daily bin-selfie check-ins that earn κουπόνια. Photos are not stored. */
export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deviceId: text('device_id').notNull(),
    decisionId: uuid('decision_id').references(() => decisions.id),
    districtId: text('district_id').references(() => districts.id),
    earned: integer('earned').notNull(),
    breakdown: jsonb('breakdown').$type<{ label: L10n; amount: number }[]>().notNull(),
    synthetic: boolean('synthetic').notNull().default(false),
  },
  (t) => [index('checkins_device_idx').on(t.deviceId, t.createdAt)],
);

/** Residents asking for a service (e.g. a brown bin) in their neighbourhood. */
export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deviceId: text('device_id'),
  districtId: text('district_id').references(() => districts.id),
  kind: text('kind').notNull().default('brown_bin'),
  synthetic: boolean('synthetic').notNull().default(false),
});

export const binReportKind = pgEnum('bin_report_kind', ['full', 'overflowing', 'damaged']);
export const binReportStatus = pgEnum('bin_report_status', ['open', 'acknowledged', 'resolved']);

/**
 * A resident reports a bin as full, overflowing or damaged. Shown to the municipality as an alert.
 * The photo is checked on the phone and never uploaded; only the bin, the kind and the time are sent.
 */
export const binReports = pgTable(
  'bin_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    pointId: text('point_id')
      .notNull()
      .references(() => collectionPoints.id),
    districtId: text('district_id').references(() => districts.id),
    kind: binReportKind('kind').notNull(),
    status: binReportStatus('status').notNull().default('open'),
    deviceId: text('device_id'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    synthetic: boolean('synthetic').notNull().default(false),
  },
  (t) => [index('bin_reports_status_idx').on(t.status, t.createdAt), index('bin_reports_point_idx').on(t.pointId)],
);

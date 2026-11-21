CREATE TYPE "public"."certainty" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."organic_service" AS ENUM('full', 'partial', 'none');--> statement-breakpoint
CREATE TYPE "public"."point_kind" AS ENUM('green_point', 'blue_bin', 'glass_bell', 'brown_bin', 'battery_point', 'weee_point', 'clothing_bin');--> statement-breakpoint
CREATE TYPE "public"."point_status" AS ENUM('available', 'full', 'closed');--> statement-breakpoint
CREATE TYPE "public"."waste_category" AS ENUM('packaging', 'organic', 'general', 'special', 'bulky');--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" text NOT NULL,
	"decision_id" uuid,
	"district_id" text,
	"earned" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_points" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "point_kind" NOT NULL,
	"name" jsonb NOT NULL,
	"street" jsonb,
	"district_id" text,
	"lng" double precision NOT NULL,
	"lat" double precision NOT NULL,
	"categories" "waste_category"[] NOT NULL,
	"accepts" text[] NOT NULL,
	"glass_bell" boolean DEFAULT false NOT NULL,
	"staffed" boolean DEFAULT false NOT NULL,
	"hours" jsonb,
	"status" "point_status" DEFAULT 'available' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"source" text DEFAULT 'mock' NOT NULL,
	"illustrative" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" text,
	"object_id" text NOT NULL,
	"decision_key" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"district_id" text,
	"category" "waste_category" NOT NULL,
	"confidence" real NOT NULL,
	"certainty" "certainty" NOT NULL,
	"uncertain" boolean DEFAULT false NOT NULL,
	"clarified" boolean DEFAULT false NOT NULL,
	"rules_applied" text[] DEFAULT '{}'::text[] NOT NULL,
	"via" text DEFAULT 'search' NOT NULL,
	"payload" jsonb,
	"synthetic" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" text PRIMARY KEY NOT NULL,
	"geo_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"community_id" text NOT NULL,
	"area_km2" real NOT NULL,
	"organic_service" "organic_service" NOT NULL,
	"lng" double precision NOT NULL,
	"lat" double precision NOT NULL,
	"svg_path" text NOT NULL,
	"svg_centroid" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"enabled" boolean NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"code" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" text NOT NULL,
	"title" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"applies_to" text[] NOT NULL,
	"source" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "rules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" text,
	"district_id" text,
	"kind" text DEFAULT 'brown_bin' NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_changes" ADD CONSTRAINT "rule_changes_code_rules_code_fk" FOREIGN KEY ("code") REFERENCES "public"."rules"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkins_device_idx" ON "checkins" USING btree ("device_id","created_at");--> statement-breakpoint
CREATE INDEX "points_district_idx" ON "collection_points" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "points_kind_idx" ON "collection_points" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "decisions_created_idx" ON "decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "decisions_district_idx" ON "decisions" USING btree ("district_id");
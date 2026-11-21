CREATE TYPE "public"."bin_report_kind" AS ENUM('full', 'overflowing', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."bin_report_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TABLE "bin_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"point_id" text NOT NULL,
	"district_id" text,
	"kind" "bin_report_kind" NOT NULL,
	"status" "bin_report_status" DEFAULT 'open' NOT NULL,
	"device_id" text,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"synthetic" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bin_reports" ADD CONSTRAINT "bin_reports_point_id_collection_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."collection_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bin_reports" ADD CONSTRAINT "bin_reports_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bin_reports_status_idx" ON "bin_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "bin_reports_point_idx" ON "bin_reports" USING btree ("point_id");
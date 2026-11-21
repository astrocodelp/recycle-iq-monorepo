ALTER TABLE "bin_reports" ADD COLUMN "city_request_id" text;--> statement-breakpoint
ALTER TABLE "bin_reports" ADD COLUMN "city_status" text;--> statement-breakpoint
ALTER TABLE "bin_reports" ADD COLUMN "city_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "city_request_id" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "city_status" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "city_synced_at" timestamp with time zone;
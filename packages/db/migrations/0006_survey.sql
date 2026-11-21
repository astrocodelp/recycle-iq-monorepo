CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text NOT NULL,
	"answers" jsonb NOT NULL,
	"email" text,
	"source" text
);
--> statement-breakpoint
CREATE INDEX "survey_responses_created_idx" ON "survey_responses" USING btree ("created_at");
CREATE TABLE "bin_styles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"color" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);

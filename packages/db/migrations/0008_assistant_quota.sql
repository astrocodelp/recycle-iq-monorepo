CREATE TABLE "assistant_quota" (
	"key" text NOT NULL,
	"window" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_quota_key_window_pk" PRIMARY KEY("key","window")
);

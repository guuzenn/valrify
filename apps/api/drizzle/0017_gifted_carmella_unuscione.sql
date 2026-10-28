CREATE TABLE "middleman_directory" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"profile_url" text NOT NULL,
	"contact_url" text NOT NULL,
	"fee_info" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_sponsored" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "middleman_directory_public_order_idx" ON "middleman_directory" USING btree ("is_published","sort_order","id");
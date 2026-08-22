CREATE TYPE "public"."community_post_report_status" AS ENUM('PENDING', 'DISMISSED', 'POST_REMOVED');--> statement-breakpoint
CREATE TABLE "community_post_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" "community_post_report_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"resolution" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "community_post_id" integer;--> statement-breakpoint
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_post_report_once_unique" ON "community_post_reports" USING btree ("post_id","reporter_id");--> statement-breakpoint
CREATE INDEX "community_post_reports_status_idx" ON "community_post_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "community_post_reports_post_idx" ON "community_post_reports" USING btree ("post_id");--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_community_post_id_community_posts_id_fk" FOREIGN KEY ("community_post_id") REFERENCES "public"."community_posts"("id") ON DELETE no action ON UPDATE no action;
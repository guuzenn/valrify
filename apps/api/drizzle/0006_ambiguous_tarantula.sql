CREATE TYPE "public"."community_comment_report_status" AS ENUM('PENDING', 'DISMISSED', 'COMMENT_REMOVED');--> statement-breakpoint
CREATE TYPE "public"."community_comment_status" AS ENUM('PUBLISHED', 'REMOVED');--> statement-breakpoint
CREATE TABLE "community_comment_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" "community_comment_report_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"resolution" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"status" "community_comment_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "community_comment_id" integer;--> statement-breakpoint
ALTER TABLE "community_comment_reports" ADD CONSTRAINT "community_comment_reports_comment_id_community_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."community_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment_reports" ADD CONSTRAINT "community_comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment_reports" ADD CONSTRAINT "community_comment_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_comment_report_once_unique" ON "community_comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE INDEX "community_comment_reports_status_idx" ON "community_comment_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "community_comment_reports_comment_idx" ON "community_comment_reports" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "community_comments_post_status_idx" ON "community_comments" USING btree ("post_id","status","created_at");--> statement-breakpoint
CREATE INDEX "community_comments_author_idx" ON "community_comments" USING btree ("author_id");--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_community_comment_id_community_comments_id_fk" FOREIGN KEY ("community_comment_id") REFERENCES "public"."community_comments"("id") ON DELETE no action ON UPDATE no action;
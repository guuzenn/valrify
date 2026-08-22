CREATE TYPE "public"."community_post_status" AS ENUM('PUBLISHED', 'REMOVED');--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"status" "community_post_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_posts_status_created_idx" ON "community_posts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "community_posts_author_idx" ON "community_posts" USING btree ("author_id");
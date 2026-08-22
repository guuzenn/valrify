CREATE TABLE "community_post_likes" (
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_post_like_once_unique" ON "community_post_likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "community_post_likes_user_idx" ON "community_post_likes" USING btree ("user_id");
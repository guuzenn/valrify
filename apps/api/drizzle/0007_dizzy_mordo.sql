CREATE TABLE "community_comment_likes" (
	"comment_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_comments" ADD COLUMN "reply_to_comment_id" integer;--> statement-breakpoint
ALTER TABLE "community_comment_likes" ADD CONSTRAINT "community_comment_likes_comment_id_community_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."community_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment_likes" ADD CONSTRAINT "community_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_comment_like_once_unique" ON "community_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "community_comment_likes_user_idx" ON "community_comment_likes" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_reply_to_comment_id_community_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."community_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_comments_reply_idx" ON "community_comments" USING btree ("reply_to_comment_id");
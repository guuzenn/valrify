CREATE TABLE "admin_login_challenges" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"setup_secret" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_mfa" (
	"user_id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"last_used_step" bigint NOT NULL,
	"recovery_hashes" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "mfa_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_login_challenges" ADD CONSTRAINT "admin_login_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_mfa" ADD CONSTRAINT "admin_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_login_challenges_user_idx" ON "admin_login_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_login_challenges_expiry_idx" ON "admin_login_challenges" USING btree ("expires_at");
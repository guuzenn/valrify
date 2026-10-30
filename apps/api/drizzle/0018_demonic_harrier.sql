ALTER TABLE "report_status_history" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "reporter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "guest_session_hash" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "guest_submission_hash" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "guest_tracking_hash" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "guest_contact_email" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "guest_fingerprint" text;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_guest_submission_unique" ON "reports" USING btree ("guest_submission_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_guest_tracking_unique" ON "reports" USING btree ("guest_tracking_hash");--> statement-breakpoint
CREATE INDEX "reports_guest_session_created_idx" ON "reports" USING btree ("guest_session_hash","created_at");
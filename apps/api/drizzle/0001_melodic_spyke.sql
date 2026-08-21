CREATE TABLE "transaction_confirmation_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"confirmation_id" integer NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
UPDATE "transaction_confirmations" SET "transaction_date" = "created_at" WHERE "transaction_date" IS NULL;--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ALTER COLUMN "transaction_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "transaction_confirmation_id" integer;--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ADD COLUMN "moderation_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_confirmation_evidence" ADD CONSTRAINT "transaction_confirmation_evidence_confirmation_id_transaction_confirmations_id_fk" FOREIGN KEY ("confirmation_id") REFERENCES "public"."transaction_confirmations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_transaction_confirmation_id_transaction_confirmations_id_fk" FOREIGN KEY ("transaction_confirmation_id") REFERENCES "public"."transaction_confirmations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ADD CONSTRAINT "transaction_confirmations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_confirmation_once_unique" ON "transaction_confirmations" USING btree ("user_id","entity_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transaction_confirmation_status_idx" ON "transaction_confirmations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transaction_confirmation_entity_idx" ON "transaction_confirmations" USING btree ("entity_id");

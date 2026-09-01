UPDATE "transaction_confirmations"
SET "status" = 'APPROVED', "updated_at" = now()
WHERE "status" = 'PENDING';
--> statement-breakpoint
ALTER TABLE "transaction_confirmations" ALTER COLUMN "status" SET DEFAULT 'APPROVED';

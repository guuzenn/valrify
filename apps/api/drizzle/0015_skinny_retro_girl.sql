CREATE TABLE "report_parties" (
	"report_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'REPORTED' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX "report_identifier_unique";--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "report_identifiers" ADD COLUMN "entity_id" integer;--> statement-breakpoint
ALTER TABLE "report_parties" ADD CONSTRAINT "report_parties_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_parties" ADD CONSTRAINT "report_parties_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_party_unique" ON "report_parties" USING btree ("report_id","entity_id");--> statement-breakpoint
CREATE INDEX "report_party_entity_idx" ON "report_parties" USING btree ("entity_id");--> statement-breakpoint
ALTER TABLE "report_identifiers" ADD CONSTRAINT "report_identifiers_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_identifier_unique" ON "report_identifiers" USING btree ("report_id","identifier_id","entity_id");
--> statement-breakpoint
INSERT INTO "report_parties" ("report_id", "entity_id", "display_name", "role", "position")
SELECT r.id, r.entity_id, e.display_name, 'REPORTED', 0 FROM "reports" r JOIN "entities" e ON e.id = r.entity_id;
--> statement-breakpoint
UPDATE "report_identifiers" ri SET "entity_id" = r.entity_id FROM "reports" r WHERE r.id = ri.report_id;

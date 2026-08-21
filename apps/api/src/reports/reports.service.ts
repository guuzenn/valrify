import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  maskIdentifier,
  normalizeIdentifier,
  type IdentifierType,
} from "@valrify/domain";
import type { ReportInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import {
  entities,
  entityIdentifiers,
  identifiers,
  reportEvidence,
  reportIdentifiers,
  reports,
  reportStatusHistory,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";

const strongIdentifierTypes = new Set<IdentifierType>([
  "PHONE",
  "BANK_ACCOUNT",
  "EWALLET",
  "DISCORD",
  "FACEBOOK_URL",
  "RIOT_ID",
]);

@Injectable()
export class ReportsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: EvidenceStorage,
  ) {}

  async create(
    reporterId: string,
    input: ReportInput,
    files: Express.Multer.File[],
  ) {
    return this.database.db.transaction(async (tx) => {
      const submittedValues = [
        ...input.identifiers,
        { type: "PERSON_NAME" as const, value: input.entityName, provider: undefined },
      ];
      const uniqueValues = submittedValues.filter((item, index, values) => {
        const normalized = normalizeIdentifier(item.type, item.value);
        return values.findIndex((candidate) =>
          candidate.type === item.type &&
          normalizeIdentifier(candidate.type, candidate.value) === normalized
        ) === index;
      });

      const identifierRows: Array<{
        id: number;
        type: IdentifierType;
        isSubmitted: boolean;
      }> = [];
      for (const [index, item] of uniqueValues.entries()) {
        const normalizedValue = normalizeIdentifier(item.type, item.value);
        let identifier = await tx.query.identifiers.findFirst({
          where: and(
            eq(identifiers.type, item.type),
            eq(identifiers.normalizedValue, normalizedValue),
          ),
        });
        if (!identifier) {
          [identifier] = await tx
            .insert(identifiers)
            .values({
              type: item.type,
              rawValue: item.value,
              normalizedValue,
              maskedValue: maskIdentifier(item.type, item.value, item.provider),
              provider: item.provider,
            })
            .returning();
        }
        if (!identifier) throw new Error("Gagal menyimpan data akun");
        identifierRows.push({
          id: identifier.id,
          type: item.type,
          isSubmitted: index < input.identifiers.length,
        });
      }

      const strongIds = identifierRows
        .filter((row) => row.isSubmitted && strongIdentifierTypes.has(row.type))
        .map((row) => row.id);
      const existingLinks = strongIds.length > 0
        ? await tx
            .select({ entityId: entityIdentifiers.entityId })
            .from(entityIdentifiers)
            .where(inArray(entityIdentifiers.identifierId, strongIds))
        : [];
      const matchedEntityIds = [...new Set(existingLinks.map((link) => link.entityId))];

      let entity = matchedEntityIds.length === 1
        ? await tx.query.entities.findFirst({ where: eq(entities.id, matchedEntityIds[0]!) })
        : undefined;
      if (!entity) {
        const slugBase = input.entityName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "profil";
        [entity] = await tx
          .insert(entities)
          .values({
            slug: `${slugBase}-${randomUUID().slice(0, 6)}`,
            displayName: input.entityName,
          })
          .returning();
      }
      if (!entity) throw new Error("Gagal membuat profil");

      const publicId = `VLR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const [report] = await tx
        .insert(reports)
        .values({
          publicId,
          reporterId,
          entityId: entity.id,
          title: input.title,
          chronology: input.chronology,
          transactionDate: input.transactionDate ? new Date(input.transactionDate) : null,
          allegedLoss: input.allegedLoss,
          transactionType: input.transactionType,
        })
        .returning();
      if (!report) throw new Error("Gagal membuat laporan");

      for (const identifier of identifierRows) {
        await tx
          .insert(reportIdentifiers)
          .values({ reportId: report.id, identifierId: identifier.id })
          .onConflictDoNothing();
      }

      for (const file of files) {
        const stored = await this.storage.put(file, report.id);
        await tx.insert(reportEvidence).values({
          reportId: report.id,
          storageKey: stored.key,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          size: stored.size,
        });
      }
      await tx.insert(reportStatusHistory).values({
        reportId: report.id,
        toStatus: "SUBMITTED",
        actorId: reporterId,
        note: "Laporan dikirim",
      });
      return {
        id: report.id,
        publicId,
        linkedToExistingProfile: matchedEntityIds.length === 1,
      };
    });
  }
}

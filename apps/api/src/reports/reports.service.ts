import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  maskIdentifier,
  normalizeIdentifier,
  type IdentifierType,
} from "@vlrfy/domain";
import type { ReportInput } from "@vlrfy/validation";
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
      const slugBase =
        input.entityName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "profil";
      const [entity] = await tx
        .insert(entities)
        .values({
          slug: `${slugBase}-${randomUUID().slice(0, 6)}`,
          displayName: input.entityName,
        })
        .returning();
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
          transactionDate: input.transactionDate
            ? new Date(input.transactionDate)
            : null,
          allegedLoss: input.allegedLoss,
          transactionType: input.transactionType,
        })
        .returning();
      if (!report) throw new Error("Gagal membuat laporan");

      const values: Array<{
        type: IdentifierType;
        value: string;
        provider?: string;
      }> = [
        {
          type: input.identifierType,
          value: input.identifierValue,
          provider: input.provider,
        },
        { type: "PERSON_NAME", value: input.entityName },
      ];

      for (const item of values) {
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
              maskedValue: maskIdentifier(
                item.type,
                item.value,
                item.provider,
              ),
              provider: item.provider,
            })
            .returning();
        }
        if (!identifier) throw new Error("Gagal menyimpan identifier");
        await tx
          .insert(entityIdentifiers)
          .values({
            entityId: entity.id,
            identifierId: identifier.id,
            isPrimary: item.type === input.identifierType,
          })
          .onConflictDoNothing();
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
      return { id: report.id, publicId };
    });
  }
}

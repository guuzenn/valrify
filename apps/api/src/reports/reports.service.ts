import { Injectable } from "@nestjs/common";
import { titleReportCategory } from "@valrify/domain";
import type { ReportInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import {
  reportEvidence,
  reportIdentifiers,
  reportParties,
  reports,
  reportStatusHistory,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";
import { validateEvidence } from "../storage/validate-evidence";
import { resolveReportParty } from "./resolve-report-party";

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
    validateEvidence(files);
    return this.database.db.transaction(async (tx) => {
      const { entity, identifierRows, linkedToExistingProfile } = await resolveReportParty(tx, input);

      const publicId = `VLR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const [report] = await tx
        .insert(reports)
        .values({
          publicId,
          reporterId,
          entityId: entity.id,
          title: titleReportCategory(input.category),
          chronology: input.chronology,
          evidenceUrl: input.evidenceUrl,
          transactionDate: input.transactionDate ? new Date(input.transactionDate) : null,
          allegedLoss: 0,
          transactionType: input.category,
        })
        .returning();
      if (!report) throw new Error("Gagal membuat laporan");

      await tx.insert(reportParties).values({ reportId: report.id, entityId: entity.id, displayName: input.entityName, role: "REPORTED", position: 0 });

      for (const identifier of identifierRows) {
        await tx
          .insert(reportIdentifiers)
          .values({ reportId: report.id, identifierId: identifier.id, entityId: entity.id })
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
        linkedToExistingProfile,
      };
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, eq, inArray } from "drizzle-orm";
import {
  canReviewConfirmation,
  type ConfirmationStatus,
  type ReportStatus,
} from "@vlrfy/domain";
import type {
  ConfirmationReviewInput,
  ReviewInput,
} from "@vlrfy/validation";
import { DatabaseService } from "../database/database.service";
import {
  entities,
  entityIdentifiers,
  identifiers,
  moderationActions,
  reportEvidence,
  reportIdentifiers,
  reports,
  reportStatusHistory,
  transactionConfirmationEvidence,
  transactionConfirmations,
  users,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";

@Injectable()
export class AdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: EvidenceStorage,
  ) {}

  async queue() {
    const rows = await this.database.db
      .select({
        id: reports.id,
        publicId: reports.publicId,
        title: reports.title,
        chronology: reports.chronology,
        transactionDate: reports.transactionDate,
        allegedLoss: reports.allegedLoss,
        status: reports.status,
        createdAt: reports.createdAt,
        entityName: entities.displayName,
        reporterName: users.displayName,
      })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.reporterId))
      .leftJoin(entities, eq(entities.id, reports.entityId))
      .where(
        inArray(reports.status, [
          "SUBMITTED",
          "UNDER_REVIEW",
          "NEEDS_INFO",
          "VERIFIED",
        ]),
      )
      .orderBy(asc(reports.createdAt));

    return Promise.all(
      rows.map(async (row) => {
        const ids = await this.database.db
          .select({
            type: identifiers.type,
            maskedValue: identifiers.maskedValue,
          })
          .from(reportIdentifiers)
          .innerJoin(
            identifiers,
            eq(identifiers.id, reportIdentifiers.identifierId),
          )
          .where(eq(reportIdentifiers.reportId, row.id));
        const evidence = await this.database.db
          .select({
            id: reportEvidence.id,
            fileName: reportEvidence.fileName,
            mimeType: reportEvidence.mimeType,
            size: reportEvidence.size,
            evidenceType: reportEvidence.evidenceType,
          })
          .from(reportEvidence)
          .where(eq(reportEvidence.reportId, row.id));
        return { ...row, identifiers: ids, evidence };
      }),
    );
  }

  async confirmationQueue() {
    const rows = await this.database.db
      .select({
        id: transactionConfirmations.id,
        transactionDate: transactionConfirmations.transactionDate,
        amount: transactionConfirmations.amount,
        note: transactionConfirmations.note,
        status: transactionConfirmations.status,
        createdAt: transactionConfirmations.createdAt,
        entityName: entities.displayName,
        entitySlug: entities.slug,
        submitterName: users.displayName,
      })
      .from(transactionConfirmations)
      .innerJoin(users, eq(users.id, transactionConfirmations.userId))
      .innerJoin(entities, eq(entities.id, transactionConfirmations.entityId))
      .where(eq(transactionConfirmations.status, "PENDING"))
      .orderBy(asc(transactionConfirmations.createdAt));

    return Promise.all(
      rows.map(async (row) => {
        const evidence = await this.database.db
          .select({
            id: transactionConfirmationEvidence.id,
            fileName: transactionConfirmationEvidence.fileName,
            mimeType: transactionConfirmationEvidence.mimeType,
            size: transactionConfirmationEvidence.size,
          })
          .from(transactionConfirmationEvidence)
          .where(eq(transactionConfirmationEvidence.confirmationId, row.id));
        return { ...row, evidence };
      }),
    );
  }

  async review(reportId: number, actorId: string, input: ReviewInput) {
    const report = await this.database.db.query.reports.findFirst({
      where: eq(reports.id, reportId),
    });
    if (!report) throw new NotFoundException("Laporan tidak ditemukan.");
    if (report.reporterId === actorId) {
      throw new BadRequestException(
        "Admin tidak dapat memeriksa laporan yang dikirim sendiri. Gunakan akun tester untuk mengirim.",
      );
    }
    if (!["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(report.status)) {
      throw new BadRequestException("Status laporan tidak dapat diubah.");
    }

    await this.database.db.transaction(async (tx) => {
      let from = report.status as ReportStatus;
      if (input.decision === "PUBLISH") {
        for (const next of [
          "UNDER_REVIEW",
          "VERIFIED",
          "PUBLISHED",
        ] as ReportStatus[]) {
          if (from === next) continue;
          await tx.insert(reportStatusHistory).values({
            reportId,
            fromStatus: from,
            toStatus: next,
            actorId,
            note: input.rationale,
          });
          from = next;
        }
        await tx
          .update(reports)
          .set({
            status: "PUBLISHED",
            publicSummary: input.summary,
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(reports.id, reportId));
        if (report.entityId) {
          const reportIdentifierRows = await tx
            .select({ identifierId: reportIdentifiers.identifierId })
            .from(reportIdentifiers)
            .where(eq(reportIdentifiers.reportId, reportId));
          for (const [index, row] of reportIdentifierRows.entries()) {
            await tx
              .insert(entityIdentifiers)
              .values({
                entityId: report.entityId,
                identifierId: row.identifierId,
                isPrimary: index === 0,
              })
              .onConflictDoNothing();
          }
        }
        await tx.insert(moderationActions).values({
          reportId,
          actorId,
          action: "REPORT_PUBLISHED",
          rationale: input.rationale,
        });
      } else {
        await tx
          .update(reports)
          .set({ status: "REJECTED", updatedAt: new Date() })
          .where(eq(reports.id, reportId));
        await tx.insert(reportStatusHistory).values({
          reportId,
          fromStatus: report.status,
          toStatus: "REJECTED",
          actorId,
          note: input.rationale,
        });
        await tx.insert(moderationActions).values({
          reportId,
          actorId,
          action: "REPORT_REJECTED",
          rationale: input.rationale,
        });
      }
    });
    return { ok: true };
  }

  async reviewConfirmation(
    confirmationId: number,
    actorId: string,
    input: ConfirmationReviewInput,
  ) {
    const confirmation =
      await this.database.db.query.transactionConfirmations.findFirst({
        where: eq(transactionConfirmations.id, confirmationId),
      });
    if (!confirmation) {
      throw new NotFoundException("Konfirmasi transaksi tidak ditemukan.");
    }
    if (confirmation.userId === actorId) {
      throw new BadRequestException(
        "Moderator tidak dapat meninjau konfirmasi miliknya sendiri.",
      );
    }
    const next: ConfirmationStatus =
      input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    if (
      !canReviewConfirmation(
        confirmation.status as ConfirmationStatus,
        next,
      )
    ) {
      throw new BadRequestException("Konfirmasi ini sudah selesai ditinjau.");
    }

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(transactionConfirmations)
        .set({
          status: next,
          moderationNote: input.rationale,
          reviewedBy: actorId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transactionConfirmations.id, confirmationId));
      await tx.insert(moderationActions).values({
        transactionConfirmationId: confirmationId,
        actorId,
        action:
          next === "APPROVED"
            ? "TRANSACTION_CONFIRMATION_APPROVED"
            : "TRANSACTION_CONFIRMATION_REJECTED",
        rationale: input.rationale,
      });
    });
    return { ok: true, status: next };
  }

  async evidence(id: number) {
    const meta = await this.database.db.query.reportEvidence.findFirst({
      where: eq(reportEvidence.id, id),
    });
    if (!meta) throw new NotFoundException("Bukti tidak ditemukan.");
    return { meta, bytes: await this.storage.get(meta.storageKey) };
  }

  async confirmationEvidence(id: number) {
    const meta =
      await this.database.db.query.transactionConfirmationEvidence.findFirst({
        where: eq(transactionConfirmationEvidence.id, id),
      });
    if (!meta) throw new NotFoundException("Bukti tidak ditemukan.");
    return { meta, bytes: await this.storage.get(meta.storageKey) };
  }
}

import { ConflictException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { titleReportCategory } from "@valrify/domain";
import type { ReportInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import {
  reportEvidence,
  reportIdentifiers,
  reportParties,
  reports,
  reportStatusHistory,
  moderationActions,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";
import { validateEvidence } from "../storage/validate-evidence";
import { resolveReportParty } from "./resolve-report-party";
import { hashGuestSecret, type GuestSubmission } from "./guest-report.security";

@Injectable()
export class ReportsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: EvidenceStorage,
  ) {}

  async checkGuestQuota(guest: GuestSubmission, db: Pick<typeof this.database.db, "select"> = this.database.db) {
    const [duplicate] = await db.select({ id: reports.id }).from(reports).where(eq(reports.guestSubmissionHash, guest.submissionHash)).limit(1);
    if (duplicate) return;
    const rows = await db.select({ createdAt: reports.createdAt }).from(reports).where(and(
      eq(reports.guestSessionHash, guest.sessionHash), gte(reports.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    )).orderBy(desc(reports.createdAt)).limit(2);
    if (rows.length >= 2) throw new HttpException("Maksimal dua laporan tanpa akun dalam 24 jam. Coba lagi nanti atau masuk ke akun.", 429);
    if (rows[0] && rows[0].createdAt.getTime() > Date.now() - 60_000) throw new HttpException("Tunggu satu menit sebelum mengirim laporan berikutnya.", 429);
  }

  async guestStatus(token: string) {
    const [report] = await this.database.db.select({ id: reports.id, publicId: reports.publicId, status: reports.status, createdAt: reports.createdAt }).from(reports).where(eq(reports.guestTrackingHash, hashGuestSecret(token))).limit(1);
    if (!report) throw new NotFoundException("Tautan pelacakan tidak ditemukan atau sudah dihubungkan ke akun.");
    const [history] = ["NEEDS_INFO", "REJECTED", "WITHDRAWN"].includes(report.status)
      ? await this.database.db.select({ note: reportStatusHistory.note }).from(reportStatusHistory).where(eq(reportStatusHistory.reportId, report.id)).orderBy(desc(reportStatusHistory.createdAt), desc(reportStatusHistory.id)).limit(1)
      : [];
    return { publicId: report.publicId, status: report.status, createdAt: report.createdAt, moderatorNote: history?.note ?? null };
  }

  async claimGuest(token: string, actorId: string) {
    return this.database.db.transaction(async tx => {
      const [report] = await tx.update(reports).set({ reporterId: actorId, guestTrackingHash: null, updatedAt: new Date() }).where(and(eq(reports.guestTrackingHash, hashGuestSecret(token)), isNull(reports.reporterId))).returning({ id: reports.id, publicId: reports.publicId });
      if (!report) throw new NotFoundException("Tautan pelacakan tidak ditemukan atau sudah dihubungkan ke akun.");
      await tx.insert(moderationActions).values({ reportId: report.id, actorId, action: "GUEST_REPORT_CLAIMED", rationale: "Pemegang tautan pelacakan menghubungkan laporan ke akun terverifikasi." });
      return { publicId: report.publicId };
    });
  }

  async create(
    reporterId: string | null,
    input: ReportInput,
    files: Express.Multer.File[],
    guest?: GuestSubmission & { contactEmail: string | null },
  ) {
    validateEvidence(files);
    return this.database.db.transaction(async (tx) => {
      const fingerprint = guest ? hashGuestSecret(JSON.stringify({ input, contactEmail: guest.contactEmail, files: files.map(file => ({ hash: hashGuestSecret(file.buffer), mimeType: file.mimetype, name: file.originalname })) })) : null;
      if (guest) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${guest.sessionHash}))`);
        const [duplicate] = await tx.select().from(reports).where(eq(reports.guestSubmissionHash, guest.submissionHash)).limit(1);
        if (duplicate) {
          if (duplicate.guestFingerprint !== fingerprint) throw new ConflictException("Kiriman sebelumnya sudah diterima. Gunakan tautan pelacakan atau muat ulang untuk laporan baru.");
          if (duplicate.guestTrackingHash && duplicate.guestTrackingHash !== hashGuestSecret(guest.trackingToken)) throw new ConflictException("Kiriman sebelumnya sudah diterima. Gunakan tautan pelacakan yang disimpan saat itu.");
          return { id: duplicate.id, publicId: duplicate.publicId, linkedToExistingProfile: false, trackingToken: duplicate.guestTrackingHash ? guest.trackingToken : undefined };
        }
        await this.checkGuestQuota(guest, tx);
      }
      const { entity, identifierRows, linkedToExistingProfile } = await resolveReportParty(tx, input);

      const publicId = `VLR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const [report] = await tx
        .insert(reports)
        .values({
          publicId,
          reporterId,
          guestSessionHash: guest?.sessionHash,
          guestSubmissionHash: guest?.submissionHash,
          guestTrackingHash: guest ? hashGuestSecret(guest.trackingToken) : undefined,
          guestContactEmail: guest?.contactEmail,
          guestFingerprint: fingerprint,
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
        ...(guest ? { trackingToken: guest.trackingToken } : {}),
      };
    });
  }
}

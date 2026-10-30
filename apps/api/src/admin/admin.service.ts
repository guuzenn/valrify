import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { canReviewReport, normalizeIdentifier, titleReportCategory, type ReportStatus } from "@valrify/domain";
import type {
  CommunityPostReviewInput,
  ReviewInput,
  ReportEditInput,
} from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import { publicImageTypes } from "../storage/validate-evidence";
import {
  communityCommentReports,
  communityComments,
  communityPostReports,
  communityPosts,
  entities,
  entityIdentifiers,
  identifiers,
  moderationActions,
  notifications,
  reportEvidence,
  reportIdentifiers,
  reportParties,
  reports,
  reportStatusHistory,
  transactionConfirmationEvidence,
  users,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";
import { resolveReportParty } from "../reports/resolve-report-party";

@Injectable()
export class AdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: EvidenceStorage,
  ) {}

  async overview() {
    const pendingStatuses = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "NEEDS_INFO",
      "VERIFIED",
    ] as const;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [reportCounts, communityCounts, communityCommentCounts, activityCount, recentActions] =
      await Promise.all([
        this.database.db
          .select({
            total: sql<number>`count(*)::int`,
            pending: sql<number>`count(*) filter (where ${inArray(reports.status, pendingStatuses)})::int`,
            published: sql<number>`count(*) filter (where ${eq(reports.status, "PUBLISHED")})::int`,
            rejected: sql<number>`count(*) filter (where ${eq(reports.status, "REJECTED")})::int`,
          })
          .from(reports),
        this.database.db
          .select({ pendingPosts: sql<number>`count(distinct ${communityPostReports.postId})::int` })
          .from(communityPostReports)
          .where(eq(communityPostReports.status, "PENDING")),
        this.database.db
          .select({ pendingComments: sql<number>`count(distinct ${communityCommentReports.commentId})::int` })
          .from(communityCommentReports)
          .where(eq(communityCommentReports.status, "PENDING")),
        this.database.db
          .select({ count: sql<number>`count(*)::int` })
          .from(moderationActions)
          .where(and(gte(moderationActions.createdAt, since), ne(moderationActions.action, "REPORT_EDITED"))),
        this.database.db
          .select({
            id: moderationActions.id,
            action: moderationActions.action,
            rationale: moderationActions.rationale,
            createdAt: moderationActions.createdAt,
            actorName: users.displayName,
            reportPublicId: reports.publicId,
            reportTitle: reports.title,
            confirmationId: moderationActions.transactionConfirmationId,
            communityPostId: moderationActions.communityPostId,
            communityCommentId: moderationActions.communityCommentId,
          })
          .from(moderationActions)
          .innerJoin(users, eq(users.id, moderationActions.actorId))
          .leftJoin(reports, eq(reports.id, moderationActions.reportId))
          .where(sql`${moderationActions.action} not in ('USER_ROLE_CHANGED', 'DIRECTORY_CREATED', 'DIRECTORY_UPDATED')`)
          .orderBy(desc(moderationActions.createdAt))
          .limit(8),
      ]);

    return {
      reports: reportCounts[0] ?? { total: 0, pending: 0, published: 0, rejected: 0 },
      community: { pendingPosts: communityCounts[0]?.pendingPosts ?? 0, pendingComments: communityCommentCounts[0]?.pendingComments ?? 0 },
      reviewedLast24Hours: activityCount[0]?.count ?? 0,
      recentActions,
    };
  }

  async queue(status: "PENDING" | "PUBLISHED" = "PENDING", reporterId?: string) {
    const rows = await this.database.db
      .select({
        id: reports.id,
        publicId: reports.publicId,
        title: reports.title,
        chronology: reports.chronology,
        publicSummary: reports.publicSummary,
        transactionType: reports.transactionType,
        transactionDate: reports.transactionDate,
        evidenceUrl: reports.evidenceUrl,
        status: reports.status,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        entityId: reports.entityId,
        entityName: entities.displayName,
        reporterName: sql<string>`coalesce(${users.displayName}, 'Tamu')`,guestContactEmail: reports.guestContactEmail,
      })
      .from(reports)
      .leftJoin(users, eq(users.id, reports.reporterId))
      .leftJoin(entities, eq(entities.id, reports.entityId))
      .where(and(
        reporterId ? eq(reports.reporterId, reporterId) : undefined,
        status === "PUBLISHED" ? eq(reports.status, "PUBLISHED") : inArray(reports.status, [
          "SUBMITTED",
          "UNDER_REVIEW",
          "NEEDS_INFO",
          "VERIFIED",
        ]),
      ))
      .orderBy(asc(reports.createdAt));

    return Promise.all(
      rows.map(async (row) => {
        const ids = await this.database.db
          .select({
            entityId: reportIdentifiers.entityId,
            type: identifiers.type,
            rawValue: identifiers.rawValue,
            provider: identifiers.provider,
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
            caption: reportEvidence.caption,
            isPublicApproved: reportEvidence.isPublicApproved,
          })
          .from(reportEvidence)
          .where(eq(reportEvidence.reportId, row.id));
        const storedParties = await this.database.db.select().from(reportParties).where(eq(reportParties.reportId, row.id)).orderBy(asc(reportParties.position));
        const parties = (storedParties.length ? storedParties : row.entityId ? [{ entityId: row.entityId, displayName: row.entityName!, role: "REPORTED" }] : []).map(party => {
          const all = ids.filter(id => (id.entityId ?? row.entityId) === party.entityId);
          const explicit = all.filter(id => id.type !== "PERSON_NAME" || normalizeIdentifier("PERSON_NAME", id.rawValue) !== normalizeIdentifier("PERSON_NAME", party.displayName));
          return { entityId: party.entityId, entityName: party.displayName, role: party.role, identifiers: (explicit.length ? explicit : all).map(id => ({ type: id.type, value: id.rawValue, provider: id.provider ?? "" })) };
        });
        return {
          ...row,
          entityName: parties[0]?.entityName ?? row.entityName,
          parties,
          identifiers: ids.map((identifier) => ({
            type: identifier.type,
            displayValue:
              identifier.type === "BANK_ACCOUNT" && identifier.provider
                ? `${identifier.provider.toUpperCase()} · ${identifier.rawValue}`
                : identifier.rawValue,
          })),
          evidence,
        };
      }),
    );
  }

  async communityPostQueue() {
    const rows = await this.database.db
      .select({
        reportId: communityPostReports.id,
        postId: communityPosts.id,
        postBody: communityPosts.body,
        postCreatedAt: communityPosts.createdAt,
        authorId: communityPosts.authorId,
        reporterId: communityPostReports.reporterId,
        reason: communityPostReports.reason,
        detail: communityPostReports.detail,
        reportedAt: communityPostReports.createdAt,
      })
      .from(communityPostReports)
      .innerJoin(communityPosts, eq(communityPosts.id, communityPostReports.postId))
      .where(and(eq(communityPostReports.status, "PENDING"), eq(communityPosts.status, "PUBLISHED")))
      .orderBy(asc(communityPostReports.createdAt));
    const userIds = [...new Set(rows.flatMap((row) => [row.authorId, row.reporterId]))];
    const userRows = userIds.length > 0
      ? await this.database.db.select({ id: users.id, displayName: users.displayName, username: users.username, role: users.role }).from(users).where(inArray(users.id, userIds))
      : [];
    const userById = new Map(userRows.map((user) => [user.id, user]));
    const grouped = new Map<number, {
      postId: number;
      body: string;
      postCreatedAt: Date;
      author: { id: string; displayName: string; username: string | null; role: string };
      reports: Array<{ id: number; reason: string; detail: string; createdAt: Date; reporterName: string }>;
    }>();
    for (const row of rows) {
      const author = userById.get(row.authorId);
      if (!author) continue;
      const item = grouped.get(row.postId) ?? { postId: row.postId, body: row.postBody, postCreatedAt: row.postCreatedAt, author, reports: [] };
      item.reports.push({ id: row.reportId, reason: row.reason, detail: row.detail, createdAt: row.reportedAt, reporterName: userById.get(row.reporterId)?.displayName ?? "User tidak ditemukan" });
      grouped.set(row.postId, item);
    }
    return [...grouped.values()].map((item) => ({ ...item, reportCount: item.reports.length, firstReportedAt: item.reports[0]?.createdAt ?? item.postCreatedAt }));
  }

  async reviewCommunityPost(postId: number, actorId: string, input: CommunityPostReviewInput) {
    const post = await this.database.db.query.communityPosts.findFirst({ where: eq(communityPosts.id, postId) });
    if (!post) throw new NotFoundException("Post tidak ditemukan.");
    if (post.authorId === actorId) throw new BadRequestException("Moderator tidak dapat meninjau post miliknya sendiri.");
    const pending = await this.database.db.select({ id: communityPostReports.id, reporterId: communityPostReports.reporterId }).from(communityPostReports).where(and(eq(communityPostReports.postId, postId), eq(communityPostReports.status, "PENDING")));
    if (pending.length === 0) throw new BadRequestException("Laporan untuk post ini sudah selesai ditinjau.");
    if (pending.some((report) => report.reporterId === actorId)) throw new BadRequestException("Moderator tidak dapat meninjau laporan community yang dikirim sendiri.");
    const nextStatus = input.decision === "REMOVE" ? "POST_REMOVED" as const : "DISMISSED" as const;
    await this.database.db.transaction(async (tx) => {
      if (input.decision === "REMOVE") {
        await tx.update(communityPosts).set({ status: "REMOVED", updatedAt: new Date() }).where(eq(communityPosts.id, postId));
        await tx.delete(notifications).where(eq(notifications.postId, postId));
      }
      await tx.update(communityPostReports).set({ status: nextStatus, reviewedBy: actorId, reviewedAt: new Date(), resolution: input.rationale }).where(and(eq(communityPostReports.postId, postId), eq(communityPostReports.status, "PENDING")));
      await tx.insert(moderationActions).values({ communityPostId: postId, actorId, action: input.decision === "REMOVE" ? "COMMUNITY_POST_REMOVED" : "COMMUNITY_REPORTS_DISMISSED", rationale: input.rationale });
    });
    return { ok: true, status: nextStatus };
  }

  async communityCommentQueue() {
    const rows = await this.database.db
      .select({ reportId: communityCommentReports.id, commentId: communityComments.id, commentBody: communityComments.body, commentCreatedAt: communityComments.createdAt, postId: communityPosts.id, postBody: communityPosts.body, authorId: communityComments.authorId, reporterId: communityCommentReports.reporterId, reason: communityCommentReports.reason, detail: communityCommentReports.detail, reportedAt: communityCommentReports.createdAt })
      .from(communityCommentReports)
      .innerJoin(communityComments, eq(communityComments.id, communityCommentReports.commentId))
      .innerJoin(communityPosts, eq(communityPosts.id, communityComments.postId))
      .where(and(eq(communityCommentReports.status, "PENDING"), eq(communityComments.status, "PUBLISHED"), eq(communityPosts.status, "PUBLISHED")))
      .orderBy(asc(communityCommentReports.createdAt));
    const userIds = [...new Set(rows.flatMap((row) => [row.authorId, row.reporterId]))];
    const userRows = userIds.length > 0 ? await this.database.db.select({ id: users.id, displayName: users.displayName, username: users.username, role: users.role }).from(users).where(inArray(users.id, userIds)) : [];
    const userById = new Map(userRows.map((user) => [user.id, user]));
    const grouped = new Map<number, { commentId: number; body: string; commentCreatedAt: Date; postId: number; postBody: string; author: { id: string; displayName: string; username: string | null; role: string }; reports: Array<{ id: number; reason: string; detail: string; createdAt: Date; reporterName: string }> }>();
    for (const row of rows) {
      const author = userById.get(row.authorId);
      if (!author) continue;
      const item = grouped.get(row.commentId) ?? { commentId: row.commentId, body: row.commentBody, commentCreatedAt: row.commentCreatedAt, postId: row.postId, postBody: row.postBody, author, reports: [] };
      item.reports.push({ id: row.reportId, reason: row.reason, detail: row.detail, createdAt: row.reportedAt, reporterName: userById.get(row.reporterId)?.displayName ?? "User tidak ditemukan" });
      grouped.set(row.commentId, item);
    }
    return [...grouped.values()].map((item) => ({ ...item, reportCount: item.reports.length, firstReportedAt: item.reports[0]?.createdAt ?? item.commentCreatedAt }));
  }

  async reviewCommunityComment(commentId: number, actorId: string, input: CommunityPostReviewInput) {
    const comment = await this.database.db.query.communityComments.findFirst({ where: eq(communityComments.id, commentId) });
    if (!comment) throw new NotFoundException("Komentar tidak ditemukan.");
    if (comment.authorId === actorId) throw new BadRequestException("Moderator tidak dapat meninjau komentar miliknya sendiri.");
    const pending = await this.database.db.select({ id: communityCommentReports.id, reporterId: communityCommentReports.reporterId }).from(communityCommentReports).where(and(eq(communityCommentReports.commentId, commentId), eq(communityCommentReports.status, "PENDING")));
    if (pending.length === 0) throw new BadRequestException("Laporan komentar ini sudah selesai ditinjau.");
    if (pending.some((report) => report.reporterId === actorId)) throw new BadRequestException("Moderator tidak dapat meninjau laporan community yang dikirim sendiri.");
    const nextStatus = input.decision === "REMOVE" ? "COMMENT_REMOVED" as const : "DISMISSED" as const;
    await this.database.db.transaction(async (tx) => {
      if (input.decision === "REMOVE") {
        await tx.update(communityComments).set({ status: "REMOVED", updatedAt: new Date() }).where(eq(communityComments.id, commentId));
        await tx.delete(notifications).where(eq(notifications.commentId, commentId));
      }
      await tx.update(communityCommentReports).set({ status: nextStatus, reviewedBy: actorId, reviewedAt: new Date(), resolution: input.rationale }).where(and(eq(communityCommentReports.commentId, commentId), eq(communityCommentReports.status, "PENDING")));
      await tx.insert(moderationActions).values({ communityCommentId: commentId, actorId, action: input.decision === "REMOVE" ? "COMMUNITY_COMMENT_REMOVED" : "COMMUNITY_COMMENT_REPORTS_DISMISSED", rationale: input.rationale });
    });
    return { ok: true, status: nextStatus };
  }

  async editReport(reportId: number, actorId: string, input: ReportEditInput) {
    return this.database.db.transaction(async tx => {
      const [report] = await tx.select().from(reports).where(eq(reports.id, reportId)).for("update");
      if (!report) throw new NotFoundException("Laporan tidak ditemukan.");
      const actor = await tx.query.users.findFirst({ where: eq(users.id, actorId), columns: { role: true } });
      if (!actor || !canReviewReport(actor.role, report.reporterId === actorId)) throw new ForbiddenException("Akses koreksi ditolak. Rekber terverifikasi hanya boleh mengoreksi kirimannya sendiri; moderator hanya boleh mengoreksi kiriman pengguna lain.");
      if (report.status === "PUBLISHED" && actor.role !== "ADMIN" && actor.role !== "MODERATOR") throw new ForbiddenException("Koreksi laporan publik hanya dapat dilakukan admin atau moderator.");
      if (!["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "VERIFIED", "PUBLISHED"].includes(report.status)) throw new BadRequestException("Status laporan ini tidak dapat diedit.");
      if (report.updatedAt.getTime() !== new Date(input.updatedAt).getTime()) throw new ConflictException("Laporan sudah berubah. Muat ulang sebelum menyimpan.");
      if (report.status === "PUBLISHED" && !input.evidenceUrl) {
        const approved = await tx.select({ id: reportEvidence.id }).from(reportEvidence).where(and(eq(reportEvidence.reportId, reportId), eq(reportEvidence.isPublicApproved, true))).limit(1);
        if (!approved.length) throw new BadRequestException("Laporan publik harus tetap memiliki gambar bukti publik atau link posting bukti.");
      }
      const previousParties = await tx.select().from(reportParties).where(eq(reportParties.reportId, reportId));
      const previousIdentifiers = await tx.select().from(reportIdentifiers).where(eq(reportIdentifiers.reportId, reportId));
      const allowedEntityIds = new Set([report.entityId, ...previousParties.map(party => party.entityId)]);
      const resolved: Array<Awaited<ReturnType<typeof resolveReportParty>> & { party: ReportEditInput["parties"][number]; position: number }> = [];
      for (const [position, party] of input.parties.entries()) {
        if (party.entityId && !allowedEntityIds.has(party.entityId)) throw new BadRequestException("Profil asal tidak termasuk dalam laporan ini.");
        const result = await resolveReportParty(tx, party, party.entityId);
        if (result.matchedEntityIds.length > 1) throw new BadRequestException("Data satu pihak cocok dengan beberapa profil. Periksa kembali pembagian nomor dan akun.");
        if (resolved.some(item => item.entity.id === result.entity.id)) throw new BadRequestException("Dua pihak cocok dengan profil yang sama. Periksa kembali nomor dan akun masing-masing.");
        resolved.push({ ...result, party, position });
      }
      await tx.delete(reportIdentifiers).where(eq(reportIdentifiers.reportId, reportId));
      await tx.delete(reportParties).where(eq(reportParties.reportId, reportId));
      for (const item of resolved) {
        await tx.insert(reportParties).values({ reportId, entityId: item.entity.id, displayName: item.party.entityName, role: item.party.role, position: item.position });
        for (const identifier of item.identifierRows) await tx.insert(reportIdentifiers).values({ reportId, identifierId: identifier.id, entityId: item.entity.id }).onConflictDoNothing();
      }
      const updatedAt = new Date(Math.max(Date.now(), report.updatedAt.getTime() + 1));
      await tx.update(reports).set({ ...(input.publicSummary !== undefined ? { publicSummary: input.publicSummary } : {}), entityId: resolved[0]!.entity.id, chronology: input.chronology, title: titleReportCategory(input.category), transactionType: input.category, transactionDate: input.transactionDate ? new Date(input.transactionDate) : null, evidenceUrl: input.evidenceUrl || null, updatedAt }).where(eq(reports.id, reportId));
      await tx.insert(moderationActions).values({ reportId, actorId, action: "REPORT_EDITED", rationale: input.rationale, details: { before: { report, parties: previousParties, identifiers: previousIdentifiers }, after: input } });
      return { ok: true, updatedAt };
    });
  }

  async review(reportId: number, actorId: string, input: ReviewInput) {
    const report = await this.database.db.query.reports.findFirst({
      where: eq(reports.id, reportId),
    });
    if (!report) throw new NotFoundException("Laporan tidak ditemukan.");
    if (input.updatedAt && new Date(input.updatedAt).getTime() !== report.updatedAt.getTime()) throw new ConflictException("Laporan sudah diubah. Muat ulang sebelum memeriksa kembali.");
    const actor = await this.database.db.query.users.findFirst({ where: eq(users.id, actorId), columns: { role: true } });
    if (!actor || !canReviewReport(actor.role, report.reporterId === actorId)) throw new ForbiddenException("Akses pemeriksaan ditolak. Rekber terverifikasi hanya boleh memeriksa kirimannya sendiri; moderator tidak boleh memeriksa laporan yang dikirim sendiri.");
    if (input.decision === "NEEDS_INFO" && actor.role === "VERIFIED_MIDDLEMAN") throw new ForbiddenException("Hanya admin atau moderator yang dapat meminta informasi tambahan.");
    if (input.decision === "WITHDRAW" ? report.status !== "PUBLISHED" : !["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "VERIFIED"].includes(report.status)) {
      throw new BadRequestException("Status laporan tidak dapat diubah.");
    }

    const publicEvidenceIds = [...new Set(input.publicEvidenceIds)];
    if (input.decision === "PUBLISH") {
      const evidenceRows = await this.database.db
        .select({ id: reportEvidence.id, mimeType: reportEvidence.mimeType })
        .from(reportEvidence)
        .where(eq(reportEvidence.reportId, reportId));
      const selectedRows = evidenceRows.filter((row) =>
        publicEvidenceIds.includes(row.id),
      );
      if (
        selectedRows.length !== publicEvidenceIds.length ||
        selectedRows.some((row) => !publicImageTypes.includes(row.mimeType))
      ) {
        throw new BadRequestException(
          "Bukti publik harus berupa gambar dari laporan yang sedang ditinjau.",
        );
      }
      if (!report.evidenceUrl && publicEvidenceIds.length === 0) {
        throw new BadRequestException(
          "Pilih minimal satu gambar publik atau pastikan laporan memiliki link posting bukti.",
        );
      }
    }

    await this.database.db.transaction(async (tx) => {
      let from = report.status as ReportStatus;
      const [lockedReport] = await tx.select().from(reports).where(eq(reports.id, reportId)).for("update");
      if (!lockedReport || lockedReport.status !== report.status || lockedReport.updatedAt.getTime() !== report.updatedAt.getTime()) throw new ConflictException("Laporan sudah berubah. Muat ulang sebelum memeriksa kembali.");
      if (input.decision === "WITHDRAW") {
        await tx.update(reports).set({ status: "WITHDRAWN", updatedAt: new Date() }).where(eq(reports.id, reportId));
        await tx.update(reportEvidence).set({ isPublicApproved: false }).where(eq(reportEvidence.reportId, reportId));
        await tx.insert(reportStatusHistory).values({ reportId, fromStatus: "PUBLISHED", toStatus: "WITHDRAWN", actorId, note: input.rationale });
        await tx.insert(moderationActions).values({ reportId, actorId, action: "REPORT_WITHDRAWN", rationale: input.rationale });
      } else if (input.decision === "NEEDS_INFO") {
        await tx.update(reports).set({ status: "NEEDS_INFO", updatedAt: new Date() }).where(eq(reports.id, reportId));
        await tx.insert(reportStatusHistory).values({ reportId, fromStatus: report.status, toStatus: "NEEDS_INFO", actorId, note: input.rationale });
        await tx.insert(moderationActions).values({ reportId, actorId, action: "REPORT_NEEDS_INFO", rationale: input.rationale });
      } else if (input.decision === "PUBLISH") {
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
        await tx
          .update(reportEvidence)
          .set({ isPublicApproved: false })
          .where(eq(reportEvidence.reportId, reportId));
        if (publicEvidenceIds.length > 0) {
          await tx
            .update(reportEvidence)
            .set({ isPublicApproved: true })
            .where(
              and(
                eq(reportEvidence.reportId, reportId),
                inArray(reportEvidence.id, publicEvidenceIds),
              ),
            );
        }
        if (report.entityId) {
          const reportIdentifierRows = await tx
            .select({ identifierId: reportIdentifiers.identifierId, entityId: reportIdentifiers.entityId })
            .from(reportIdentifiers)
            .where(eq(reportIdentifiers.reportId, reportId));
          for (const [index, row] of reportIdentifierRows.entries()) {
            await tx
              .insert(entityIdentifiers)
              .values({
                entityId: row.entityId ?? report.entityId,
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

  async assertReportOwner(reportId: number, actorId: string) {
    const report = await this.database.db.query.reports.findFirst({ where: and(eq(reports.id, reportId), eq(reports.reporterId, actorId)), columns: { id: true } });
    if (!report) throw new NotFoundException("Laporan tidak ditemukan.");
  }

  async evidence(id: number, reporterId?: string) {
    const meta = await this.database.db.query.reportEvidence.findFirst({
      where: eq(reportEvidence.id, id),
    });
    if (!meta) throw new NotFoundException("Bukti tidak ditemukan.");
    if (reporterId) await this.assertReportOwner(meta.reportId, reporterId);
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

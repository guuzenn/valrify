import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { type ReportStatus } from "@valrify/domain";
import type {
  CommunityPostReviewInput,
  ReviewInput,
} from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
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
  reports,
  reportStatusHistory,
  transactionConfirmationEvidence,
  users,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";

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
          .where(gte(moderationActions.createdAt, since)),
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

  async queue() {
    const rows = await this.database.db
      .select({
        id: reports.id,
        publicId: reports.publicId,
        title: reports.title,
        chronology: reports.chronology,
        transactionType: reports.transactionType,
        transactionDate: reports.transactionDate,
        evidenceUrl: reports.evidenceUrl,
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
        return {
          ...row,
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
        selectedRows.some((row) => !row.mimeType.startsWith("image/"))
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

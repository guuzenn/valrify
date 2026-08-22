import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { PublicProfileInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import {
  entities,
  communityComments,
  communityPosts,
  reportEvidence,
  reports,
  reportStatusHistory,
  transactionConfirmationEvidence,
  transactionConfirmations,
  users,
} from "../database/schema";

const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function usernameCooldownEndsAt(changedAt: Date | null) {
  if (!changedAt) return null;
  const endsAt = new Date(changedAt.getTime() + USERNAME_COOLDOWN_MS);
  return endsAt > new Date() ? endsAt : null;
}

@Injectable()
export class AccountService {
  constructor(private readonly database: DatabaseService) {}

  async overview(userId: string) {
    const user = await this.database.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException("Akun tidak ditemukan.");

    const [reportRows, confirmationRows, postCountRows, commentCountRows] = await Promise.all([
      this.database.db
        .select({
          id: reports.id,
          publicId: reports.publicId,
          title: reports.title,
          status: reports.status,
          publicSummary: reports.publicSummary,
          allegedLoss: reports.allegedLoss,
          transactionDate: reports.transactionDate,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
          publishedAt: reports.publishedAt,
          entityName: entities.displayName,
          entitySlug: entities.slug,
          evidenceCount: sql<number>`(select count(*)::int from ${reportEvidence} where ${reportEvidence.reportId} = ${reports.id})`,
        })
        .from(reports)
        .leftJoin(entities, eq(entities.id, reports.entityId))
        .where(eq(reports.reporterId, userId))
        .orderBy(desc(reports.createdAt)),
      this.database.db
        .select({
          id: transactionConfirmations.id,
          status: transactionConfirmations.status,
          transactionDate: transactionConfirmations.transactionDate,
          amount: transactionConfirmations.amount,
          note: transactionConfirmations.note,
          moderationNote: transactionConfirmations.moderationNote,
          createdAt: transactionConfirmations.createdAt,
          reviewedAt: transactionConfirmations.reviewedAt,
          entityName: entities.displayName,
          entitySlug: entities.slug,
          evidenceCount: sql<number>`(select count(*)::int from ${transactionConfirmationEvidence} where ${transactionConfirmationEvidence.confirmationId} = ${transactionConfirmations.id})`,
        })
        .from(transactionConfirmations)
        .innerJoin(entities, eq(entities.id, transactionConfirmations.entityId))
        .where(eq(transactionConfirmations.userId, userId))
        .orderBy(desc(transactionConfirmations.createdAt)),
      this.database.db
        .select({ value: sql<number>`count(*)::int` })
        .from(communityPosts)
        .where(and(eq(communityPosts.authorId, userId), eq(communityPosts.status, "PUBLISHED"))),
      this.database.db
        .select({ value: sql<number>`count(*)::int` })
        .from(communityComments)
        .where(and(eq(communityComments.authorId, userId), eq(communityComments.status, "PUBLISHED"))),
    ]);

    const ownReports = await Promise.all(reportRows.map(async (report) => {
      const latestHistory = await this.database.db
        .select({ note: reportStatusHistory.note, createdAt: reportStatusHistory.createdAt })
        .from(reportStatusHistory)
        .where(eq(reportStatusHistory.reportId, report.id))
        .orderBy(desc(reportStatusHistory.createdAt))
        .limit(1);
      const showModeratorNote = report.status === "REJECTED" || report.status === "NEEDS_INFO";
      return {
        ...report,
        moderatorNote: showModeratorNote ? latestHistory[0]?.note || null : null,
      };
    }));

    return {
      user: {
        displayName: user.displayName,
        email: user.email,
        username: user.username,
        bio: user.bio,
        usernameCanChangeAt: usernameCooldownEndsAt(user.usernameChangedAt),
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
        joinedAt: user.createdAt,
      },
      stats: {
        reports: ownReports.length,
        reportsPending: ownReports.filter((item) => ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "VERIFIED"].includes(item.status)).length,
        reportsPublished: ownReports.filter((item) => item.status === "PUBLISHED").length,
        confirmations: confirmationRows.length,
        confirmationsApproved: confirmationRows.filter((item) => item.status === "APPROVED").length,
        posts: postCountRows[0]?.value ?? 0,
        comments: commentCountRows[0]?.value ?? 0,
      },
      reports: ownReports,
      confirmations: confirmationRows,
    };
  }

  async updateProfile(userId: string, input: PublicProfileInput) {
    const current = await this.database.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!current) throw new NotFoundException("Akun tidak ditemukan.");
    const usernameChanged = current.username !== input.username;
    if (usernameChanged) {
      const cooldownEndsAt = usernameCooldownEndsAt(current.usernameChangedAt);
      if (cooldownEndsAt) {
        const availableDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(cooldownEndsAt);
        throw new BadRequestException(`Username baru dapat diganti lagi pada ${availableDate}.`);
      }
      const existing = await this.database.db.query.users.findFirst({
        where: and(eq(users.username, input.username), ne(users.id, userId)),
      });
      if (existing) throw new BadRequestException("Username sudah digunakan.");
    }
    let updated: { username: string | null; bio: string; usernameChangedAt: Date | null } | undefined;
    try {
      [updated] = await this.database.db
        .update(users)
        .set({ username: input.username, bio: input.bio, ...(usernameChanged ? { usernameChangedAt: new Date() } : {}) })
        .where(eq(users.id, userId))
        .returning({ username: users.username, bio: users.bio, usernameChangedAt: users.usernameChangedAt });
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string } };
      if (databaseError.code === "23505" || databaseError.cause?.code === "23505") {
        throw new BadRequestException("Username sudah digunakan.");
      }
      throw error;
    }
    if (!updated) throw new NotFoundException("Akun tidak ditemukan.");
    return { username: updated.username ?? input.username, bio: updated.bio, usernameCanChangeAt: usernameCooldownEndsAt(updated.usernameChangedAt) };
  }
}

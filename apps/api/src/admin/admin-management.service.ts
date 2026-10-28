import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Role } from "@valrify/domain";
import type { AdminRoleInput, MiddlemanDirectoryInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import { adminLoginChallenges, adminMfa, authSessions, middlemanDirectory, moderationActions, reports, users } from "../database/schema";
import { isPrivileged } from "../auth/admin-mfa.crypto";

@Injectable()
export class AdminManagementService {
  constructor(private readonly database: DatabaseService) {}

  async dashboard() {
    const [userCounts, directoryCounts] = await Promise.all([
      this.database.db.select({ total: count(), verified: sql<number>`count(*) filter (where ${users.emailVerifiedAt} is not null)::int`, middlemen: sql<number>`count(*) filter (where ${users.role} = 'VERIFIED_MIDDLEMAN')::int` }).from(users),
      this.database.db.select({ total: count(), published: sql<number>`count(*) filter (where ${middlemanDirectory.isPublished})::int` }).from(middlemanDirectory),
    ]);
    return { users: userCounts[0]!, directory: directoryCounts[0]! };
  }

  async userList(input: { q: string; role?: Role; page: number }) {
    const search = input.q.replace(/[\\%_]/g, "\\$&");
    const where = and(input.role ? eq(users.role, input.role) : undefined, search ? or(ilike(users.displayName, `%${search}%`), ilike(users.email, `%${search}%`), ilike(users.username, `%${search}%`)) : undefined);
    const [rows, totals] = await Promise.all([
      this.database.db.select({ id: users.id, displayName: users.displayName, email: users.email, username: users.username, role: users.role, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt, mfaEnabled: sql<boolean>`exists(select 1 from ${adminMfa} where ${adminMfa.userId} = ${users.id})` }).from(users).where(where).orderBy(desc(users.createdAt), asc(users.id)).limit(25).offset((input.page - 1) * 25),
      this.database.db.select({ total: count() }).from(users).where(where),
    ]);
    return { rows, total: totals[0]!.total, page: input.page, pageSize: 25 };
  }

  async userDetail(id: string) {
    const user = await this.database.db.query.users.findFirst({ where: eq(users.id, id), columns: { id: true, displayName: true, email: true, username: true, role: true, emailVerifiedAt: true, createdAt: true } });
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan.");
    const contributions = await this.database.db.select({ publicId: reports.publicId, title: reports.title, status: reports.status, createdAt: reports.createdAt }).from(reports).where(eq(reports.reporterId, id)).orderBy(desc(reports.createdAt)).limit(20);
    const [totals] = await this.database.db.select({ total: count() }).from(reports).where(eq(reports.reporterId, id));
    return { user, reports: contributions, reportCount: totals!.total };
  }

  async changeRole(id: string, actorId: string, input: AdminRoleInput) {
    return this.database.db.transaction(async tx => {
      // Serialize role changes so concurrent demotions cannot remove every admin.
      await tx.execute(sql`select pg_advisory_xact_lock(8302917)`);
      const actor = await tx.query.users.findFirst({ where: eq(users.id, actorId) });
      if (actor?.role !== "ADMIN") throw new ForbiddenException("Hanya admin yang boleh mengubah role.");
      const target = await tx.query.users.findFirst({ where: eq(users.id, id) });
      if (!target) throw new NotFoundException("Pengguna tidak ditemukan.");
      if (target.role !== input.expectedRole) throw new ConflictException("Role pengguna sudah berubah. Muat ulang sebelum melanjutkan.");
      if (target.role === input.role) throw new BadRequestException("Pilih role yang berbeda.");
      if (target.role === "ADMIN" && input.role !== "ADMIN") {
        const [remaining] = await tx.select({ total: count() }).from(users).where(eq(users.role, "ADMIN"));
        if (remaining!.total <= 1) throw new BadRequestException("Role admin terakhir tidak dapat dicabut.");
      }
      if (id === actorId) throw new BadRequestException("Role akun yang sedang kamu gunakan tidak dapat diubah sendiri.");
      if (input.role !== "USER" && !target.emailVerifiedAt) throw new BadRequestException("Pengguna harus memverifikasi email sebelum mendapat role ini.");
      if (isPrivileged(input.role) && !target.passwordHash) throw new BadRequestException("Pengguna harus memasang password terlebih dahulu melalui reset password sebelum mendapat akses admin/moderator.");
      await tx.update(users).set({ role: input.role }).where(eq(users.id, id));
      await tx.delete(authSessions).where(eq(authSessions.userId, id));
      await tx.delete(adminLoginChallenges).where(eq(adminLoginChallenges.userId, id));
      await tx.insert(moderationActions).values({ actorId, action: "USER_ROLE_CHANGED", rationale: input.rationale, details: { targetUserId: id, targetName: target.displayName, before: target.role, after: input.role } });
      return { ok: true };
    });
  }

  directory() {
    return this.database.db.select().from(middlemanDirectory).orderBy(asc(middlemanDirectory.sortOrder), asc(middlemanDirectory.id));
  }

  async saveDirectory(actorId: string, input: MiddlemanDirectoryInput, id?: number, updatedAt?: string) {
    return this.database.db.transaction(async tx => {
      const actor = await tx.query.users.findFirst({ where: eq(users.id, actorId), columns: { role: true } });
      if (actor?.role !== "ADMIN") throw new ForbiddenException("Hanya admin yang boleh mengelola direktori rekber.");
      const { rationale, ...values } = input;
      const [before] = id ? await tx.select().from(middlemanDirectory).where(eq(middlemanDirectory.id, id)).for("update") : [];
      if (id && !before) throw new NotFoundException("Rekber tidak ditemukan.");
      if (before && before.updatedAt.getTime() !== new Date(updatedAt ?? "").getTime()) throw new ConflictException("Data rekber sudah berubah. Muat ulang sebelum menyimpan.");
      const [saved] = before
        ? await tx.update(middlemanDirectory).set({ ...values, updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) }).where(eq(middlemanDirectory.id, id!)).returning()
        : await tx.insert(middlemanDirectory).values(values).returning();
      await tx.insert(moderationActions).values({ actorId, action: before ? "DIRECTORY_UPDATED" : "DIRECTORY_CREATED", rationale, details: { directoryId: saved!.id, targetName: saved!.displayName, before: before ?? null, after: saved } });
      return saved!;
    });
  }

  async activity(page: number) {
    const [rows, totals] = await Promise.all([
      this.database.db.select({ id: moderationActions.id, action: moderationActions.action, rationale: moderationActions.rationale, details: moderationActions.details, createdAt: moderationActions.createdAt, actorName: users.displayName, reportPublicId: reports.publicId, communityPostId: moderationActions.communityPostId, communityCommentId: moderationActions.communityCommentId }).from(moderationActions).innerJoin(users, eq(users.id, moderationActions.actorId)).leftJoin(reports, eq(reports.id, moderationActions.reportId)).orderBy(desc(moderationActions.createdAt), desc(moderationActions.id)).limit(25).offset((page - 1) * 25),
      this.database.db.select({ total: count() }).from(moderationActions),
    ]);
    return { rows, total: totals[0]!.total, page, pageSize: 25 };
  }
}

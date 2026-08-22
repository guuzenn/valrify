import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import type { CommunityCommentInput, CommunityPostInput, CommunityPostReportInput } from "@valrify/validation";
import type { AuthActor } from "../auth/auth.types";
import { DatabaseService } from "../database/database.service";
import { communityCommentLikes, communityCommentReports, communityComments, communityPostLikes, communityPostReports, communityPosts, notifications, users } from "../database/schema";

@Injectable()
export class CommunityService {
  constructor(private readonly database: DatabaseService) {}

  async create(actor: AuthActor, input: CommunityPostInput) {
    const author = await this.database.db.query.users.findFirst({ where: eq(users.id, actor.id) });
    if (!author?.username) throw new BadRequestException("Buat username publik di Akun Saya sebelum menulis post.");
    const [latestPost] = await this.database.db
      .select({ createdAt: communityPosts.createdAt })
      .from(communityPosts)
      .where(eq(communityPosts.authorId, actor.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(1);
    const elapsedSinceLatestPost = latestPost ? Date.now() - latestPost.createdAt.getTime() : null;
    if (elapsedSinceLatestPost !== null && elapsedSinceLatestPost >= 0 && elapsedSinceLatestPost < 60_000) {
      throw new BadRequestException("Tunggu satu menit sebelum membuat post lagi.");
    }
    const [post] = await this.database.db.insert(communityPosts).values({ authorId: actor.id, body: input.body }).returning();
    if (!post) throw new BadRequestException("Post belum bisa diterbitkan.");
    return {
      id: post.id,
      body: post.body,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      authorId: author.id,
      authorDisplayName: author.displayName,
      authorUsername: author.username,
      authorRole: author.role,
      commentCount: 0,
      likeCount: 0,
      topReply: null,
    };
  }

  async postLikeState(actor: AuthActor) {
    const rows = await this.database.db.select({ postId: communityPostLikes.postId }).from(communityPostLikes).innerJoin(communityPosts, eq(communityPosts.id, communityPostLikes.postId)).where(and(eq(communityPostLikes.userId, actor.id), eq(communityPosts.status, "PUBLISHED")));
    return { likedPostIds: rows.map((row) => row.postId) };
  }

  async togglePostLike(actor: AuthActor, postId: number) {
    const post = await this.database.db.query.communityPosts.findFirst({ where: and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED")) });
    if (!post) throw new NotFoundException("Post tidak ditemukan.");
    return this.database.db.transaction(async (tx) => {
      const [existing] = await tx.select({ postId: communityPostLikes.postId }).from(communityPostLikes).where(and(eq(communityPostLikes.postId, postId), eq(communityPostLikes.userId, actor.id))).limit(1);
      const liked = !existing;
      const eventKey = `post-like:${postId}:${actor.id}`;
      if (existing) {
        await tx.delete(communityPostLikes).where(and(eq(communityPostLikes.postId, postId), eq(communityPostLikes.userId, actor.id)));
        await tx.delete(notifications).where(eq(notifications.eventKey, eventKey));
      } else {
        await tx.insert(communityPostLikes).values({ postId, userId: actor.id });
        if (post.authorId !== actor.id) await tx.insert(notifications).values({ recipientId: post.authorId, actorId: actor.id, type: "POST_LIKED", eventKey, postId }).onConflictDoNothing();
      }
      const [count] = await tx.select({ value: sql<number>`count(*)::int` }).from(communityPostLikes).where(eq(communityPostLikes.postId, postId));
      return { liked, likeCount: count?.value ?? 0 };
    });
  }

  async remove(actor: AuthActor, postId: number) {
    const post = await this.database.db.query.communityPosts.findFirst({
      where: and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED")),
    });
    if (!post) throw new NotFoundException("Post tidak ditemukan.");
    if (post.authorId !== actor.id) throw new ForbiddenException("Kamu tidak dapat menghapus post ini.");
    await this.database.db.transaction(async (tx) => {
      await tx.update(communityPosts).set({ status: "REMOVED", updatedAt: new Date() }).where(eq(communityPosts.id, postId));
      await tx.update(communityPostReports).set({ status: "POST_REMOVED", reviewedAt: new Date(), resolution: "Post dihapus oleh penulis." }).where(and(eq(communityPostReports.postId, postId), eq(communityPostReports.status, "PENDING")));
      await tx.delete(notifications).where(eq(notifications.postId, postId));
    });
    return { ok: true };
  }

  async report(actor: AuthActor, postId: number, input: CommunityPostReportInput) {
    const post = await this.database.db.query.communityPosts.findFirst({
      where: and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED")),
    });
    if (!post) throw new NotFoundException("Post tidak ditemukan.");
    if (post.authorId === actor.id) throw new BadRequestException("Kamu tidak perlu melaporkan post milik sendiri. Kamu bisa langsung menghapusnya.");
    const existing = await this.database.db.query.communityPostReports.findFirst({
      where: and(eq(communityPostReports.postId, postId), eq(communityPostReports.reporterId, actor.id)),
    });
    if (existing) throw new BadRequestException("Kamu sudah melaporkan post ini.");
    try {
      await this.database.db.insert(communityPostReports).values({ postId, reporterId: actor.id, reason: input.reason, detail: input.detail });
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string } };
      if (databaseError.code === "23505" || databaseError.cause?.code === "23505") throw new BadRequestException("Kamu sudah melaporkan post ini.");
      throw error;
    }
    return { ok: true, message: "Laporan post sudah masuk ke antrean moderator." };
  }

  async comment(actor: AuthActor, postId: number, input: CommunityCommentInput) {
    const [post, author] = await Promise.all([
      this.database.db.query.communityPosts.findFirst({ where: and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED")) }),
      this.database.db.query.users.findFirst({ where: eq(users.id, actor.id) }),
    ]);
    if (!post) throw new NotFoundException("Post tidak ditemukan.");
    if (!author?.username) throw new BadRequestException("Buat username publik di Akun Saya sebelum menulis komentar.");
    let replyTarget: typeof communityComments.$inferSelect | undefined;
    if (input.replyToCommentId) {
      replyTarget = await this.database.db.query.communityComments.findFirst({ where: and(eq(communityComments.id, input.replyToCommentId), eq(communityComments.postId, postId), eq(communityComments.status, "PUBLISHED")) });
      if (!replyTarget) throw new BadRequestException("Komentar yang ingin dibalas sudah tidak tersedia.");
    }
    const [latest] = await this.database.db.select({ createdAt: communityComments.createdAt }).from(communityComments).where(eq(communityComments.authorId, actor.id)).orderBy(desc(communityComments.createdAt)).limit(1);
    const elapsed = latest ? Date.now() - latest.createdAt.getTime() : null;
    if (elapsed !== null && elapsed >= 0 && elapsed < 30_000) throw new BadRequestException("Tunggu 30 detik sebelum menulis komentar lagi.");
    const [comment] = await this.database.db.insert(communityComments).values({ postId, authorId: actor.id, body: input.body, replyToCommentId: replyTarget?.id ?? null }).returning();
    if (!comment) throw new BadRequestException("Komentar belum bisa diterbitkan.");
    const notificationRecipient = replyTarget?.authorId ?? post.authorId;
    if (notificationRecipient !== actor.id) await this.database.db.insert(notifications).values({ recipientId: notificationRecipient, actorId: actor.id, type: replyTarget ? "COMMENT_REPLIED" : "POST_REPLIED", eventKey: `reply:${comment.id}`, postId, commentId: comment.id }).onConflictDoNothing();
    return { id: comment.id, postId: comment.postId, replyToCommentId: comment.replyToCommentId, body: comment.body, createdAt: comment.createdAt, updatedAt: comment.updatedAt, authorId: author.id, authorDisplayName: author.displayName, authorUsername: author.username, authorRole: author.role, likeCount: 0 };
  }

  async commentState(actor: AuthActor, postId: number) {
    const post = await this.database.db.query.communityPosts.findFirst({ where: and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED")) });
    if (!post) throw new NotFoundException("Post tidak ditemukan.");
    const rows = await this.database.db.select({ commentId: communityCommentLikes.commentId }).from(communityCommentLikes).innerJoin(communityComments, eq(communityComments.id, communityCommentLikes.commentId)).where(and(eq(communityCommentLikes.userId, actor.id), eq(communityComments.postId, postId), eq(communityComments.status, "PUBLISHED")));
    return { likedCommentIds: rows.map((row) => row.commentId) };
  }

  async toggleCommentLike(actor: AuthActor, commentId: number) {
    const [comment] = await this.database.db.select({ id: communityComments.id, authorId: communityComments.authorId, postId: communityComments.postId }).from(communityComments).innerJoin(communityPosts, eq(communityPosts.id, communityComments.postId)).where(and(eq(communityComments.id, commentId), eq(communityComments.status, "PUBLISHED"), eq(communityPosts.status, "PUBLISHED"))).limit(1);
    if (!comment) throw new NotFoundException("Komentar tidak ditemukan.");
    return this.database.db.transaction(async (tx) => {
      const [existing] = await tx.select({ commentId: communityCommentLikes.commentId }).from(communityCommentLikes).where(and(eq(communityCommentLikes.commentId, commentId), eq(communityCommentLikes.userId, actor.id))).limit(1);
      const liked = !existing;
      const eventKey = `comment-like:${commentId}:${actor.id}`;
      if (existing) {
        await tx.delete(communityCommentLikes).where(and(eq(communityCommentLikes.commentId, commentId), eq(communityCommentLikes.userId, actor.id)));
        await tx.delete(notifications).where(eq(notifications.eventKey, eventKey));
      } else {
        await tx.insert(communityCommentLikes).values({ commentId, userId: actor.id });
        if (comment.authorId !== actor.id) await tx.insert(notifications).values({ recipientId: comment.authorId, actorId: actor.id, type: "COMMENT_LIKED", eventKey, postId: comment.postId, commentId }).onConflictDoNothing();
      }
      const [count] = await tx.select({ value: sql<number>`count(*)::int` }).from(communityCommentLikes).where(eq(communityCommentLikes.commentId, commentId));
      return { liked, likeCount: count?.value ?? 0 };
    });
  }

  async removeComment(actor: AuthActor, commentId: number) {
    const comment = await this.database.db.query.communityComments.findFirst({ where: and(eq(communityComments.id, commentId), eq(communityComments.status, "PUBLISHED")) });
    if (!comment) throw new NotFoundException("Komentar tidak ditemukan.");
    if (comment.authorId !== actor.id) throw new ForbiddenException("Kamu tidak dapat menghapus komentar ini.");
    await this.database.db.transaction(async (tx) => {
      await tx.update(communityComments).set({ status: "REMOVED", updatedAt: new Date() }).where(eq(communityComments.id, commentId));
      await tx.update(communityCommentReports).set({ status: "COMMENT_REMOVED", reviewedAt: new Date(), resolution: "Komentar dihapus oleh penulis." }).where(and(eq(communityCommentReports.commentId, commentId), eq(communityCommentReports.status, "PENDING")));
      await tx.delete(notifications).where(eq(notifications.commentId, commentId));
    });
    return { ok: true };
  }

  async reportComment(actor: AuthActor, commentId: number, input: CommunityPostReportInput) {
    const comment = await this.database.db.query.communityComments.findFirst({ where: and(eq(communityComments.id, commentId), eq(communityComments.status, "PUBLISHED")) });
    if (!comment) throw new NotFoundException("Komentar tidak ditemukan.");
    if (comment.authorId === actor.id) throw new BadRequestException("Kamu bisa langsung menghapus komentar milik sendiri.");
    const existing = await this.database.db.query.communityCommentReports.findFirst({ where: and(eq(communityCommentReports.commentId, commentId), eq(communityCommentReports.reporterId, actor.id)) });
    if (existing) throw new BadRequestException("Kamu sudah melaporkan komentar ini.");
    try {
      await this.database.db.insert(communityCommentReports).values({ commentId, reporterId: actor.id, reason: input.reason, detail: input.detail });
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string } };
      if (databaseError.code === "23505" || databaseError.cause?.code === "23505") throw new BadRequestException("Kamu sudah melaporkan komentar ini.");
      throw error;
    }
    return { ok: true, message: "Laporan komentar sudah masuk ke antrean moderator." };
  }
}

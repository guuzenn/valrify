import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { communityPosts, notifications, users } from "../database/schema";

const notificationCopy: Record<string, string> = {
  POST_LIKED: "menyukai post kamu.",
  COMMENT_LIKED: "menyukai komentar kamu.",
  POST_REPLIED: "membalas post kamu.",
  COMMENT_REPLIED: "membalas komentar kamu.",
};

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async inbox(recipientId: string) {
    const rows = await this.database.db.select().from(notifications).where(eq(notifications.recipientId, recipientId)).orderBy(desc(notifications.createdAt)).limit(50);
    const actorIds = [...new Set(rows.map((row) => row.actorId))];
    const postIds = [...new Set(rows.flatMap((row) => row.postId ? [row.postId] : []))];
    const [actors, posts] = await Promise.all([
      actorIds.length ? this.database.db.select({ id: users.id, displayName: users.displayName, username: users.username, role: users.role }).from(users).where(inArray(users.id, actorIds)) : [],
      postIds.length ? this.database.db.select({ id: communityPosts.id, status: communityPosts.status }).from(communityPosts).where(inArray(communityPosts.id, postIds)) : [],
    ]);
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const postStatus = new Map(posts.map((post) => [post.id, post.status]));
    return {
      unreadCount: rows.filter((row) => !row.readAt).length,
      items: rows.map((row) => {
        const actor = actorById.get(row.actorId);
        const postAvailable = row.postId ? postStatus.get(row.postId) === "PUBLISHED" : false;
        return {
          id: row.id,
          type: row.type,
          message: notificationCopy[row.type] ?? "berinteraksi dengan aktivitas kamu.",
          actor: actor ? { displayName: actor.displayName, username: actor.username, role: actor.role } : { displayName: "Anggota Valrify", username: null, role: "USER" },
          postId: row.postId,
          commentId: row.commentId,
          href: postAvailable ? `/community/post/${row.postId}${row.commentId ? `#community-comment-${row.commentId}` : ""}` : "/community",
          readAt: row.readAt,
          createdAt: row.createdAt,
        };
      }),
    };
  }

  async unreadCount(recipientId: string) {
    const [row] = await this.database.db.select({ value: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt)));
    return { unreadCount: row?.value ?? 0 };
  }

  async read(recipientId: string, id: number) {
    const [updated] = await this.database.db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.recipientId, recipientId))).returning({ id: notifications.id });
    if (!updated) throw new NotFoundException("Notifikasi tidak ditemukan.");
    return { ok: true };
  }

  async readAll(recipientId: string) {
    await this.database.db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt)));
    return { ok: true };
  }
}

import { Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import {
  publicIdentifierValue,
  publicUploaderAttribution,
  searchVariants,
  type IdentifierType,
  type Role,
} from "@valrify/domain";
import { DatabaseService } from "../database/database.service";
import {
  entities,
  communityCommentLikes,
  communityComments,
  communityPostLikes,
  communityPosts,
  entityIdentifiers,
  identifiers,
  reportEvidence,
  reportIdentifiers,
  reports,
  transactionConfirmations,
  users,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";

const partialSearchTypes = [
  "PERSON_NAME",
  "BANK_ACCOUNT_NAME",
  "EWALLET_ACCOUNT_NAME",
  "FACEBOOK_NAME",
  "DISCORD",
  "RIOT_ID",
  "RIOT_NICKNAME",
  "OTHER",
] as const;
const aliasTypes = new Set(["PERSON_NAME", "BANK_ACCOUNT_NAME", "EWALLET_ACCOUNT_NAME", "FACEBOOK_NAME"]);

@Injectable()
export class PublicService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: EvidenceStorage,
  ) {}

  async communityUser(username: string) {
    const member = await this.database.db.query.users.findFirst({
      where: eq(users.username, username.trim().toLocaleLowerCase("id-ID")),
    });
    if (!member?.username) return null;
    const isTrustedRole = ["ADMIN", "MODERATOR", "VERIFIED_MIDDLEMAN"].includes(member.role);
    const [reportRows, confirmationRows, postRows] = await Promise.all([
      isTrustedRole
        ? this.database.db
            .select({
              publicId: reports.publicId,
              title: reports.title,
              publicSummary: reports.publicSummary,
              allegedLoss: reports.allegedLoss,
              publishedAt: reports.publishedAt,
              entityName: entities.displayName,
              entitySlug: entities.slug,
            })
            .from(reports)
            .innerJoin(entities, eq(entities.id, reports.entityId))
            .where(and(eq(reports.reporterId, member.id), eq(reports.status, "PUBLISHED")))
            .orderBy(desc(reports.publishedAt))
        : Promise.resolve([]),
      this.database.db
        .select({
          id: transactionConfirmations.id,
          transactionDate: transactionConfirmations.transactionDate,
          amount: transactionConfirmations.amount,
          note: transactionConfirmations.note,
          entityName: entities.displayName,
          entitySlug: entities.slug,
        })
        .from(transactionConfirmations)
        .innerJoin(entities, eq(entities.id, transactionConfirmations.entityId))
        .where(and(eq(transactionConfirmations.userId, member.id), eq(transactionConfirmations.status, "APPROVED")))
        .orderBy(desc(transactionConfirmations.transactionDate)),
      this.database.db
        .select({ id: communityPosts.id, body: communityPosts.body, createdAt: communityPosts.createdAt, updatedAt: communityPosts.updatedAt })
        .from(communityPosts)
        .where(and(eq(communityPosts.authorId, member.id), eq(communityPosts.status, "PUBLISHED")))
        .orderBy(desc(communityPosts.createdAt)),
    ]);
    const roleLabel = member.role === "ADMIN" ? "Admin" : member.role === "MODERATOR" ? "Moderator" : member.role === "VERIFIED_MIDDLEMAN" ? "Verified Middleman" : "Anggota Komunitas";
    return {
      displayName: member.displayName,
      username: member.username,
      bio: member.bio,
      role: member.role,
      roleLabel,
      joinedAt: member.createdAt,
      stats: {
        posts: postRows.length,
        reports: reportRows.length,
        testimonials: confirmationRows.length,
      },
      reports: reportRows,
      testimonials: confirmationRows,
      posts: postRows,
    };
  }

  async communityPosts(sort: "latest" | "popular" = "latest") {
    const engagementScore = sql<number>`case when ${communityPosts.createdAt} >= now() - interval '30 days' then (
      (select count(*)::int * 2 from ${communityPostLikes} where ${communityPostLikes.postId} = ${communityPosts.id}) +
      (select count(*)::int * 3 from ${communityComments} where ${communityComments.postId} = ${communityPosts.id} and ${communityComments.status} = 'PUBLISHED')
    ) else 0 end`;
    const postRows = await this.database.db
      .select({
        id: communityPosts.id,
        body: communityPosts.body,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorUsername: users.username,
        authorRole: users.role,
        commentCount: sql<number>`(select count(*)::int from ${communityComments} where ${communityComments.postId} = ${communityPosts.id} and ${communityComments.status} = 'PUBLISHED')`,
        likeCount: sql<number>`(select count(*)::int from ${communityPostLikes} where ${communityPostLikes.postId} = ${communityPosts.id})`,
      })
      .from(communityPosts)
      .innerJoin(users, eq(users.id, communityPosts.authorId))
      .where(and(eq(communityPosts.status, "PUBLISHED"), isNotNull(users.username)))
      .orderBy(...(sort === "popular" ? [desc(engagementScore), desc(communityPosts.createdAt)] : [desc(communityPosts.createdAt)]))
      .limit(50);
    if (!postRows.length) return [];
    const topReplyRows = await this.database.db
      .selectDistinctOn([communityComments.postId], {
        postId: communityComments.postId,
        id: communityComments.id,
        body: communityComments.body,
        createdAt: communityComments.createdAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorUsername: users.username,
        likeCount: count(communityCommentLikes.userId),
      })
      .from(communityComments)
      .innerJoin(users, eq(users.id, communityComments.authorId))
      .leftJoin(communityCommentLikes, eq(communityCommentLikes.commentId, communityComments.id))
      .where(and(inArray(communityComments.postId, postRows.map((post) => post.id)), eq(communityComments.status, "PUBLISHED"), isNotNull(users.username)))
      .groupBy(communityComments.postId, communityComments.id, users.id, users.displayName, users.username)
      .orderBy(communityComments.postId, desc(count(communityCommentLikes.userId)), desc(communityComments.createdAt));
    const topReplyByPost = new Map(topReplyRows.map((reply) => [reply.postId, { ...reply, authorUsername: reply.authorUsername ?? "" }]));
    return postRows.map((post) => ({ ...post, topReply: topReplyByPost.get(post.id) ?? null }));
  }

  async communitySearch(query: string) {
    const normalized = query.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ").slice(0, 80);
    if (normalized.length < 2) return { query: normalized, posts: [], members: [] };
    const pattern = `%${normalized.replace(/[\\%_]/g, "\\$&")}%`;
    const [postRows, memberRows] = await Promise.all([
      this.database.db
        .select({
          id: communityPosts.id,
          body: communityPosts.body,
          createdAt: communityPosts.createdAt,
          authorDisplayName: users.displayName,
          authorUsername: users.username,
          authorRole: users.role,
          commentCount: sql<number>`(select count(*)::int from ${communityComments} where ${communityComments.postId} = ${communityPosts.id} and ${communityComments.status} = 'PUBLISHED')`,
          likeCount: sql<number>`(select count(*)::int from ${communityPostLikes} where ${communityPostLikes.postId} = ${communityPosts.id})`,
        })
        .from(communityPosts)
        .innerJoin(users, eq(users.id, communityPosts.authorId))
        .where(and(eq(communityPosts.status, "PUBLISHED"), isNotNull(users.username), ilike(communityPosts.body, pattern)))
        .orderBy(desc(communityPosts.createdAt))
        .limit(30),
      this.database.db
        .select({
          displayName: users.displayName,
          username: users.username,
          bio: users.bio,
          role: users.role,
          postCount: count(communityPosts.id),
        })
        .from(users)
        .leftJoin(communityPosts, and(eq(communityPosts.authorId, users.id), eq(communityPosts.status, "PUBLISHED")))
        .where(and(isNotNull(users.username), or(ilike(users.username, pattern), ilike(users.displayName, pattern))))
        .groupBy(users.id)
        .orderBy(sql`case when lower(${users.username}) = ${normalized} then 0 else 1 end`, desc(users.createdAt))
        .limit(20),
    ]);
    return {
      query: normalized,
      posts: postRows.map((post) => ({ ...post, authorUsername: post.authorUsername ?? "" })),
      members: memberRows.map((member) => ({ ...member, username: member.username ?? "" })),
    };
  }

  async communityPost(postId: number) {
    const [post] = await this.database.db
      .select({
        id: communityPosts.id,
        body: communityPosts.body,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorUsername: users.username,
        authorRole: users.role,
        commentCount: sql<number>`(select count(*)::int from ${communityComments} where ${communityComments.postId} = ${communityPosts.id} and ${communityComments.status} = 'PUBLISHED')`,
        likeCount: sql<number>`(select count(*)::int from ${communityPostLikes} where ${communityPostLikes.postId} = ${communityPosts.id})`,
      })
      .from(communityPosts)
      .innerJoin(users, eq(users.id, communityPosts.authorId))
      .where(and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED"), isNotNull(users.username)))
      .limit(1);
    return post ? { ...post, authorUsername: post.authorUsername ?? "", topReply: null } : null;
  }

  async communityComments(postId: number) {
    const post = await this.database.db.query.communityPosts.findFirst({ where: and(eq(communityPosts.id, postId), eq(communityPosts.status, "PUBLISHED")) });
    if (!post) return [];
    return this.database.db
      .select({ id: communityComments.id, postId: communityComments.postId, replyToCommentId: communityComments.replyToCommentId, body: communityComments.body, createdAt: communityComments.createdAt, updatedAt: communityComments.updatedAt, authorId: users.id, authorDisplayName: users.displayName, authorUsername: users.username, authorRole: users.role, likeCount: sql<number>`(select count(*)::int from ${communityCommentLikes} where ${communityCommentLikes.commentId} = ${communityComments.id})` })
      .from(communityComments)
      .innerJoin(users, eq(users.id, communityComments.authorId))
      .where(and(eq(communityComments.postId, postId), eq(communityComments.status, "PUBLISHED"), isNotNull(users.username)))
      .orderBy(communityComments.createdAt)
      .limit(200);
  }

  async search(query: string) {
    const variants = searchVariants(query);
    if (!variants.length) return [];
    const exactMatches = await this.database.db
      .select({
        identifierId: identifiers.id,
        type: identifiers.type,
        rawValue: identifiers.rawValue,
        provider: identifiers.provider,
        entityId: entities.id,
        slug: entities.slug,
        displayName: entities.displayName,
      })
      .from(identifiers)
      .innerJoin(
        entityIdentifiers,
        eq(entityIdentifiers.identifierId, identifiers.id),
      )
      .innerJoin(entities, eq(entities.id, entityIdentifiers.entityId))
      .where(inArray(identifiers.normalizedValue, variants));

    const textQuery = query.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
    const partialPattern = `%${textQuery.replace(/[\\%_]/g, "\\$&")}%`;
    const [partialIdentifierMatches, displayNameMatches] = textQuery.length >= 2
      ? await Promise.all([
          this.database.db
            .selectDistinct({
              identifierId: identifiers.id,
              type: identifiers.type,
              rawValue: identifiers.rawValue,
              provider: identifiers.provider,
              entityId: entities.id,
              slug: entities.slug,
              displayName: entities.displayName,
            })
            .from(identifiers)
            .innerJoin(reportIdentifiers, eq(reportIdentifiers.identifierId, identifiers.id))
            .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
            .innerJoin(entities, eq(entities.id, reports.entityId))
            .where(and(
              eq(reports.status, "PUBLISHED"),
              inArray(identifiers.type, [...partialSearchTypes]),
              ilike(identifiers.normalizedValue, partialPattern),
            )),
          this.database.db
            .selectDistinct({
              entityId: entities.id,
              slug: entities.slug,
              displayName: entities.displayName,
            })
            .from(entities)
            .innerJoin(reports, eq(reports.entityId, entities.id))
            .where(and(
              eq(reports.status, "PUBLISHED"),
              ilike(entities.displayName, partialPattern),
            )),
        ])
      : [[], []];

    const matched = [
      ...exactMatches.map((row) => ({ ...row, directlyPublished: false })),
      ...displayNameMatches.map((row) => ({
        ...row,
        identifierId: null,
        type: "PERSON_NAME",
        rawValue: row.displayName,
        provider: null,
        directlyPublished: true,
      })),
      ...partialIdentifierMatches.map((row) => ({ ...row, directlyPublished: true })),
    ];
    const uniqueMatches = matched.filter((row, index, rows) =>
      rows.findIndex((candidate) => candidate.entityId === row.entityId) === index
    );

    return Promise.all(
      uniqueMatches.map(async (row) => {
        const [reportResult, confirmationResult, publishedIdentifierResult] = await Promise.all([
          this.database.db
            .select({ value: count() })
            .from(reports)
            .where(
              and(
                eq(reports.entityId, row.entityId),
                eq(reports.status, "PUBLISHED"),
              ),
            ),
          this.database.db
            .select({ value: count() })
            .from(transactionConfirmations)
            .where(
              and(
                eq(transactionConfirmations.entityId, row.entityId),
                eq(transactionConfirmations.status, "APPROVED"),
              ),
            ),
          row.identifierId === null || row.directlyPublished
            ? Promise.resolve([{ value: 1 }])
            : this.database.db
                .select({ value: count() })
                .from(reportIdentifiers)
                .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
                .where(
                  and(
                    eq(reportIdentifiers.identifierId, row.identifierId),
                    eq(reports.entityId, row.entityId),
                    eq(reports.status, "PUBLISHED"),
                  ),
                ),
        ]);
        const { rawValue, provider, ...publicRow } = row;
        return {
          ...publicRow,
          displayValue: publicIdentifierValue(
            row.type as IdentifierType,
            rawValue,
            provider,
            (publishedIdentifierResult[0]?.value ?? 0) > 0 ? "PUBLISHED" : null,
            true,
          ),
          reportCount: reportResult[0]?.value ?? 0,
          successfulTransactionCount: confirmationResult[0]?.value ?? 0,
        };
      }),
    );
  }

  async recentReports() {
    const rows = await this.database.db
      .select({
        id: reports.id,
        publicId: reports.publicId,
        title: reports.title,
        publicSummary: reports.publicSummary,
        transactionDate: reports.transactionDate,
        allegedLoss: reports.allegedLoss,
        publishedAt: reports.publishedAt,
        slug: entities.slug,
        entityName: entities.displayName,
        uploaderDisplayName: users.displayName,
        uploaderRole: users.role,
      })
      .from(reports)
      .innerJoin(entities, eq(entities.id, reports.entityId))
      .innerJoin(users, eq(users.id, reports.reporterId))
      .where(eq(reports.status, "PUBLISHED"))
      .orderBy(desc(reports.publishedAt))
      .limit(6);

    const identifierRows = rows.length
      ? await this.database.db
          .select({
            reportId: reportIdentifiers.reportId,
            type: identifiers.type,
            rawValue: identifiers.rawValue,
            provider: identifiers.provider,
          })
          .from(reportIdentifiers)
          .innerJoin(identifiers, eq(identifiers.id, reportIdentifiers.identifierId))
          .where(inArray(reportIdentifiers.reportId, rows.map((row) => row.id)))
      : [];
    const priority: Partial<Record<IdentifierType, number>> = {
      BANK_ACCOUNT: 0,
      EWALLET: 1,
      PHONE: 2,
      RIOT_ID: 3,
      FACEBOOK_NAME: 4,
      DISCORD: 5,
    };

    return rows.map(({ id, uploaderDisplayName, uploaderRole, ...report }) => {
      const primary = identifierRows
        .filter((identifier) => identifier.reportId === id)
        .sort((a, b) => (priority[a.type as IdentifierType] ?? 99) - (priority[b.type as IdentifierType] ?? 99))[0];
      return {
        ...report,
        primaryIdentifier: primary
          ? {
              type: primary.type,
              displayValue: publicIdentifierValue(
                primary.type as IdentifierType,
                primary.rawValue,
                primary.provider,
                "PUBLISHED",
                true,
              ),
            }
          : null,
        uploadedBy: publicUploaderAttribution(uploaderDisplayName, uploaderRole as Role),
      };
    });
  }

  async entity(slug: string) {
    const entity = await this.database.db.query.entities.findFirst({
      where: eq(entities.slug, slug),
    });
    if (!entity) return null;

    const [identifierRows, publishedIdentifierRows, reportRows, confirmationRows] = await Promise.all([
      this.database.db
        .select({
          id: identifiers.id,
          type: identifiers.type,
          rawValue: identifiers.rawValue,
          provider: identifiers.provider,
        })
        .from(entityIdentifiers)
        .innerJoin(
          identifiers,
          eq(identifiers.id, entityIdentifiers.identifierId),
        )
        .where(eq(entityIdentifiers.entityId, entity.id)),
      this.database.db
        .selectDistinct({ identifierId: reportIdentifiers.identifierId })
        .from(reportIdentifiers)
        .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
        .where(
          and(eq(reports.entityId, entity.id), eq(reports.status, "PUBLISHED")),
        ),
      this.database.db
        .select({
          publicId: reports.publicId,
          title: reports.title,
          publicSummary: reports.publicSummary,
          allegedLoss: reports.allegedLoss,
          publishedAt: reports.publishedAt,
          uploaderDisplayName: users.displayName,
          uploaderRole: users.role,
        })
        .from(reports)
        .innerJoin(users, eq(users.id, reports.reporterId))
        .where(
          and(eq(reports.entityId, entity.id), eq(reports.status, "PUBLISHED")),
        )
        .orderBy(desc(reports.publishedAt)),
      this.database.db
        .select({
          id: transactionConfirmations.id,
          transactionDate: transactionConfirmations.transactionDate,
          amount: transactionConfirmations.amount,
          note: transactionConfirmations.note,
        })
        .from(transactionConfirmations)
        .where(
          and(
            eq(transactionConfirmations.entityId, entity.id),
            eq(transactionConfirmations.status, "APPROVED"),
          ),
        )
        .orderBy(desc(transactionConfirmations.transactionDate)),
    ]);

    const publishedIdentifierIds = new Set(
      publishedIdentifierRows.map((row) => row.identifierId),
    );
    const publicIdentifiers = identifierRows.map((row) => ({
      type: row.type,
      displayValue: publicIdentifierValue(
        row.type as IdentifierType,
        row.rawValue,
        row.provider,
        publishedIdentifierIds.has(row.id) ? "PUBLISHED" : null,
        true,
      ),
    }));
    const normalizedDisplayName = entity.displayName.toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
    const aliases = publicIdentifiers.filter((identifier, index) => {
      const source = identifierRows[index]!;
      return aliasTypes.has(identifier.type) && !(
        identifier.type === "PERSON_NAME" &&
        source.rawValue.toLocaleLowerCase("id-ID").replace(/\s+/g, " ") === normalizedDisplayName
      );
    });
    const accountIdentifiers = publicIdentifiers.filter((identifier) => !aliasTypes.has(identifier.type));
    return {
      ...entity,
      aliases,
      identifiers: accountIdentifiers,
      reports: reportRows.map(({ uploaderDisplayName, uploaderRole, ...report }) => ({
        ...report,
        uploadedBy: publicUploaderAttribution(uploaderDisplayName, uploaderRole as Role),
      })),
      confirmations: confirmationRows,
      reportCount: reportRows.length,
      successfulTransactionCount: confirmationRows.length,
    };
  }

  async publicCase(publicId: string) {
    const [report] = await this.database.db
      .select({
        id: reports.id,
        publicId: reports.publicId,
        title: reports.title,
        publicSummary: reports.publicSummary,
        evidenceUrl: reports.evidenceUrl,
        transactionDate: reports.transactionDate,
        allegedLoss: reports.allegedLoss,
        transactionType: reports.transactionType,
        publishedAt: reports.publishedAt,
        status: reports.status,
        slug: entities.slug,
        entityName: entities.displayName,
        uploaderDisplayName: users.displayName,
        uploaderRole: users.role,
      })
      .from(reports)
      .leftJoin(entities, eq(entities.id, reports.entityId))
      .innerJoin(users, eq(users.id, reports.reporterId))
      .where(
        and(eq(reports.publicId, publicId), eq(reports.status, "PUBLISHED")),
      )
      .limit(1);
    if (!report) return null;

    const [ids, evidence] = await Promise.all([
      this.database.db
        .select({
          type: identifiers.type,
          rawValue: identifiers.rawValue,
          provider: identifiers.provider,
        })
        .from(reportIdentifiers)
        .innerJoin(identifiers, eq(identifiers.id, reportIdentifiers.identifierId))
        .where(eq(reportIdentifiers.reportId, report.id)),
      this.database.db
        .select({
          id: reportEvidence.id,
          mimeType: reportEvidence.mimeType,
          caption: reportEvidence.caption,
        })
        .from(reportEvidence)
        .where(
          and(
            eq(reportEvidence.reportId, report.id),
            eq(reportEvidence.isPublicApproved, true),
          ),
        ),
    ]);
    const { status, uploaderDisplayName, uploaderRole, ...publicReport } = report;
    const publicIdentifiers = ids.map((identifier) => ({
      type: identifier.type,
      displayValue: publicIdentifierValue(
        identifier.type as IdentifierType,
        identifier.rawValue,
        identifier.provider,
        status,
        true,
      ),
    }));
    const normalizedEntityName = report.entityName?.toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
    const aliases = publicIdentifiers.filter((identifier, index) => {
      const source = ids[index]!;
      return aliasTypes.has(identifier.type) && !(
        identifier.type === "PERSON_NAME" &&
        source.rawValue.toLocaleLowerCase("id-ID").replace(/\s+/g, " ") === normalizedEntityName
      );
    });
    return {
      ...publicReport,
      uploadedBy: publicUploaderAttribution(uploaderDisplayName, uploaderRole as Role),
      aliases,
      identifiers: publicIdentifiers.filter((identifier) => !aliasTypes.has(identifier.type)),
      evidence,
    };
  }

  async publicEvidence(publicId: string, evidenceId: number) {
    const [row] = await this.database.db
      .select({
        storageKey: reportEvidence.storageKey,
        mimeType: reportEvidence.mimeType,
        fileName: reportEvidence.fileName,
      })
      .from(reportEvidence)
      .innerJoin(reports, eq(reports.id, reportEvidence.reportId))
      .where(
        and(
          eq(reports.publicId, publicId),
          eq(reports.status, "PUBLISHED"),
          eq(reportEvidence.id, evidenceId),
          eq(reportEvidence.isPublicApproved, true),
        ),
      )
      .limit(1);
    if (!row || !row.mimeType.startsWith("image/")) return null;
    return { meta: row, bytes: await this.storage.get(row.storageKey) };
  }
}

import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
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
  middlemanDirectory,
  communityCommentLikes,
  communityComments,
  communityPostLikes,
  communityPosts,
  identifiers,
  reportEvidence,
  reportIdentifiers,
  reportParties,
  reports,
  users,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";
import { publicEntityCondition, reportInvolvesEntity, reportIdentifierForEntity } from "../database/public-entity";
import { publicImageTypes } from "../storage/validate-evidence";

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
  middlemen() {
    return this.database.db.select({ id: middlemanDirectory.id, displayName: middlemanDirectory.displayName, description: middlemanDirectory.description, profileUrl: middlemanDirectory.profileUrl, contactUrl: middlemanDirectory.contactUrl, feeInfo: middlemanDirectory.feeInfo, isSponsored: middlemanDirectory.isSponsored }).from(middlemanDirectory).where(eq(middlemanDirectory.isPublished, true)).orderBy(asc(middlemanDirectory.sortOrder), asc(middlemanDirectory.id));
  }
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
    const reportRows = await (
      isTrustedRole
        ? this.database.db
            .select({
              publicId: reports.publicId,
              title: reports.title,
              publicSummary: reports.publicSummary,
              publishedAt: reports.publishedAt,
              entityName: sql<string>`coalesce((select p.display_name from report_parties p where p.report_id = ${reports.id} and p.position = 0 limit 1), ${entities.displayName})`,
              entitySlug: entities.slug,
            })
            .from(reports)
            .innerJoin(entities, eq(entities.id, reports.entityId))
            .where(and(eq(reports.reporterId, member.id), eq(reports.status, "PUBLISHED")))
            .orderBy(desc(reports.publishedAt))
        : Promise.resolve([]));
    const roleLabel = member.role === "ADMIN" ? "Admin" : member.role === "MODERATOR" ? "Moderator" : member.role === "VERIFIED_MIDDLEMAN" ? "Verified Middleman" : "Anggota Komunitas";
    return {
      displayName: member.displayName,
      username: member.username,
      bio: member.bio,
      role: member.role,
      roleLabel,
      joinedAt: member.createdAt,
      stats: {
        posts: 0,
        reports: reportRows.length,
      },
      reports: reportRows,
      posts: [],
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
      .innerJoin(reportIdentifiers, eq(reportIdentifiers.identifierId, identifiers.id))
      .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
      .innerJoin(entities, reportIdentifierForEntity(entities.id))
      .where(and(inArray(identifiers.normalizedValue, variants), eq(reports.status, "PUBLISHED")));

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
            .innerJoin(entities, reportIdentifierForEntity(entities.id))
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
            .innerJoin(reports, reportInvolvesEntity(entities.id))
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
        const [reportResult, matchedReports] = await Promise.all([
          this.database.db
            .select({ value: count() })
            .from(reports)
            .where(
              and(
                reportInvolvesEntity(row.entityId),
                eq(reports.status, "PUBLISHED"),
              ),
            ),
          row.identifierId === null
            ? Promise.resolve([])
            : this.database.db
                .selectDistinct({ publicId: reports.publicId, title: reports.title })
                .from(reportIdentifiers)
                .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
                .where(
                  and(
                    eq(reportIdentifiers.identifierId, row.identifierId),
                    reportIdentifierForEntity(row.entityId),
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
            row.identifierId === null || matchedReports.length > 0 ? "PUBLISHED" : null,
            true,
          ),
          reportCount: reportResult[0]?.value ?? 0,
          matchedReports,
        };
      }),
    );
  }

  async recentReports() {
    return this.listPublishedReports(3);
  }

  async reportDirectory(page: number, query = "", sort: "published" | "incident" = "published") {
    const pageSize = 10;
    // shortcut: offsets can shift when reports are published; use cursors if this disrupts browsing.
    const items = await this.listPublishedReports(pageSize + 1, (page - 1) * pageSize, query, sort);
    return { items: items.slice(0, pageSize), page, hasNext: page < 99_999 && items.length > pageSize };
  }

  private async listPublishedReports(limit: number, offset = 0, query = "", sort: "published" | "incident" = "published") {
    const pattern = `%${query.trim().replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await this.database.db
      .select({
        id: reports.id,
        publicId: reports.publicId,
        title: reports.title,
        publicSummary: reports.publicSummary,
        transactionDate: reports.transactionDate,
        publishedAt: reports.publishedAt,
        slug: entities.slug,
        entityName: sql<string>`coalesce((select p.display_name from report_parties p where p.report_id = ${reports.id} and p.position = 0 limit 1), ${entities.displayName})`,
        uploaderDisplayName: users.displayName,
        uploaderRole: users.role,
      })
      .from(reports)
      .innerJoin(entities, eq(entities.id, reports.entityId))
      .leftJoin(users, eq(users.id, reports.reporterId))
      .where(and(eq(reports.status, "PUBLISHED"), query.trim() ? sql`(
        ${reports.title} ilike ${pattern} or ${entities.displayName} ilike ${pattern}
        or exists (select 1 from report_parties p where p.report_id = ${reports.id} and p.display_name ilike ${pattern})
        or exists (select 1 from report_identifiers ri join identifiers i on i.id = ri.identifier_id
          where ri.report_id = ${reports.id} and i.type in ('PERSON_NAME', 'FACEBOOK_NAME', 'RIOT_NICKNAME', 'BANK_ACCOUNT_NAME', 'EWALLET_ACCOUNT_NAME') and i.raw_value ilike ${pattern})
      )` : undefined))
      .orderBy(...(sort === "incident" ? [sql`${reports.transactionDate} desc nulls last`] : []), desc(reports.publishedAt), desc(reports.id))
      .limit(limit)
      .offset(offset);

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
          .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
          .where(and(inArray(reportIdentifiers.reportId, rows.map((row) => row.id)), reportIdentifierForEntity(reports.entityId)))
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
        uploadedBy: publicUploaderAttribution(uploaderDisplayName ?? "", uploaderRole ?? "USER"),
      };
    });
  }

  async relatedProfiles(entityId: number) {
    const result = await this.database.db.execute<{ id: number; slug: string; displayName: string; type: IdentifierType; rawValue: string; provider: string | null; reportCount: number }>(sql`
      select distinct e.id, e.slug, e.display_name as "displayName", i.type, i.raw_value as "rawValue", i.provider,
        (select count(distinct r.id)::int from reports r where r.status = 'PUBLISHED' and
          (r.entity_id = e.id or exists(select 1 from report_parties p where p.report_id = r.id and p.entity_id = e.id))) as "reportCount"
      from report_identifiers own
      join reports own_report on own_report.id = own.report_id and own_report.status = 'PUBLISHED'
      join identifiers i on i.id = own.identifier_id
      join report_identifiers peer on peer.identifier_id = i.id
      join reports peer_report on peer_report.id = peer.report_id and peer_report.status = 'PUBLISHED'
      join entities e on e.id = coalesce(peer.entity_id, peer_report.entity_id)
      where coalesce(own.entity_id, own_report.entity_id) = ${entityId} and e.id <> ${entityId}
        and i.type in ('PHONE', 'BANK_ACCOUNT', 'EWALLET', 'DISCORD', 'FACEBOOK_URL', 'RIOT_ID')
      order by e.id, i.type, i.raw_value
    `);
    const profiles = new Map<number, { slug: string; displayName: string; reportCount: number; sharedIdentifiers: Array<{ type: string; displayValue: string }> }>();
    for (const row of result.rows) {
      const profile = profiles.get(row.id) ?? { slug: row.slug, displayName: row.displayName, reportCount: row.reportCount, sharedIdentifiers: [] };
      profile.sharedIdentifiers.push({ type: row.type, displayValue: publicIdentifierValue(row.type, row.rawValue, row.provider, "PUBLISHED", true) });
      profiles.set(row.id, profile);
    }
    return [...profiles.values()];
  }

  async entity(slug: string) {
    const [entity] = await this.database.db.select().from(entities).where(and(eq(entities.slug, slug), publicEntityCondition)).limit(1);
    if (!entity) return null;

    const [identifierRows, publishedIdentifierRows, reportRows] = await Promise.all([
      this.database.db
        .selectDistinct({
          id: identifiers.id,
          type: identifiers.type,
          rawValue: identifiers.rawValue,
          provider: identifiers.provider,
        })
        .from(reportIdentifiers)
        .innerJoin(identifiers, eq(identifiers.id, reportIdentifiers.identifierId))
        .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
        .where(and(reportIdentifierForEntity(entity.id), eq(reports.status, "PUBLISHED"))),
      this.database.db
        .selectDistinct({ identifierId: reportIdentifiers.identifierId })
        .from(reportIdentifiers)
        .innerJoin(reports, eq(reports.id, reportIdentifiers.reportId))
        .where(
          and(reportIdentifierForEntity(entity.id), eq(reports.status, "PUBLISHED")),
        ),
      this.database.db
        .select({
          publicId: reports.publicId,
          title: reports.title,
          publicSummary: reports.publicSummary,
          publishedAt: reports.publishedAt,
          uploaderDisplayName: users.displayName,
          uploaderRole: users.role,
        })
        .from(reports)
        .leftJoin(users, eq(users.id, reports.reporterId))
        .where(
          and(reportInvolvesEntity(entity.id), eq(reports.status, "PUBLISHED")),
        )
        .orderBy(desc(reports.publishedAt)),
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
      relatedProfiles: await this.relatedProfiles(entity.id),
      aliases,
      identifiers: accountIdentifiers,
      reports: reportRows.map(({ uploaderDisplayName, uploaderRole, ...report }) => ({
        ...report,
        uploadedBy: publicUploaderAttribution(uploaderDisplayName ?? "", uploaderRole ?? "USER"),
      })),
      reportCount: reportRows.length,
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
        transactionType: reports.transactionType,
        publishedAt: reports.publishedAt,
        status: reports.status,
        slug: entities.slug,
        entityName: sql<string>`coalesce((select p.display_name from report_parties p where p.report_id = ${reports.id} and p.position = 0 limit 1), ${entities.displayName})`,
        entityId: reports.entityId,
        uploaderDisplayName: users.displayName,
        uploaderRole: users.role,
      })
      .from(reports)
      .leftJoin(entities, eq(entities.id, reports.entityId))
      .leftJoin(users, eq(users.id, reports.reporterId))
      .where(
        and(eq(reports.publicId, publicId), eq(reports.status, "PUBLISHED")),
      )
      .limit(1);
    if (!report) return null;

    const [ids, evidence] = await Promise.all([
      this.database.db
        .select({
          entityId: reportIdentifiers.entityId,
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
    const partyRows = await this.database.db.select({ entityId: reportParties.entityId, entityName: reportParties.displayName, role: reportParties.role, slug: entities.slug }).from(reportParties).innerJoin(entities, eq(entities.id, reportParties.entityId)).where(eq(reportParties.reportId, report.id)).orderBy(reportParties.position);
    const parties = (partyRows.length ? partyRows : [{ entityId: report.entityId, entityName: report.entityName, role: "REPORTED", slug: report.slug }]).map(party => ({ ...party, identifiers: ids.filter(id => (id.entityId ?? report.entityId) === party.entityId).map(id => ({ type: id.type, displayValue: publicIdentifierValue(id.type as IdentifierType, id.rawValue, id.provider, status, true) })) }));
    const primaryIds = ids.filter(id => (id.entityId ?? report.entityId) === report.entityId);
    const publicIdentifiers = primaryIds.map((identifier) => ({
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
      const source = primaryIds[index]!;
      return aliasTypes.has(identifier.type) && !(
        identifier.type === "PERSON_NAME" &&
        source.rawValue.toLocaleLowerCase("id-ID").replace(/\s+/g, " ") === normalizedEntityName
      );
    });
    return {
      ...publicReport,
      entityName: parties[0]?.entityName ?? publicReport.entityName,
      parties,
      uploadedBy: publicUploaderAttribution(uploaderDisplayName ?? "", uploaderRole ?? "USER"),
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
    if (!row || !publicImageTypes.includes(row.mimeType)) return null;
    return { meta: row, bytes: await this.storage.get(row.storageKey) };
  }
}

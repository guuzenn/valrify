import { Injectable } from "@nestjs/common";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { searchVariants } from "@vlrfy/domain";
import { DatabaseService } from "../database/database.service";
import {
  entities,
  entityIdentifiers,
  identifiers,
  reportIdentifiers,
  reports,
  transactionConfirmations,
} from "../database/schema";

@Injectable()
export class PublicService {
  constructor(private readonly database: DatabaseService) {}

  async search(query: string) {
    const variants = searchVariants(query);
    if (!variants.length) return [];
    const matched = await this.database.db
      .select({
        identifierId: identifiers.id,
        type: identifiers.type,
        maskedValue: identifiers.maskedValue,
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

    return Promise.all(
      matched.map(async (row) => {
        const [reportResult, confirmationResult] = await Promise.all([
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
        ]);
        return {
          ...row,
          reportCount: reportResult[0]?.value ?? 0,
          successfulTransactionCount: confirmationResult[0]?.value ?? 0,
        };
      }),
    );
  }

  async entity(slug: string) {
    const entity = await this.database.db.query.entities.findFirst({
      where: eq(entities.slug, slug),
    });
    if (!entity) return null;

    const [identifierRows, reportRows, confirmationRows] = await Promise.all([
      this.database.db
        .select({
          type: identifiers.type,
          maskedValue: identifiers.maskedValue,
        })
        .from(entityIdentifiers)
        .innerJoin(
          identifiers,
          eq(identifiers.id, entityIdentifiers.identifierId),
        )
        .where(eq(entityIdentifiers.entityId, entity.id)),
      this.database.db
        .select({
          publicId: reports.publicId,
          title: reports.title,
          publicSummary: reports.publicSummary,
          allegedLoss: reports.allegedLoss,
          publishedAt: reports.publishedAt,
        })
        .from(reports)
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

    return {
      ...entity,
      identifiers: identifierRows,
      reports: reportRows,
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
        transactionDate: reports.transactionDate,
        allegedLoss: reports.allegedLoss,
        transactionType: reports.transactionType,
        publishedAt: reports.publishedAt,
        slug: entities.slug,
        entityName: entities.displayName,
      })
      .from(reports)
      .leftJoin(entities, eq(entities.id, reports.entityId))
      .where(
        and(eq(reports.publicId, publicId), eq(reports.status, "PUBLISHED")),
      )
      .limit(1);
    if (!report) return null;

    const ids = await this.database.db
      .select({
        type: identifiers.type,
        maskedValue: identifiers.maskedValue,
      })
      .from(reportIdentifiers)
      .innerJoin(identifiers, eq(identifiers.id, reportIdentifiers.identifierId))
      .where(eq(reportIdentifiers.reportId, report.id));
    return { ...report, identifiers: ids };
  }
}

import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { maskIdentifier, normalizeIdentifier, type IdentifierType } from "@valrify/domain";
import type { ReportInput } from "@valrify/validation";
import type { DatabaseService } from "../database/database.service";
import { entities, identifiers, reportIdentifiers, reports } from "../database/schema";

type Transaction = Parameters<Parameters<DatabaseService["db"]["transaction"]>[0]>[0];
export const strongIdentifierTypes = new Set<IdentifierType>(["PHONE", "BANK_ACCOUNT", "EWALLET", "DISCORD", "FACEBOOK_URL", "RIOT_ID"]);

export async function resolveReportParty(tx: Transaction, input: Pick<ReportInput, "entityName" | "identifiers">, previousEntityId?: number) {
  const submitted = input.identifiers.map(item => ({ ...item, isSubmitted: true }));
  const values = [...submitted, { type: "PERSON_NAME" as const, value: input.entityName, provider: undefined, isSubmitted: false }];
  const uniqueValues = values.filter((item, index) => values.findIndex(candidate => candidate.type === item.type && normalizeIdentifier(candidate.type, candidate.value) === normalizeIdentifier(item.type, item.value) && (!["BANK_ACCOUNT", "EWALLET"].includes(item.type) || (candidate.provider ?? "").toLowerCase() === (item.provider ?? "").toLowerCase())) === index);
  const identifierRows: Array<{ id: number; type: IdentifierType; isSubmitted: boolean }> = [];
  for (const item of uniqueValues) {
    const normalizedValue = normalizeIdentifier(item.type, item.value);
    await tx.insert(identifiers).values({ type: item.type, rawValue: item.value, normalizedValue, maskedValue: maskIdentifier(item.type, item.value, item.provider), provider: item.provider }).onConflictDoNothing();
    const providerCondition = ["BANK_ACCOUNT", "EWALLET"].includes(item.type) ? sql`lower(coalesce(${identifiers.provider}, '')) = ${(item.provider ?? "").trim().toLowerCase()}` : undefined;
    const identifier = await tx.query.identifiers.findFirst({ where: and(eq(identifiers.type, item.type), eq(identifiers.normalizedValue, normalizedValue), providerCondition) });
    if (!identifier) throw new Error("Gagal menyimpan data akun");
    identifierRows.push({ id: identifier.id, type: item.type, isSubmitted: item.isSubmitted });
  }
  const strongIds = identifierRows.filter(row => row.isSubmitted && strongIdentifierTypes.has(row.type)).map(row => row.id);
  const links = strongIds.length ? await tx.select({ entityId: sql<number>`coalesce(${reportIdentifiers.entityId}, ${reports.entityId})` }).from(reportIdentifiers).innerJoin(reports, eq(reports.id, reportIdentifiers.reportId)).where(and(inArray(reportIdentifiers.identifierId, strongIds), eq(reports.status, "PUBLISHED"))) : [];
  const matchedIds = [...new Set(links.map(row => row.entityId))];
  const candidates = matchedIds.length ? await tx.select().from(entities).where(inArray(entities.id, matchedIds)) : [];
  const sameName = candidates.filter(candidate => normalizeIdentifier("PERSON_NAME", candidate.displayName) === normalizeIdentifier("PERSON_NAME", input.entityName));
  let entity = sameName.length === 1 ? sameName[0] : undefined;
  if (!entity && previousEntityId) {
    const previous = await tx.query.entities.findFirst({ where: eq(entities.id, previousEntityId) });
    if (previous && normalizeIdentifier("PERSON_NAME", previous.displayName) === normalizeIdentifier("PERSON_NAME", input.entityName)) entity = previous;
  }
  if (!entity) {
    const slugBase = input.entityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profil";
    [entity] = await tx.insert(entities).values({ slug: `${slugBase}-${randomUUID().slice(0, 6)}`, displayName: input.entityName }).returning();
  }
  if (!entity) throw new Error("Gagal membuat profil");
  return { entity, identifierRows, matchedEntityIds: sameName.map(candidate => candidate.id), linkedToExistingProfile: sameName.length === 1 };
}

import assert from "node:assert/strict";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import { maskIdentifier, normalizeIdentifier } from "@valrify/domain";
import { DatabaseService } from "../src/database/database.service";
import {
  entities,
  entityIdentifiers,
  identifiers,
  reportIdentifiers,
  reports,
  users,
} from "../src/database/schema";
import { PublicService } from "../src/public/public.service";
import { ConfirmationsService } from "../src/confirmations/confirmations.service";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("public search normalizes phone formats and excludes non-public reports", { timeout: 30_000 }, async () => {
  const database = new DatabaseService();
  const suffix = Date.now().toString().slice(-8);
  const userId = `search-integration-${suffix}`;
  const publishedPhone = `0899${suffix}`;
  const hiddenPhone = `0888${suffix}`;
  const publishedSlug = `integration-published-${suffix}`;
  const hiddenSlug = `integration-hidden-${suffix}`;
  const createdEntityIds: number[] = [];
  const createdIdentifierIds: number[] = [];
  const createdReportIds: number[] = [];
  const storage = {
    put: async () => { throw new Error("Not used by search integration test."); },
    get: async () => { throw new Error("Not used by search integration test."); },
  } as EvidenceStorage;

  try {
    await database.db.insert(users).values({
      id: userId,
      email: `${userId}@valrify.local`,
      displayName: "Search Integration User",
      emailVerifiedAt: new Date(),
    });

    const [publishedEntity, hiddenEntity] = await database.db.insert(entities).values([
      { slug: publishedSlug, displayName: `Integration Seller ${suffix}` },
      { slug: hiddenSlug, displayName: `Hidden Seller ${suffix}` },
    ]).returning({ id: entities.id });
    createdEntityIds.push(publishedEntity!.id, hiddenEntity!.id);

    const identifierValues = [
      { type: "PHONE", rawValue: publishedPhone },
      { type: "PERSON_NAME", rawValue: `Alias Integration ${suffix}` },
      { type: "PHONE", rawValue: hiddenPhone },
    ].map((item) => ({
      ...item,
      normalizedValue: normalizeIdentifier(item.type as "PHONE" | "PERSON_NAME", item.rawValue),
      maskedValue: maskIdentifier(item.type as "PHONE" | "PERSON_NAME", item.rawValue),
    }));
    const [publishedPhoneId, publishedNameId, hiddenPhoneId] = await database.db
      .insert(identifiers)
      .values(identifierValues)
      .returning({ id: identifiers.id });
    createdIdentifierIds.push(publishedPhoneId!.id, publishedNameId!.id, hiddenPhoneId!.id);

    await database.db.insert(entityIdentifiers).values([
      { entityId: publishedEntity!.id, identifierId: publishedPhoneId!.id, isPrimary: true },
      { entityId: publishedEntity!.id, identifierId: publishedNameId!.id },
      { entityId: hiddenEntity!.id, identifierId: hiddenPhoneId!.id },
    ]);

    const [publishedReport, hiddenReport] = await database.db.insert(reports).values([
      {
        publicId: `SEARCH-PUBLISHED-${suffix}`,
        reporterId: userId,
        entityId: publishedEntity!.id,
        title: "Fixture pencarian published",
        chronology: "Fixture integration test untuk pencarian publik.",
        publicSummary: "Fixture integration test.",
        transactionType: "PAYMENT_FRAUD",
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      {
        publicId: `SEARCH-HIDDEN-${suffix}`,
        reporterId: userId,
        entityId: hiddenEntity!.id,
        title: "Fixture pencarian submitted",
        chronology: "Fixture integration test yang wajib tetap privat.",
        transactionType: "PAYMENT_FRAUD",
        status: "SUBMITTED",
      },
    ]).returning({ id: reports.id });
    createdReportIds.push(publishedReport!.id, hiddenReport!.id);

    await database.db.insert(reportIdentifiers).values([
      { reportId: publishedReport!.id, identifierId: publishedPhoneId!.id },
      { reportId: publishedReport!.id, identifierId: publishedNameId!.id },
      { reportId: hiddenReport!.id, identifierId: hiddenPhoneId!.id },
    ]);

    const service = new PublicService(database, storage);
    const internationalPhone = normalizeIdentifier("PHONE", publishedPhone);
    const phoneBody = publishedPhone.slice(1);
    const formattedLocal = `${publishedPhone.slice(0, 4)}-${publishedPhone.slice(4, 8)}-${publishedPhone.slice(8)}`;

    for (const query of [publishedPhone, formattedLocal, internationalPhone, `+62 ${phoneBody.slice(0, 3)}-${phoneBody.slice(3)}`]) {
      const result = await service.search(query);
      assert.equal(result.length, 1, `${query} should find exactly one profile`);
      assert.equal(result[0]!.slug, publishedSlug);
    }

    const partialName = await service.search(`seller ${suffix}`);
    assert.equal(partialName.length, 1);
    assert.equal(partialName[0]!.slug, publishedSlug);

    assert.deepEqual(await service.search(publishedPhone.slice(0, 6)), []);
    assert.deepEqual(await service.search(hiddenPhone), []);
    assert.equal(await service.entity(hiddenSlug), null);
    assert.equal((await service.entity(publishedSlug))?.slug, publishedSlug);
    await assert.rejects(() => new ConfirmationsService(database, storage).create(userId, { entityId: hiddenEntity!.id, transactionDate: "2026-10-01", amount: 0, note: "Privat tidak boleh dibuka lewat testi." }, []), /Profil tidak ditemukan/);
  } finally {
    if (createdReportIds.length) await database.db.delete(reports).where(inArray(reports.id, createdReportIds));
    if (createdEntityIds.length) await database.db.delete(entities).where(inArray(entities.id, createdEntityIds));
    if (createdIdentifierIds.length) await database.db.delete(identifiers).where(inArray(identifiers.id, createdIdentifierIds));
    await database.db.delete(users).where(eq(users.id, userId));
    await database.onModuleDestroy();
  }
});

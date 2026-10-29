import "../src/load-env";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { maskIdentifier, normalizeIdentifier } from "@valrify/domain";
import { reviewSchema } from "@valrify/validation";
import { AdminService } from "../src/admin/admin.service";
import { AccountService } from "../src/account/account.service";
import { DatabaseService } from "../src/database/database.service";
import { PublicService } from "../src/public/public.service";
import { entities, entityIdentifiers, identifiers, moderationActions, reportEvidence, reportIdentifiers, reports, reportStatusHistory, transactionConfirmations, users } from "../src/database/schema";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("withdrawal hides cases, evidence and unsupported identifiers while preserving other reports and audit", { timeout: 30_000 }, async () => {
  const database = new DatabaseService();
  const suffix = randomUUID();
  const userId = `withdraw-user-${suffix}`, adminId = `withdraw-admin-${suffix}`;
  const entityIds: number[] = [], identifierIds: number[] = [], reportIds: number[] = [];
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const storage = { get: async () => bytes, put: async () => { throw new Error("Not used"); } } as EvidenceStorage;
  const admin = new AdminService(database, storage), publicService = new PublicService(database, storage);
  const withdraw = reviewSchema.parse({ decision: "WITHDRAW", rationale: "Identifier keliru dan perlu ditarik dari publik." });
  try {
    await database.db.insert(users).values([
      { id: userId, username: userId, email: `${userId}@valrify.local`, displayName: "Fixture reporter", emailVerifiedAt: new Date() },
      { id: adminId, email: `${adminId}@valrify.local`, displayName: "Fixture admin", role: "ADMIN", emailVerifiedAt: new Date() },
    ]);
    const createdEntities = await database.db.insert(entities).values([
      { slug: `withdraw-shared-${suffix}`, displayName: `Shared ${suffix}` },
      { slug: `withdraw-only-${suffix}`, displayName: `Only ${suffix}` },
    ]).returning();
    entityIds.push(...createdEntities.map((row) => row.id));
    const [sharedEntity, onlyEntity] = createdEntities;
    const values = ["081" + Date.now(), "082" + Date.now(), "083" + Date.now()];
    const createdIdentifiers = await database.db.insert(identifiers).values(values.map((rawValue) => ({
      type: "PHONE", rawValue, normalizedValue: normalizeIdentifier("PHONE", rawValue), maskedValue: maskIdentifier("PHONE", rawValue),
    }))).returning();
    identifierIds.push(...createdIdentifiers.map((row) => row.id));
    const [sharedId, uniqueId, onlyId] = createdIdentifiers;
    await database.db.insert(entityIdentifiers).values([
      { entityId: sharedEntity!.id, identifierId: sharedId!.id }, { entityId: sharedEntity!.id, identifierId: uniqueId!.id },
      { entityId: onlyEntity!.id, identifierId: onlyId!.id },
    ]);
    const createdReports = await database.db.insert(reports).values([
      { publicId: `WITHDRAW-${suffix}`, entityId: sharedEntity!.id },
      { publicId: `KEEP-${suffix}`, entityId: sharedEntity!.id },
      { publicId: `ONLY-${suffix}`, entityId: onlyEntity!.id },
    ].map((row) => ({ ...row, reporterId: userId, title: "Fixture report", chronology: "Fixture chronology", transactionType: "PAYMENT_FRAUD", status: "SUBMITTED" as const }))).returning();
    reportIds.push(...createdReports.map((row) => row.id));
    const [removedReport, keptReport, onlyReport] = createdReports;
    await database.db.insert(reportIdentifiers).values([
      { reportId: removedReport!.id, identifierId: sharedId!.id }, { reportId: removedReport!.id, identifierId: uniqueId!.id },
      { reportId: keptReport!.id, identifierId: sharedId!.id }, { reportId: onlyReport!.id, identifierId: onlyId!.id },
    ]);
    const evidence = await database.db.insert(reportEvidence).values(reportIds.map((reportId) => ({
      reportId, storageKey: `fixture/${suffix}/${reportId}`, fileName: "fixture.png", mimeType: "image/png", size: bytes.length,
    }))).returning();
    await assert.rejects(() => admin.review(removedReport!.id, adminId, withdraw), /Status laporan/);
    for (const [index, report] of createdReports.entries()) {
      await admin.review(report.id, adminId, reviewSchema.parse({ decision: "PUBLISH", summary: "Ringkasan fixture yang cukup panjang untuk dipublikasikan.", rationale: "Bukti fixture sudah diperiksa admin.", publicEvidenceIds: [evidence[index]!.id] }));
    }
    assert.ok((await admin.queue("PUBLISHED")).some((row) => row.id === removedReport!.id));
    assert.ok(await publicService.publicCase(removedReport!.publicId));
    assert.ok(await publicService.publicEvidence(removedReport!.publicId, evidence[0]!.id));
    await assert.rejects(() => admin.review(removedReport!.id, userId, withdraw), /dikirim sendiri/);
    const concurrent = await Promise.allSettled([admin.review(removedReport!.id, adminId, withdraw), admin.review(removedReport!.id, adminId, withdraw)]);
    assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await publicService.publicCase(removedReport!.publicId), null);
    assert.equal(await publicService.publicEvidence(removedReport!.publicId, evidence[0]!.id), null);
    assert.deepEqual(await publicService.search(values[1]!), []);
    assert.equal((await publicService.search(values[0]!)).length, 1);
    const profile = await publicService.entity(sharedEntity!.slug);
    assert.equal(profile?.reportCount, 1);
    assert.deepEqual(profile?.identifiers.map((row) => row.displayValue), [values[0]]);
    assert.ok(await publicService.publicCase(keptReport!.publicId));
    assert.ok(await publicService.publicEvidence(keptReport!.publicId, evidence[1]!.id));
    assert.ok(!(await publicService.recentReports()).some((row) => row.publicId === removedReport!.publicId));
    await admin.review(onlyReport!.id, adminId, withdraw);
    assert.equal(await publicService.entity(onlyEntity!.slug), null);
    await database.db.insert(transactionConfirmations).values({ userId, entityId: onlyEntity!.id, transactionDate: new Date(), status: "APPROVED" });
    assert.equal(await publicService.entity(onlyEntity!.slug), null);
    assert.equal((await database.db.select().from(transactionConfirmations).where(eq(transactionConfirmations.entityId, onlyEntity!.id))).length, 1, "Archived testimonials are preserved without making a profile public");
    assert.ok(!("confirmations" in (await publicService.entity(sharedEntity!.slug))!));
    const member = (await publicService.communityUser(userId))!;
    assert.ok(member);
    assert.ok(!("testimonials" in member));
    assert.ok(!("testimonials" in member.stats));
    assert.deepEqual(await publicService.search(values[2]!), []);
    const history = await database.db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, removedReport!.id));
    assert.equal(history.filter((row) => row.toStatus === "WITHDRAWN").length, 1);
    const audit = await database.db.select().from(moderationActions).where(eq(moderationActions.reportId, removedReport!.id));
    assert.equal(audit.filter((row) => row.action === "REPORT_WITHDRAWN").length, 1);
    assert.equal(audit.find((row) => row.action === "REPORT_WITHDRAWN")?.rationale, withdraw.rationale);
    assert.equal((await admin.evidence(evidence[0]!.id)).meta.isPublicApproved, false);
    const own = await new AccountService(database).overview(userId);
    assert.ok(!("confirmations" in own));
    assert.equal(own.reports.find((row) => row.id === removedReport!.id)?.moderatorNote, withdraw.rationale);
  } finally {
    if (reportIds.length) {
      await database.db.delete(moderationActions).where(inArray(moderationActions.reportId, reportIds));
      await database.db.delete(reports).where(inArray(reports.id, reportIds));
    }
    if (entityIds.length) {
      await database.db.delete(transactionConfirmations).where(inArray(transactionConfirmations.entityId, entityIds));
      await database.db.delete(entities).where(inArray(entities.id, entityIds));
    }
    if (identifierIds.length) await database.db.delete(identifiers).where(inArray(identifiers.id, identifierIds));
    await database.db.delete(users).where(inArray(users.id, [userId, adminId]));
    await database.onModuleDestroy();
  }
});

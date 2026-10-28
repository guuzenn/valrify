import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { reportEditSchema, reportSchema, reviewSchema } from "@valrify/validation";
import { AdminService } from "../src/admin/admin.service";
import { ReportsService } from "../src/reports/reports.service";
import { PublicService } from "../src/public/public.service";
import { DatabaseService } from "../src/database/database.service";
import { entities, identifiers, moderationActions, reportIdentifiers, reports, users } from "../src/database/schema";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("report RBAC permits admin and middleman own publication, scoped queues and ownership checks", async () => {
  const target = new URL(process.env.DATABASE_URL ?? "postgresql://localhost:5434/valrify");
  assert(["localhost", "127.0.0.1"].includes(target.hostname) && !target.pathname.includes("prod"));
  const database = new DatabaseService();
  const suffix = randomUUID();
  const roles = ["ADMIN", "MODERATOR", "VERIFIED_MIDDLEMAN", "USER"] as const;
  const actorIds = roles.map(role => `${role}-${suffix}`);
  const reportIds: number[] = [], entityIds: number[] = [], identifierIds: number[] = [];
  const storage = {} as EvidenceStorage; // Link-only reports never access file storage.
  const service = new ReportsService(database, storage), admin = new AdminService(database, storage);
  const publish = reviewSchema.parse({ decision: "PUBLISH", summary: "Ringkasan netral laporan fixture dengan bukti berupa link posting publik.", rationale: "Link bukti sudah diperiksa dan mendukung laporan." });
  try {
    await database.db.insert(users).values(roles.map((role, index) => ({ id: actorIds[index]!, email: `${actorIds[index]}@example.test`, displayName: role, role, emailVerifiedAt: new Date() })));
    for (const [index, role] of roles.entries()) {
      const created = await service.create(actorIds[index]!, reportSchema.parse({ entityName: `${role} fixture ${suffix}`, chronology: "Kronologi fixture menjelaskan transaksi dan akun yang dilaporkan berdasarkan bukti posting publik.", category: "FAKE_MIDDLEMAN", evidenceUrl: "https://www.facebook.com/groups/fixture/posts/123", identifiers: [{ type: "FACEBOOK_NAME", value: `${role} fixture ${suffix}` }] }), []);
      reportIds.push(created.id);
      const row = (await database.db.query.reports.findFirst({ where: eq(reports.id, created.id) }))!;
      assert.ok(row.entityId);
      entityIds.push(row.entityId);
      identifierIds.push(...(await database.db.select().from(reportIdentifiers).where(eq(reportIdentifiers.reportId, created.id))).map(item => item.identifierId));
      assert.equal(row.status, "SUBMITTED");
      assert.equal(await new PublicService(database, storage).publicCase(created.publicId), null);
      const edit = reportEditSchema.parse({ updatedAt: row.updatedAt.toISOString(), chronology: row.chronology, category: "FAKE_MIDDLEMAN", transactionDate: "", evidenceUrl: row.evidenceUrl, rationale: "Memastikan akun sesuai dengan bukti posting publik.", parties: [{ entityId: row.entityId, entityName: `${role} fixture ${suffix}`, role: "MIDDLEMAN", identifiers: [{ type: "FACEBOOK_NAME", value: `${role} fixture ${suffix}` }] }] });
      assert.deepEqual((await admin.queue("PENDING", actorIds[index]!)).map(item => item.id), [created.id]);
      await assert.rejects(admin.assertReportOwner(created.id, actorIds[(index + 1) % roles.length]!), { status: 404 });
      if (role === "ADMIN" || role === "VERIFIED_MIDDLEMAN") {
        await admin.editReport(created.id, actorIds[index]!, edit);
        await assert.rejects(admin.review(created.id, actorIds[index]!, { ...publish, summary: publish.summary, publicEvidenceIds: [2147483647] }), /Bukti publik/);
        await admin.review(created.id, actorIds[index]!, publish);
        assert.ok(await new PublicService(database, storage).publicCase(created.publicId));
        const audit = await database.db.select().from(moderationActions).where(eq(moderationActions.reportId, created.id));
        assert.ok(audit.some(action => action.action === "REPORT_EDITED" && action.actorId === actorIds[index]));
        assert.ok(audit.some(action => action.action === "REPORT_PUBLISHED" && action.actorId === actorIds[index]));
        assert.deepEqual((await admin.queue("PUBLISHED", actorIds[index]!)).map(item => item.id), [created.id]);
        await admin.review(created.id, actorIds[index]!, reviewSchema.parse({ decision: "WITHDRAW", rationale: "Penarikan fixture oleh admin yang mengirim laporan." }));
      } else {
        await assert.rejects(admin.editReport(created.id, actorIds[index]!, edit), { status: 403 });
        await assert.rejects(admin.review(created.id, actorIds[index]!, publish), { status: 403 });
      }
    }
    for (const index of [2, 3]) await assert.rejects(admin.review(reportIds[1]!, actorIds[index]!, publish), { status: 403 });
    await admin.review(reportIds[3]!, actorIds[1]!, publish); // Moderator may review another account's report.
    await database.db.update(users).set({ role: "MODERATOR" }).where(eq(users.id, actorIds[0]!));
    await assert.rejects(admin.review(reportIds[0]!, actorIds[0]!, publish), { status: 403 });
  } finally {
    if (reportIds.length) {
      await database.db.delete(moderationActions).where(inArray(moderationActions.reportId, reportIds));
      await database.db.delete(reports).where(inArray(reports.id, reportIds));
    }
    if (entityIds.length) await database.db.delete(entities).where(inArray(entities.id, entityIds));
    if (identifierIds.length) await database.db.delete(identifiers).where(inArray(identifiers.id, identifierIds));
    await database.db.delete(users).where(inArray(users.id, actorIds));
    await database.onModuleDestroy();
  }
});

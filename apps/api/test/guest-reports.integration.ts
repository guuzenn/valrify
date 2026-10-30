import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { reportSchema, reviewSchema } from "@valrify/validation";
import { DatabaseService } from "../src/database/database.service";
import { reports, reportStatusHistory, users } from "../src/database/schema";
import { ReportsService } from "../src/reports/reports.service";
import { guestSessionHash, guestSubmission, newGuestCookie } from "../src/reports/guest-report.security";
import { AdminService } from "../src/admin/admin.service";
import { PublicService } from "../src/public/public.service";
import { AccountService } from "../src/account/account.service";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("guest submissions serialize quotas, deduplicate retries, remain private and can be claimed", { timeout: 30_000 }, async () => {
  const original = process.env.DATABASE_URL;
  const target = new URL(original ?? "postgresql://valrify:valrify_dev@127.0.0.1:5434/valrify");
  assert(["localhost", "127.0.0.1"].includes(target.hostname) && !target.pathname.includes("prod"));
  const name = `valrify_guest_test_${randomUUID().replaceAll("-", "")}`;
  assert(/^valrify_guest_test_[a-f0-9]{32}$/.test(name));
  const control = new Pool({ connectionString: target.toString() });
  let database: DatabaseService | undefined, created = false, writes = 0;
  try {
    await control.query(`create database "${name}"`); created = true; target.pathname = `/${name}`;
    try { process.env.DATABASE_URL = target.toString(); database = new DatabaseService(); }
    finally { if (original === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original; }
    await migrate(database.db, { migrationsFolder: resolve(__dirname, "../drizzle") });
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const storage = { put: async () => { writes++; return { key: `fixture/${writes}`, fileName: "test.png", mimeType: "image/png", size: bytes.length }; }, get: async () => bytes } as EvidenceStorage;
    const service = new ReportsService(database, storage), admin = new AdminService(database, storage), publicService = new PublicService(database, storage);
    await database.db.insert(users).values([
      { id: "admin", email: "admin@example.test", displayName: "Admin", role: "ADMIN", emailVerifiedAt: new Date() },
      { id: "member", email: "member@example.test", displayName: "Member", emailVerifiedAt: new Date() },
    ]);
    const input = reportSchema.parse({ category: "HACKBACK", entityName: "Guest fixture", chronology: "Cerita kejadian fixture yang cukup panjang untuk diperiksa.", identifiers: [{ type: "PHONE", value: "081234567890" }], evidenceUrl: "https://example.test/evidence" });
    const guest = { ...guestSubmission(guestSessionHash(newGuestCookie())!, randomUUID()), contactEmail: "contact@example.test" };
    const file = { buffer: bytes, originalname: "test.png", mimetype: "image/png", size: bytes.length } as Express.Multer.File;
    const retries = await Promise.all([service.create(null, input, [file], guest), service.create(null, input, [file], guest)]);
    const first = retries[0]!;
    assert.equal(retries[1]!.publicId, first.publicId); assert.equal(writes, 1);
    const [row] = await database.db.select().from(reports).where(eq(reports.id, first.id));
    assert.equal(row!.reporterId, null); assert.equal(row!.status, "SUBMITTED");
    assert.notEqual(row!.guestTrackingHash, first.trackingToken);
    assert.equal((await database.db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, first.id)))[0]!.actorId, null);
    assert.equal(await publicService.publicCase(first.publicId), null);
    assert.equal((await admin.queue()).find(item => item.id === first.id)?.reporterName, "Tamu");
    assert.equal((await admin.queue()).find(item => item.id === first.id)?.guestContactEmail, guest.contactEmail);
    assert.deepEqual(Object.keys(await service.guestStatus(first.trackingToken!)).sort(), ["createdAt", "moderatorNote", "publicId", "status"]);
    await assert.rejects(service.guestStatus("b".repeat(64)), /tidak ditemukan/);
    await assert.rejects(service.create(null, { ...input, chronology: "Perubahan isi kiriman setelah permintaan pertama diterima." }, [file], guest), /sebelumnya sudah diterima/);
    await assert.rejects(service.create(null, input, [file], { ...guest, trackingToken: "b".repeat(64) }), /Gunakan tautan pelacakan yang disimpan/);
    const next = () => ({ ...guestSubmission(guest.sessionHash, randomUUID()), contactEmail: null });
    await assert.rejects(service.create(null, input, [], next()), /satu menit/);
    await database.db.update(reports).set({ createdAt: new Date(Date.now() - 120_000) }).where(eq(reports.id, first.id));
    const competing = await Promise.allSettled([service.create(null, input, [], next()), service.create(null, input, [], next())]);
    assert.equal(competing.filter(item => item.status === "fulfilled").length, 1);
    assert.equal((await database.db.select({ count: sql<number>`count(*)::int` }).from(reports))[0]!.count, 2);
    await assert.rejects(service.checkGuestQuota(next()), /Maksimal dua/);
    assert.equal(writes, 1);
    await admin.review(first.id, "admin", reviewSchema.parse({ decision: "NEEDS_INFO", rationale: "Tambahkan detail bukti percakapan dan transfer." }));
    assert.match((await service.guestStatus(first.trackingToken!)).moderatorNote!, /Tambahkan detail/);
    await admin.review(first.id, "admin", reviewSchema.parse({ decision: "PUBLISH", summary: "Ringkasan publik fixture tamu yang cukup panjang untuk ditampilkan.", rationale: "Bukti fixture diperiksa dan cukup mendukung laporan.", publicEvidenceIds: [] }));
    const published = await publicService.publicCase(first.publicId);
    assert.ok(published);
    assert.equal(published.uploadedBy.displayName, "Anggota komunitas");
    assert.ok(!JSON.stringify(published).includes(guest.contactEmail));
    assert.ok((await publicService.recentReports()).some(item => item.publicId === first.publicId));
    assert.equal((await publicService.entity(published.slug!))?.reportCount, 1);
    const claims = await Promise.allSettled([service.claimGuest(first.trackingToken!, "member"), service.claimGuest(first.trackingToken!, "admin")]);
    assert.equal(claims.filter(item => item.status === "fulfilled").length, 1);
    await assert.rejects(service.guestStatus(first.trackingToken!), /tidak ditemukan/);
    const [claimed] = await database.db.select().from(reports).where(eq(reports.id, first.id));
    assert.ok((await new AccountService(database).overview(claimed!.reporterId!)).reports.some(item => item.id === first.id));
    assert.equal((await service.create(null, input, [file], guest)).trackingToken, undefined, "Retry cannot revive a claimed token");
    await admin.review(first.id, "admin", reviewSchema.parse({ decision: "WITHDRAW", rationale: "Laporan fixture ditarik setelah pemeriksaan lanjutan." }));
    assert.equal(await publicService.publicCase(first.publicId), null);
    await database.db.update(reports).set({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }).where(eq(reports.guestSessionHash, guest.sessionHash));
    await service.checkGuestQuota(next());
  } finally {
    await database?.onModuleDestroy();
    if (created) await control.query(`drop database "${name}" with (force)`);
    await control.end();
  }
});

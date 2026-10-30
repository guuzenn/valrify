import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { reportSchema, reviewSchema } from "@valrify/validation";
import { DatabaseService } from "../src/database/database.service";
import { reports, reportParties, reportIdentifiers, users } from "../src/database/schema";
import { ReportsService } from "../src/reports/reports.service";
import { AdminService } from "../src/admin/admin.service";
import { PublicService } from "../src/public/public.service";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("shared contacts link distinct named profiles and legacy splitting preserves report ownership", { timeout: 30_000 }, async () => {
  const original = process.env.DATABASE_URL;
  const target = new URL(original ?? "postgresql://valrify:valrify_dev@127.0.0.1:5434/valrify");
  assert(["localhost", "127.0.0.1"].includes(target.hostname) && !target.pathname.includes("prod"));
  const name = `valrify_link_test_${randomUUID().replaceAll("-", "")}`;
  const control = new Pool({ connectionString: target.toString() });
  let database: DatabaseService | undefined, created = false;
  try {
    await control.query(`create database "${name}"`); created = true; target.pathname = `/${name}`;
    try { process.env.DATABASE_URL = target.toString(); database = new DatabaseService(); }
    finally { if (original === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original; }
    await migrate(database.db, { migrationsFolder: resolve(__dirname, "../drizzle") });
    const db = database.db;
    const storage = {} as EvidenceStorage;
    const submit = new ReportsService(database, storage), admin = new AdminService(database, storage), publicService = new PublicService(database, storage);
    await db.insert(users).values({ id: "admin", email: "admin@example.test", displayName: "Admin", role: "ADMIN" });
    const input = (entityName: string) => reportSchema.parse({ entityName, category: "OTHER", chronology: "Kronologi fixture transaksi untuk memeriksa pemisahan profil.", evidenceUrl: "https://example.test/proof", identifiers: [{ type: "PHONE", value: "085735814492" }] });
    const publish = (id: number) => admin.review(id, "admin", reviewSchema.parse({ decision: "PUBLISH", summary: "Ringkasan laporan fixture yang cukup panjang untuk ditampilkan.", rationale: "Bukti fixture sudah diperiksa oleh admin." }));
    const aInput = input("Nanda Wiji Rohmat");
    aInput.identifiers.push({ type: "FACEBOOK_NAME", value: "Arifaan" });
    const a = await submit.create("admin", aInput, []); await publish(a.id);
    const aliasMatch = (await publicService.search("arifaan"))[0]!;
    assert.equal(aliasMatch.displayName, "Nanda Wiji Rohmat");
    assert.equal(aliasMatch.displayValue, "Arifaan");
    assert.deepEqual(aliasMatch.matchedReports.map(report => report.publicId), [a.publicId]);
    const b = await submit.create("admin", input("Qin Chen"), []);
    const hidden = await submit.create("admin", input("Nama Privat"), []);
    const aCase = (await publicService.publicCase(a.publicId))!;
    assert.deepEqual((await publicService.entity(aCase.slug!))!.relatedProfiles, []);
    await publish(b.id);
    let bCase = (await publicService.publicCase(b.publicId))!;
    assert.notEqual(aCase.entityId, bCase.entityId);
    assert.equal(bCase.entityName, "Qin Chen");
    const repeat = await submit.create("admin", input("  QIN CHEN  "), []);
    assert.equal(repeat.linkedToExistingProfile, true);
    await publish(repeat.id);
    assert.deepEqual((await publicService.search("085735814492")).find(row => row.displayName === "Qin Chen")!.matchedReports.map(report => report.publicId).sort(), [b.publicId, repeat.publicId].sort());
    await admin.review(repeat.id, "admin", reviewSchema.parse({ decision: "WITHDRAW", rationale: "Menarik fixture kedua setelah memeriksa daftar terkait." }));
    for (const phone of ["085735814492", "+62 857-3581-4492"]) {
      const search = await publicService.search(phone);
      assert.deepEqual(search.map(row => row.displayName).sort(), ["Nanda Wiji Rohmat", "Qin Chen"]);
      assert.ok(search.every(row => row.reportCount === 1));
      assert.deepEqual(search.find(row => row.displayName === "Qin Chen")!.matchedReports.map(report => report.publicId), [b.publicId]);
      assert.deepEqual(search.find(row => row.displayName === "Nanda Wiji Rohmat")!.matchedReports.map(report => report.publicId), [a.publicId]);
    }
    const related = (await publicService.entity(aCase.slug!))!.relatedProfiles;
    assert.equal(related.length, 1); assert.equal(related[0]!.displayName, "Qin Chen");
    assert.equal(related[0]!.sharedIdentifiers[0]!.displayValue, "085735814492");
    assert.equal((await publicService.entity(bCase.slug!))!.relatedProfiles[0]!.displayName, "Nanda Wiji Rohmat");
    assert.equal(await publicService.publicCase(hidden.publicId), null);
    // Recreate the old automatic merge while retaining the original party name.
    await db.update(reportIdentifiers).set({ entityId: aCase.entityId }).where(eq(reportIdentifiers.reportId, b.id));
    await db.update(reportParties).set({ entityId: aCase.entityId! }).where(eq(reportParties.reportId, b.id));
    await db.update(reports).set({ entityId: aCase.entityId }).where(eq(reports.id, b.id));
    assert.equal((await publicService.publicCase(b.publicId))!.entityName, "Qin Chen", "case uses reported name even before backfill");
    const migration = readFileSync(resolve(__dirname, "../drizzle/0019_separate_report_profiles.sql"), "utf8");
    await db.transaction(tx => tx.execute(sql.raw(migration)));
    bCase = (await publicService.publicCase(b.publicId))!;
    assert.notEqual(bCase.entityId, aCase.entityId);
    assert.equal(bCase.entityName, "Qin Chen");
    assert.equal((await publicService.entity(aCase.slug!))!.reportCount, 1);
    assert.equal((await publicService.entity(bCase.slug!))!.reportCount, 1);
    assert.equal((await publicService.entity(aCase.slug!))!.aliases.some(item => item.displayValue === "Qin Chen"), false);
    await db.transaction(tx => tx.execute(sql.raw(migration)));
    assert.equal((await publicService.publicCase(b.publicId))!.entityId, bCase.entityId, "backfill is idempotent");
    await admin.review(b.id, "admin", reviewSchema.parse({ decision: "WITHDRAW", rationale: "Menarik fixture untuk memeriksa privasi hubungan." }));
    assert.deepEqual((await publicService.entity(aCase.slug!))!.relatedProfiles, []);
    assert.equal((await publicService.search("085735814492")).length, 1);
    assert.deepEqual((await publicService.search("085735814492"))[0]!.matchedReports.map(report => report.publicId), [a.publicId]);
  } finally {
    await database?.onModuleDestroy();
    if (created) await control.query(`drop database "${name}"`);
    await control.end();
  }
});

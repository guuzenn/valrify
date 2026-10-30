import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DatabaseService } from "../src/database/database.service";
import { entities, reports } from "../src/database/schema";
import { PublicService } from "../src/public/public.service";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("public report pagination is bounded, deterministic and excludes all non-public data", { timeout: 30_000 }, async () => {
  const original = process.env.DATABASE_URL;
  const target = new URL(original ?? "postgresql://valrify:valrify_dev@127.0.0.1:5434/valrify");
  assert(["localhost", "127.0.0.1"].includes(target.hostname) && !target.pathname.includes("prod"));
  const name = `valrify_reports_test_${randomUUID().replaceAll("-", "")}`;
  assert(/^valrify_reports_test_[a-f0-9]{32}$/.test(name));
  const control = new Pool({ connectionString: target.toString() });
  let database: DatabaseService | undefined, created = false;
  try {
    await control.query(`create database "${name}"`); created = true; target.pathname = `/${name}`;
    try { process.env.DATABASE_URL = target.toString(); database = new DatabaseService(); }
    finally { if (original === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original; }
    await migrate(database.db, { migrationsFolder: resolve(__dirname, "../drizzle") });
    const service = new PublicService(database, {} as EvidenceStorage);
    assert.deepEqual(await service.reportDirectory(1), { items: [], page: 1, hasNext: false });
    const [entity] = await database.db.insert(entities).values({ slug: "list-fixture", displayName: "List fixture" }).returning();
    const publishedAt = new Date("2026-10-29T00:00:00Z");
    const rows = await database.db.insert(reports).values(Array.from({ length: 25 }, (_, i) => ({
      publicId: `LIST-${i}`, reporterId: null, entityId: entity!.id, title: `Laporan ${i}`, chronology: "Sensitive private chronology", guestContactEmail: "sensitive@example.test", guestTrackingHash: `private-hash-${i}`, publicSummary: "Ringkasan publik", status: "PUBLISHED" as const, publishedAt, transactionType: "HACKBACK",
    }))).returning({ id: reports.id, publicId: reports.publicId });
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "VERIFIED", "REJECTED", "WITHDRAWN"] as const) await database.db.insert(reports).values({ publicId: `PRIVATE-${status}`, entityId: entity!.id, title: "Private report", chronology: "Private", transactionType: "HACKBACK", status, publishedAt: new Date() });
    const pages = await Promise.all([service.reportDirectory(1), service.reportDirectory(2), service.reportDirectory(3)]);
    assert.deepEqual(pages.map(page => page.items.length), [10, 10, 5]);
    assert.deepEqual(pages.map(page => page.hasNext), [true, true, false]);
    const all = pages.flatMap(page => page.items);
    assert.deepEqual(all.map(row => row.publicId), [...rows].sort((a, b) => b.id - a.id).map(row => row.publicId), "Equal publication times use ID as a stable tie-breaker");
    assert.equal(new Set(all.map(row => row.publicId)).size, 25);
    assert.ok(all.every(row => row.uploadedBy.displayName === "Anggota komunitas"));
    assert.ok(!/Sensitive|sensitive@example|private-hash|PRIVATE-/.test(JSON.stringify(all)));
    assert.deepEqual((await service.recentReports()).map(row => row.publicId), all.slice(0, 3).map(row => row.publicId));
    assert.deepEqual(await service.reportDirectory(4), { items: [], page: 4, hasNext: false });
    const filtered = await service.reportDirectory(1, "laporan 1");
    assert.equal(filtered.items.length, 10); assert.equal(filtered.hasNext, true);
    assert.equal((await service.reportDirectory(2, "laporan 1")).items.length, 1);
    assert.equal((await service.reportDirectory(1, "LIST fixture")).items.length, 10);
    assert.equal((await service.reportDirectory(1, "%")).items.length, 0);
    assert.equal((await service.reportDirectory(1, "_")).items.length, 0);
    assert.equal((await service.reportDirectory(1, "Sensitive private chronology")).items.length, 0);
    assert.equal((await service.reportDirectory(1, "Private report")).items.length, 0);
    await database.db.update(reports).set({ status: "WITHDRAWN" }).where(eq(reports.publicId, "LIST-0"));
    assert.equal((await service.reportDirectory(3)).hasNext, false);
    assert.equal((await service.reportDirectory(3)).items.length, 4);
    await database.db.update(reports).set({ status: "WITHDRAWN" }).where(eq(reports.entityId, entity!.id));
    assert.deepEqual(await service.recentReports(), []);
    assert.deepEqual(await service.reportDirectory(1), { items: [], page: 1, hasNext: false });
  } finally {
    await database?.onModuleDestroy();
    if (created) await control.query(`drop database "${name}"`);
    await control.end();
  }
});

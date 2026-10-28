import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { JwtService } from "@nestjs/jwt";
import { adminRoleSchema, middlemanDirectorySchema } from "@valrify/validation";
import { AdminManagementService } from "../src/admin/admin-management.service";
import { AdminService } from "../src/admin/admin.service";
import { DatabaseService } from "../src/database/database.service";
import { adminLoginChallenges, authSessions, moderationActions, users } from "../src/database/schema";
import { PublicService } from "../src/public/public.service";
import { AuthService } from "../src/auth/auth.service";
import type { EmailService } from "../src/auth/email.service";
import type { EvidenceStorage } from "../src/storage/evidence-storage";

test("admin management preserves access, revokes changed sessions and audits directory publication", { timeout: 30_000 }, async () => {
  const original = process.env.DATABASE_URL;
  const target = new URL(original ?? "postgresql://valrify:valrify_dev@127.0.0.1:5434/valrify");
  assert(["localhost", "127.0.0.1"].includes(target.hostname) && !target.pathname.includes("prod"), "A local non-production database is required");
  const name = `valrify_admin_test_${randomUUID().replaceAll("-", "")}`;
  assert(/^valrify_admin_test_[a-f0-9]{32}$/.test(name));
  const control = new Pool({ connectionString: target.toString() });
  let database: DatabaseService | undefined, created = false;
  try {
    await control.query(`create database "${name}"`); created = true;
    target.pathname = `/${name}`;
    try { process.env.DATABASE_URL = target.toString(); database = new DatabaseService(); }
    finally { if (original === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original; }
    await migrate(database.db, { migrationsFolder: resolve(__dirname, "../drizzle") });
    const management = new AdminManagementService(database), publicService = new PublicService(database, {} as EvidenceStorage);
    const auth = new AuthService(database, new JwtService({ secret: "local-admin-management-test-secret" }), {} as EmailService);
    await database.db.insert(users).values([
      { id: "admin", email: "admin@example.test", displayName: "Admin fixture", role: "ADMIN", emailVerifiedAt: new Date(), passwordHash: "fixture-password-hash" },
      { id: "member", email: "member@example.test", displayName: "Member fixture", role: "USER", emailVerifiedAt: new Date() },
      { id: "unverified", email: "pending@example.test", displayName: "Unverified fixture", role: "USER" },
    ]);
    const change = adminRoleSchema.parse({ role: "USER", expectedRole: "ADMIN", rationale: "Perubahan role fixture untuk pengujian." });
    await assert.rejects(management.changeRole("admin", "admin", change), /admin terakhir/);
    await assert.rejects(management.changeRole("member", "member", { ...change, role: "VERIFIED_MIDDLEMAN", expectedRole: "USER" }), { status: 403 });
    await assert.rejects(management.changeRole("unverified", "admin", { ...change, role: "VERIFIED_MIDDLEMAN", expectedRole: "USER" }), /verifikasi email/);
    await assert.rejects(management.changeRole("member", "admin", { ...change, role: "MODERATOR", expectedRole: "USER" }), /password/);
    const member = (await database.db.query.users.findFirst({ where: eq(users.id, "member") }))!;
    const session = await auth.issueSession(database.db, member);
    await database.db.insert(adminLoginChallenges).values({ userId: "member", tokenHash: "fixture-challenge", expiresAt: new Date(Date.now() + 60_000) });
    const promote = { ...change, role: "VERIFIED_MIDDLEMAN" as const, expectedRole: "USER" as const };
    await management.changeRole("member", "admin", promote);
    await assert.rejects(auth.authenticate(session.token), { status: 401 });
    assert.equal((await database.db.select().from(authSessions).where(eq(authSessions.userId, "member"))).length, 0);
    assert.equal((await database.db.select().from(adminLoginChallenges).where(eq(adminLoginChallenges.userId, "member"))).length, 0);
    await assert.rejects(management.changeRole("member", "admin", promote), { status: 409 });
    const list = await management.userList({ q: "member@example.test", page: 1 });
    assert.equal(list.total, 1); assert.equal(list.rows[0]!.role, "VERIFIED_MIDDLEMAN");
    assert.equal("passwordHash" in list.rows[0]!, false);
    assert.equal((await management.userList({ q: "%", page: 1 })).total, 0);
    assert.equal((await management.userDetail("member")).reportCount, 0);
    assert.equal((await management.userList({ q: "", role: "USER", page: 1 })).total, 1);
    await assert.rejects(management.userDetail("missing"), { status: 404 });
    const input = middlemanDirectorySchema.parse({ displayName: "Rekber fixture", description: "Layanan rekber fixture untuk pengujian direktori.", profileUrl: "https://example.test/profile", contactUrl: "https://example.test/contact", rationale: "Kontak resmi fixture sudah diperiksa." });
    await assert.rejects(management.saveDirectory("member", input), { status: 403 });
    const draft = await management.saveDirectory("admin", input);
    assert.deepEqual(await publicService.middlemen(), []);
    const publish = { ...input, isPublished: true, isSponsored: true, sortOrder: 100 };
    const saved = await management.saveDirectory("admin", publish, draft.id, draft.updatedAt.toISOString());
    await assert.rejects(management.saveDirectory("admin", input, draft.id, draft.updatedAt.toISOString()), { status: 409 });
    const first = await management.saveDirectory("admin", { ...input, displayName: "Rekber urutan pertama", isPublished: true });
    const publicRows = await publicService.middlemen();
    assert.deepEqual(publicRows.map(row => row.id), [first.id, saved.id]);
    assert.equal(publicRows[1]!.isSponsored, true);
    assert.equal("updatedAt" in publicRows[0]!, false);
    assert.equal("rationale" in publicRows[0]!, false);
    await management.saveDirectory("admin", input, saved.id, saved.updatedAt.toISOString());
    assert.deepEqual((await publicService.middlemen()).map(row => row.id), [first.id]);
    const actions = (await management.activity(1)).rows;
    assert.equal(actions.filter(row => row.action === "USER_ROLE_CHANGED").length, 1);
    assert.ok(actions.some(row => row.action === "DIRECTORY_CREATED"));
    assert.ok(actions.some(row => row.action === "DIRECTORY_UPDATED"));
    assert.deepEqual((await new AdminService(database, {} as EvidenceStorage).overview()).recentActions, []);
    await database.db.insert(users).values(Array.from({ length: 26 }, (_, index) => ({ id: `page-${index}`, email: `page-${index}@example.test`, displayName: `Pagination fixture ${index}` })));
    const page1 = await management.userList({ q: "Pagination fixture", page: 1 });
    const page2 = await management.userList({ q: "Pagination fixture", page: 2 });
    assert.equal(page1.total, 26); assert.equal(page1.rows.length, 25); assert.equal(page2.rows.length, 1);
    assert.equal(page1.rows.some(row => row.id === page2.rows[0]!.id), false);
    await database.db.insert(users).values({ id: "admin2", email: "admin2@example.test", displayName: "Second admin fixture", role: "ADMIN", emailVerifiedAt: new Date(), passwordHash: "fixture-password-hash" });
    await assert.rejects(management.changeRole("admin", "admin", change), /sendiri/);
    const concurrent = await Promise.allSettled([management.changeRole("admin2", "admin", change), management.changeRole("admin", "admin2", change)]);
    assert.equal(concurrent.filter(row => row.status === "fulfilled").length, 1);
    const remaining = await database.db.select().from(users).where(eq(users.role, "ADMIN"));
    assert.equal(remaining.length, 1);
    await assert.rejects(management.changeRole(remaining[0]!.id, remaining[0]!.id, change), /admin terakhir/);
    const roleActions = await database.db.select().from(moderationActions).where(eq(moderationActions.action, "USER_ROLE_CHANGED"));
    assert.equal(roleActions.length, 2);
    assert.ok(roleActions.every(row => (row.details as { before: string; after: string }).before !== (row.details as { before: string; after: string }).after));
  } finally {
    await database?.onModuleDestroy();
    if (created) await control.query(`drop database "${name}"`);
    await control.end();
  }
});

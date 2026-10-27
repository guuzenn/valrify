import "../src/load-env";
import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { eq, inArray } from "drizzle-orm";
import { AuthService } from "../src/auth/auth.service";
import type { EmailService } from "../src/auth/email.service";
import { DatabaseService } from "../src/database/database.service";
import { authSessions, passwordResetTokens, users } from "../src/database/schema";
import { registerSchema } from "@valrify/validation";

test("sessions use current roles, isolate owners, and revoke after logout/reset", { timeout: 30_000 }, async () => {
  const database = new DatabaseService();
  const ids = [randomUUID(), randomUUID()];
  const email = `${ids[0]}@valrify.local`;
  const password = "TestSession!2026";
  const jwt = new JwtService({ secret: "integration-only-secret-not-used-by-app", signOptions: { algorithm: "HS256" }, verifyOptions: { algorithms: ["HS256"] } });
  const auth = new AuthService(database, jwt, {} as EmailService);
  try {
    await database.db.insert(users).values(ids.map((id, index) => ({ id, email: `${id}@valrify.local`, displayName: "Session Test", role: index === 0 ? "ADMIN" as const : "USER" as const, passwordHash: null, emailVerifiedAt: new Date() })));
    await database.db.update(users).set({ passwordHash: await hash(password, 4) }).where(eq(users.id, ids[0]!));
    await assert.rejects(() => auth.login({ email, password }));
    const admin = await database.db.query.users.findFirst({ where: eq(users.id, ids[0]!) });
    const first = await auth.issueSession(database.db, admin!, true);
    assert.equal(first.maxAge, 2 * 60 * 60 * 1000);
    const session = await auth.authenticate(first.token);
    assert.equal(session.actor.role, "ADMIN");
    await database.db.update(users).set({ role: "USER" }).where(eq(users.id, ids[0]!));
    assert.equal((await auth.authenticate(first.token)).actor.role, "USER");
    assert.deepEqual((await auth.sessions(ids[1]!, session.id)).sessions, []);
    await assert.rejects(() => auth.revokeSession(ids[1]!, session.id));
    await auth.logout(first.token);
    await assert.rejects(() => auth.authenticate(first.token));
    await assert.rejects(() => auth.authenticate(jwt.sign({ id: ids[0], role: "ADMIN" })));
    const second = await auth.login({ email, password });
    const third = await auth.login({ email, password });
    assert.equal(second.maxAge, 7 * 24 * 60 * 60 * 1000);
    const resetToken = "a".repeat(64);
    await database.db.insert(passwordResetTokens).values({ userId: ids[0]!, tokenHash: createHash("sha256").update(resetToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000) });
    await auth.resetPassword({ token: resetToken, password: "NewPassword!2026" });
    for (const token of [second.token, third.token]) await assert.rejects(() => auth.authenticate(token));
    await assert.rejects(() => auth.resetPassword({ token: resetToken, password }));
    await assert.rejects(() => auth.login({ email, password }));
    const fourth = await auth.login({ email, password: "NewPassword!2026" });
    const fourthSession = await auth.authenticate(fourth.token);
    await database.db.update(authSessions).set({ expiresAt: new Date(0) }).where(eq(authSessions.id, fourthSession.id));
    await assert.rejects(() => auth.authenticate(fourth.token));
  } finally {
    await database.db.delete(passwordResetTokens).where(inArray(passwordResetTokens.userId, ids));
    await database.db.delete(users).where(inArray(users.id, ids));
    await database.onModuleDestroy();
  }
});

test("Google accounts keep a stable subject and never auto-link an existing email", async () => {
  const database = new DatabaseService();
  const subject = randomUUID();
  const existingId = randomUUID();
  const email = `${randomUUID()}@gmail.com`;
  const existingEmail = `${randomUUID()}@gmail.com`;
  const auth = new AuthService(database, new JwtService({ secret: "google-integration-test" }), {} as EmailService);
  const createdIds: string[] = [existingId];
  try {
    await database.db.insert(users).values({ id: existingId, email: existingEmail, displayName: "Existing admin", role: "ADMIN", emailVerifiedAt: new Date() });
    await assert.rejects(() => auth.googleLogin({ subject, email: existingEmail, displayName: "Google user" }), /Masuk dengan password/);
    const results = await Promise.all([1, 2].map(() => auth.googleLogin({ subject, email, displayName: "Google user" })));
    createdIds.push(results[0]!.actor.id);
    assert.equal(results[0]!.actor.id, results[1]!.actor.id);
    assert.equal(results[0]!.actor.role, "USER");
    assert.equal(results[0]!.actor.emailVerified, true);
    assert.equal((await auth.authenticate(results[0]!.token)).actor.id, results[0]!.actor.id);
    const returning = await auth.googleLogin({ subject, email: existingEmail, displayName: "Changed Google name" });
    assert.equal(returning.actor.id, results[0]!.actor.id);
    assert.equal(returning.actor.email, email);
    assert.equal(returning.actor.role, "USER");
    await auth.logout(returning.token);
    await assert.rejects(() => auth.authenticate(returning.token));
    assert.equal((await database.db.query.users.findFirst({ where: eq(users.id, existingId) }))!.googleSubject, null);
  } finally {
    await database.db.delete(users).where(inArray(users.id, createdIds));
    await database.onModuleDestroy();
  }
});

test("registration reserves a normalized unique username and starts its cooldown", async () => {
  const database = new DatabaseService();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
  const email = `${suffix}@example.com`;
  const duplicateEmail = `other-${suffix}@example.com`;
  const username = `user_${suffix}`;
  const emailService = { send: async () => true, isConfigured: () => true } as unknown as EmailService;
  const auth = new AuthService(database, new JwtService({ secret: "registration-test" }), emailService);
  try {
    const input = registerSchema.parse({ email, username: username.toUpperCase(), password: "Password!2026" });
    await auth.register(input);
    const user = await database.db.query.users.findFirst({ where: eq(users.email, email) });
    assert.equal(user?.username, username);
    assert.equal(user?.displayName, username);
    assert.ok(user?.usernameChangedAt);
    assert.equal(user?.emailVerifiedAt, null);
    await assert.rejects(() => auth.register({ ...input, email: duplicateEmail }), /username sudah digunakan/);
    assert.equal(await database.db.query.users.findFirst({ where: eq(users.email, duplicateEmail) }), undefined);
  } finally {
    await database.db.delete(users).where(inArray(users.email, [email, duplicateEmail]));
    await database.onModuleDestroy();
  }
});

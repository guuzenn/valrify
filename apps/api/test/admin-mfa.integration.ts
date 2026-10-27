import "../src/load-env";
import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { eq, inArray } from "drizzle-orm";
import { DatabaseService } from "../src/database/database.service";
import { adminLoginChallenges, adminMfa, authSessions, passwordResetTokens, users } from "../src/database/schema";
import { AuthService } from "../src/auth/auth.service";
import { AdminMfaService } from "../src/auth/admin-mfa.service";
import { authenticator, decryptMfaSecret, hashMfaToken } from "../src/auth/admin-mfa.crypto";
import type { EmailService } from "../src/auth/email.service";

test("admin MFA blocks bypasses, enrolls once, rejects replay and recovers with one-use codes", { timeout: 30_000 }, async () => {
  const oldKey = process.env.MFA_ENCRYPTION_KEY, oldSlug = process.env.ADMIN_LOGIN_SLUG;
  process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const entry = process.env.ADMIN_LOGIN_SLUG = "mgmt-" + randomBytes(12).toString("hex");
  const database = new DatabaseService();
  const jwt = new JwtService({ secret: "mfa-integration-test-only" });
  const auth = new AuthService(database, jwt, {} as EmailService);
  const mfa = new AdminMfaService(database, auth);
  const id = randomUUID(), otherId = randomUUID(), email = `${id}@example.com`, password = "MfaPassword!2026";
  try {
    await database.db.insert(users).values([
      { id, email, displayName: "MFA test", role: "ADMIN", googleSubject: id, passwordHash: await hash(password, 4), emailVerifiedAt: new Date() },
      { id: otherId, email: `${otherId}@example.com`, displayName: "User", passwordHash: await hash(password, 4), emailVerifiedAt: new Date() },
    ]);
    const input = { email, password };
    for (const token of [undefined, null, {}, ["a".repeat(64)], ""]) await assert.rejects(() => mfa.setup(token));
    await assert.rejects(() => auth.login(input));
    await assert.rejects(() => auth.googleLogin({ subject: id, email, displayName: "MFA test" }));
    await assert.rejects(() => mfa.login("wrong", email, password));
    await assert.rejects(() => mfa.login(entry, `${otherId}@example.com`, password));
    const cancelled = await mfa.login(entry, email, password);
    await auth.logout(undefined, cancelled.token);
    await assert.rejects(() => mfa.setup(cancelled.token));
    const legacyId = randomUUID();
    await database.db.insert(authSessions).values({ id: legacyId, userId: id, expiresAt: new Date(Date.now() + 60_000) });
    await assert.rejects(() => auth.authenticate(jwt.sign({ sub: id, sid: legacyId })));
    const first = await mfa.login(entry, email, password);
    assert.equal(first.enrollmentRequired, true);
    assert.equal((await database.db.select().from(authSessions).where(eq(authSessions.userId, id))).length, 1);
    await assert.rejects(() => auth.authenticate(first.token));
    const setup = await mfa.setup(first.token);
    assert.ok(setup.qrCode.startsWith("data:image/png;base64,"));
    assert.equal((await mfa.setup(first.token)).secret, setup.secret);
    const pending = await database.db.query.adminLoginChallenges.findFirst({ where: eq(adminLoginChallenges.tokenHash, hashMfaToken(first.token)) });
    assert.ok(!pending!.setupSecret!.includes(setup.secret));
    const enrolled = await mfa.verify(first.token, authenticator(setup.secret, email).generate());
    assert.ok("session" in enrolled && enrolled.recoveryCodes?.length === 8);
    if (!("session" in enrolled) || !enrolled.recoveryCodes) throw new Error("Enrollment failed");
    const oldRecoveryCode = enrolled.recoveryCodes[0]!;
    assert.equal((await auth.authenticate(enrolled.session.token)).actor.id, id);
    await assert.rejects(() => mfa.verify(first.token, authenticator(setup.secret, email).generate()));
    const record = await database.db.query.adminMfa.findFirst({ where: eq(adminMfa.userId, id) });
    assert.equal(decryptMfaSecret(record!.secret, id), setup.secret);
    assert.ok(!record!.recoveryHashes.includes(enrolled.recoveryCodes[0]!));

    const second = await mfa.login(entry, email, password);
    assert.equal(second.enrollmentRequired, false);
    await assert.rejects(() => mfa.setup(second.token));
    await assert.rejects(() => mfa.verify(second.token, authenticator(setup.secret, email).generate({ timestamp: record!.lastUsedStep * 30_000 })));
    const recovered = await mfa.verify(second.token, oldRecoveryCode);
    assert.deepEqual(recovered, { enrollmentRequired: true });
    await assert.rejects(() => auth.authenticate(enrolled.session.token));
    const newSetup = await mfa.setup(second.token);
    assert.notEqual(newSetup.secret, setup.secret);
    const replaced = await mfa.verify(second.token, authenticator(newSetup.secret, email).generate());
    assert.ok("session" in replaced && replaced.recoveryCodes?.length === 8);
    if (!("session" in replaced)) throw new Error("Recovery failed");
    assert.equal((await auth.authenticate(replaced.session.token)).actor.id, id);
    const normalLogin = await auth.login({ email: `${otherId}@example.com`, password });
    await database.db.update(users).set({ role: "MODERATOR" }).where(eq(users.id, otherId));
    await assert.rejects(() => auth.authenticate(normalLogin.token));
    await database.db.update(users).set({ role: "USER" }).where(eq(users.id, otherId));

    // Two requests using the same OTP cannot create two authenticated sessions.
    const raceA = await mfa.login(entry, email, password);
    const raceB = await mfa.login(entry, email, password);
    await database.db.update(adminMfa).set({ lastUsedStep: -1 }).where(eq(adminMfa.userId, id));
    const raceCode = authenticator(newSetup.secret, email).generate();
    const raced = await Promise.allSettled([mfa.verify(raceA.token, raceCode), mfa.verify(raceB.token, raceCode)]);
    assert.equal(raced.filter(value => value.status === "fulfilled").length, 1);
    assert.equal(raced.filter(value => value.status === "rejected").length, 1);
    const third = await mfa.login(entry, email, password);
    await assert.rejects(() => mfa.verify(third.token, oldRecoveryCode));

    // A reset invalidates primary-factor challenges but retains the enrolled second factor.
    const resetToken = "c".repeat(64);
    await database.db.insert(passwordResetTokens).values({ userId: id, tokenHash: createHash("sha256").update(resetToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000) });
    await auth.resetPassword({ token: resetToken, password: "NewMfaPassword!2026" });
    await assert.rejects(() => mfa.setup(third.token));
    await assert.rejects(() => auth.authenticate(replaced.session.token));
    assert.ok(await database.db.query.adminMfa.findFirst({ where: eq(adminMfa.userId, id) }));
    const newLogin = await mfa.login(entry, email, "NewMfaPassword!2026");
    await database.db.update(adminLoginChallenges).set({ expiresAt: new Date(0) }).where(eq(adminLoginChallenges.tokenHash, hashMfaToken(newLogin.token)));
    await assert.rejects(() => mfa.verify(newLogin.token, "000000"));

    // The per-account attempt budget survives starting a new password challenge.
    const limited = await mfa.login(entry, email, "NewMfaPassword!2026");
    for (let i = 0; i < 5; i++) await assert.rejects(() => mfa.verify(limited.token, "invalid"));
    const another = await mfa.login(entry, email, "NewMfaPassword!2026");
    await assert.rejects(() => mfa.setup(another.token));
    const rows = await database.db.select().from(adminLoginChallenges).where(eq(adminLoginChallenges.userId, id));
    assert.equal(rows.reduce((sum, row) => sum + row.attempts, 0), 5);
  } finally {
    await database.db.delete(users).where(inArray(users.id, [id, otherId]));
    await database.onModuleDestroy();
    if (oldKey === undefined) delete process.env.MFA_ENCRYPTION_KEY; else process.env.MFA_ENCRYPTION_KEY = oldKey;
    if (oldSlug === undefined) delete process.env.ADMIN_LOGIN_SLUG; else process.env.ADMIN_LOGIN_SLUG = oldSlug;
  }
});

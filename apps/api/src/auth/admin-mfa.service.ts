import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { compare } from "bcryptjs";
import { and, eq, gt, lte, ne, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { Secret } from "otpauth";
import { toDataURL } from "qrcode";
import { DatabaseService } from "../database/database.service";
import { adminLoginChallenges, adminMfa, authSessions, users } from "../database/schema";
import { AuthService } from "./auth.service";
import { isDemoAccount } from "./auth.config";
import { adminLoginSlug, authenticator, decryptMfaSecret, encryptMfaSecret, hashMfaToken, isPrivileged, validateTotp } from "./admin-mfa.crypto";

type Transaction = Parameters<Parameters<DatabaseService["db"]["transaction"]>[0]>[0];
type Verification = { error: true } | { enrollmentRequired: true } | { session: Awaited<ReturnType<AuthService["issueSession"]>>; recoveryCodes?: string[] };

@Injectable()
export class AdminMfaService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  requireEntry(entry: string) {
    if (!adminLoginSlug() || entry !== adminLoginSlug()) throw new NotFoundException();
  }

  async login(entry: string, email: string, password: string) {
    this.requireEntry(entry);
    return this.database.db.transaction(async tx => {
      const [user] = await tx.select().from(users).where(eq(users.email, email.toLowerCase())).for("update");
      if (!user?.passwordHash || !await compare(password, user.passwordHash) || !isPrivileged(user.role) || !user.emailVerifiedAt || (process.env.NODE_ENV === "production" && isDemoAccount(user))) throw new UnauthorizedException("Email atau password salah.");
      // Validate the encryption key before starting a challenge, even for an existing enrollment.
      encryptMfaSecret("configuration-check", user.id);
      await tx.delete(adminLoginChallenges).where(and(eq(adminLoginChallenges.userId, user.id), lte(adminLoginChallenges.expiresAt, new Date())));
      const [enrollment] = await tx.select().from(adminMfa).where(eq(adminMfa.userId, user.id));
      const token = randomBytes(32).toString("hex");
      await tx.insert(adminLoginChallenges).values({ tokenHash: hashMfaToken(token), userId: user.id, expiresAt: new Date(Date.now() + 5 * 60_000) });
      return { token, enrollmentRequired: !enrollment };
    });
  }

  private async challenge(tx: Transaction, token: unknown) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException("Login admin kedaluwarsa. Mulai lagi.");
    const [candidate] = await tx.select().from(adminLoginChallenges).where(eq(adminLoginChallenges.tokenHash, hashMfaToken(token)));
    if (!candidate) throw new UnauthorizedException("Login admin kedaluwarsa. Mulai lagi.");
    // Lock the user first in every flow to serialize enrollment, OTP replay checks and recovery.
    const [user] = await tx.select().from(users).where(eq(users.id, candidate.userId)).for("update");
    const [challenge] = await tx.select().from(adminLoginChallenges).where(and(eq(adminLoginChallenges.tokenHash, candidate.tokenHash), gt(adminLoginChallenges.expiresAt, new Date()))).for("update");
    if (!user || !challenge || !isPrivileged(user.role) || !user.emailVerifiedAt || (process.env.NODE_ENV === "production" && isDemoAccount(user))) throw new UnauthorizedException("Login admin kedaluwarsa. Mulai lagi.");
    const [budget] = await tx.select({ attempts: sql<number>`coalesce(sum(${adminLoginChallenges.attempts}), 0)::integer` }).from(adminLoginChallenges).where(and(eq(adminLoginChallenges.userId, user.id), gt(adminLoginChallenges.expiresAt, new Date())));
    return { user, challenge, exhausted: (budget?.attempts ?? 0) >= 5 };
  }

  async setup(token: unknown) {
    const data = await this.database.db.transaction(async tx => {
      const { user, challenge, exhausted } = await this.challenge(tx, token);
      if (exhausted) throw new UnauthorizedException("Terlalu banyak percobaan. Tunggu lima menit lalu mulai lagi.");
      const [enrollment] = await tx.select().from(adminMfa).where(eq(adminMfa.userId, user.id));
      if (enrollment && !challenge.setupSecret) throw new UnauthorizedException("Authenticator sudah aktif. Masukkan kode atau recovery code.");
      const secret = challenge.setupSecret ? decryptMfaSecret(challenge.setupSecret, user.id) : new Secret({ size: 20 }).base32;
      if (!challenge.setupSecret) await tx.update(adminLoginChallenges).set({ setupSecret: encryptMfaSecret(secret, user.id) }).where(eq(adminLoginChallenges.tokenHash, challenge.tokenHash));
      return { secret, uri: authenticator(secret, user.email).toString() };
    });
    return { secret: data.secret, qrCode: await toDataURL(data.uri, { width: 240, margin: 2 }) };
  }

  async verify(token: unknown, code: string) {
    const result = await this.database.db.transaction(async (tx): Promise<Verification> => {
      const { user, challenge, exhausted } = await this.challenge(tx, token);
      if (exhausted) return { error: true };
      // Return failures from the transaction so the attempt counter is committed.
      await tx.update(adminLoginChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(adminLoginChallenges.tokenHash, challenge.tokenHash));
      const [enrollment] = await tx.select().from(adminMfa).where(eq(adminMfa.userId, user.id));
      const normalized = code.replace(/[\s-]/g, "").toLowerCase();
      const recoveryHash = hashMfaToken(`${user.id}:${normalized}`);
      if (!challenge.setupSecret && enrollment && /^[a-f0-9]{32}$/.test(normalized) && enrollment.recoveryHashes.includes(recoveryHash)) {
        await tx.update(adminMfa).set({ recoveryHashes: enrollment.recoveryHashes.filter(value => value !== recoveryHash) }).where(eq(adminMfa.userId, user.id));
        await tx.delete(authSessions).where(eq(authSessions.userId, user.id));
        await tx.delete(adminLoginChallenges).where(and(eq(adminLoginChallenges.userId, user.id), ne(adminLoginChallenges.tokenHash, challenge.tokenHash)));
        await tx.update(adminLoginChallenges).set({ setupSecret: encryptMfaSecret(new Secret({ size: 20 }).base32, user.id) }).where(eq(adminLoginChallenges.tokenHash, challenge.tokenHash));
        return { enrollmentRequired: true };
      }
      const encrypted = challenge.setupSecret ?? enrollment?.secret;
      if (!encrypted) return { error: true };
      const step = validateTotp(decryptMfaSecret(encrypted, user.id), code.trim(), challenge.setupSecret ? -1 : enrollment!.lastUsedStep);
      if (step === null) return { error: true };
      let recoveryCodes: string[] | undefined;
      if (challenge.setupSecret) {
        recoveryCodes = Array.from({ length: 8 }, () => randomBytes(16).toString("hex").match(/.{8}/g)!.join("-"));
        const values = { secret: challenge.setupSecret, lastUsedStep: step, recoveryHashes: recoveryCodes.map(value => hashMfaToken(`${user.id}:${value.replaceAll("-", "")}`)) };
        await tx.insert(adminMfa).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: adminMfa.userId, set: values });
        await tx.delete(authSessions).where(eq(authSessions.userId, user.id));
      } else {
        await tx.update(adminMfa).set({ lastUsedStep: step }).where(eq(adminMfa.userId, user.id));
      }
      await tx.delete(adminLoginChallenges).where(eq(adminLoginChallenges.userId, user.id));
      return { session: await this.auth.issueSession(tx, user, true), ...(recoveryCodes ? { recoveryCodes } : {}) };
    });
    if ("error" in result) throw new UnauthorizedException("Kode tidak valid, sudah dipakai, atau batas percobaan tercapai. Tunggu kode baru; setelah lima percobaan tunggu lima menit.");
    return result;
  }
}

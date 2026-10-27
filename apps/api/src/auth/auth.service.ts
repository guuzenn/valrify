import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { EmailRequestInput, LoginInput, RegisterInput, ResetPasswordInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import { authSessions, emailVerificationTokens, passwordResetTokens, users } from "../database/schema";
import type { AuthActor } from "./auth.types";
import { EmailService } from "./email.service";
import { isDemoAccount } from "./auth.config";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("hex");

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService, private readonly jwt: JwtService, private readonly email: EmailService) {}

  private async createVerificationToken(userId: string) {
    const token = newToken();
    await this.database.db.transaction(async (tx) => {
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
      await tx.insert(emailVerificationTokens).values({ userId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    });
    return token;
  }

  private async deliverAuthEmail(input: { to: string; displayName: string; token: string; kind: "verification" | "password-reset" }) {
    try {
      return await this.email.send(input);
    } catch (error) {
      this.email.reportFailure(`Gagal mengirim email ${input.kind}`, error);
      return false;
    }
  }

  async register(input: RegisterInput) {
    const email = input.email.toLowerCase();
    const existing = await this.database.db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) throw new BadRequestException("Email sudah terdaftar.");
    const id = randomUUID();
    const passwordHash = await hash(input.password, 12);
    try {
      await this.database.db.insert(users).values({ id, email, username: input.username, usernameChangedAt: new Date(), displayName: input.username, passwordHash });
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string } };
      if (databaseError.code === "23505" || databaseError.cause?.code === "23505") throw new BadRequestException("Email atau username sudah digunakan.");
      throw error;
    }
    const token = await this.createVerificationToken(id);
    const emailSent = await this.deliverAuthEmail({ to: email, displayName: input.username, token, kind: "verification" });
    return {
      message: emailSent ? "Akun dibuat. Cek email untuk menyelesaikan verifikasi." : "Akun dibuat, tetapi email verifikasi belum dapat dikirim. Coba kirim ulang dari halaman verifikasi.",
      emailSent,
      ...(!this.email.isConfigured() && process.env.NODE_ENV !== "production" ? { developmentVerificationToken: token } : {}),
    };
  }

  async resendVerification(input: EmailRequestInput) {
    const user = await this.database.db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase()) });
    if (user && !user.emailVerifiedAt) {
      const token = await this.createVerificationToken(user.id);
      await this.deliverAuthEmail({ to: user.email, displayName: user.displayName, token, kind: "verification" });
      return {
        message: "Jika akun belum terverifikasi, email baru sudah kami kirim.",
        ...(!this.email.isConfigured() && process.env.NODE_ENV !== "production" ? { developmentVerificationToken: token } : {}),
      };
    }
    return { message: "Jika akun belum terverifikasi, email baru sudah kami kirim." };
  }

  async verifyEmail(token: string) {
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx.delete(emailVerificationTokens).where(and(eq(emailVerificationTokens.tokenHash, tokenHash(token)), gt(emailVerificationTokens.expiresAt, new Date()))).returning({ userId: emailVerificationTokens.userId });
      if (!row) throw new BadRequestException("Tautan verifikasi tidak valid atau sudah kedaluwarsa.");
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, row.userId));
      return { ok: true, message: "Email berhasil diverifikasi. Silakan masuk." };
    });
  }

  async requestPasswordReset(input: EmailRequestInput) {
    const user = await this.database.db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase()) });
    if (user?.passwordHash) {
      const token = newToken();
      await this.database.db.transaction(async (tx) => {
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
        await tx.insert(passwordResetTokens).values({ userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
      });
      await this.deliverAuthEmail({ to: user.email, displayName: user.displayName, token, kind: "password-reset" });
      return {
        message: "Jika email terdaftar, tautan reset password sudah kami kirim.",
        ...(!this.email.isConfigured() && process.env.NODE_ENV !== "production" ? { developmentResetToken: token } : {}),
      };
    }
    return { message: "Jika email terdaftar, tautan reset password sudah kami kirim." };
  }

  async resetPassword(input: ResetPasswordInput) {
    const passwordHash = await hash(input.password, 12);
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx.delete(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash(input.token)), gt(passwordResetTokens.expiresAt, new Date()))).returning({ userId: passwordResetTokens.userId });
      if (!row) throw new BadRequestException("Tautan reset password tidak valid atau sudah kedaluwarsa.");
      await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
      await tx.delete(authSessions).where(eq(authSessions.userId, row.userId));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));
      return { ok: true, message: "Password berhasil diganti. Silakan masuk kembali." };
    });
  }

  async login(input: LoginInput) {
    return this.database.db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.email, input.email.toLowerCase())).for("update");
      if (!user?.passwordHash || !(await compare(input.password, user.passwordHash))) throw new UnauthorizedException("Email atau password salah.");
      if (process.env.NODE_ENV === "production" && isDemoAccount(user)) throw new UnauthorizedException("Akun demo tidak dapat dipakai di production.");
      if (!user.emailVerifiedAt) throw new UnauthorizedException("Verifikasi email terlebih dahulu.");
      return this.issueSession(tx, user);
    });
  }

  private async issueSession(tx: Pick<typeof this.database.db, "insert" | "delete">, user: typeof users.$inferSelect) {
      const actor: AuthActor = { id: user.id, email: user.email, displayName: user.displayName, role: user.role, emailVerified: true };
      const maxAge = (actor.role === "ADMIN" || actor.role === "MODERATOR" ? 2 * 60 * 60 : 7 * 24 * 60 * 60) * 1000;
      const sessionId = randomUUID();
      // ponytail: expired sessions are pruned on login; schedule pruning if dormant accounts accumulate.
      await tx.delete(authSessions).where(and(eq(authSessions.userId, user.id), lte(authSessions.expiresAt, new Date())));
      await tx.insert(authSessions).values({ id: sessionId, userId: user.id, expiresAt: new Date(Date.now() + maxAge) });
      return { actor, maxAge, token: await this.jwt.signAsync({ sub: user.id, sid: sessionId }, { expiresIn: maxAge / 1000 }) };
  }

  async googleLogin(profile: { subject: string; email: string; displayName: string }) {
    return this.database.db.transaction(async (tx) => {
      await tx.insert(users).values({ id: randomUUID(), googleSubject: profile.subject, email: profile.email, displayName: profile.displayName, emailVerifiedAt: new Date() }).onConflictDoNothing();
      const [user] = await tx.select().from(users).where(eq(users.googleSubject, profile.subject)).for("update");
      // Email alone must never link a Google identity to an existing account.
      if (!user) throw new BadRequestException("Email sudah terdaftar. Masuk dengan password akun Valrify kamu.");
      if (process.env.NODE_ENV === "production" && isDemoAccount(user)) throw new UnauthorizedException("Akun demo tidak dapat dipakai di production.");
      return this.issueSession(tx, user);
    });
  }

  private async sessionClaims(token: string) {
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; sid: string }>(token);
      if (typeof claims.sub !== "string" || typeof claims.sid !== "string") throw new Error("Missing session");
      return claims;
    } catch { throw new UnauthorizedException("Sesi tidak valid. Silakan masuk kembali."); }
  }

  async authenticate(token: string) {
    const claims = await this.sessionClaims(token);
    const session = await this.database.db.query.authSessions.findFirst({ where: and(eq(authSessions.id, claims.sid), eq(authSessions.userId, claims.sub), gt(authSessions.expiresAt, new Date())) });
    const actor = session ? await this.actor(claims.sub) : null;
    if (!session || !actor?.emailVerified) throw new UnauthorizedException("Sesi berakhir. Silakan masuk kembali.");
    if (process.env.NODE_ENV === "production" && isDemoAccount(actor)) throw new UnauthorizedException("Akun demo tidak dapat dipakai di production.");
    if (["ADMIN", "MODERATOR"].includes(actor.role) && session.createdAt.getTime() + 2 * 60 * 60 * 1000 <= Date.now()) throw new UnauthorizedException("Sesi admin berakhir. Silakan masuk kembali.");
    return { id: session.id, actor };
  }

  async logout(token?: string) {
    if (!token) return;
    let claims;
    try { claims = await this.sessionClaims(token); } catch { return; }
    await this.database.db.delete(authSessions).where(and(eq(authSessions.id, claims.sid), eq(authSessions.userId, claims.sub)));
  }

  async sessions(userId: string, currentId: string) {
    const rows = await this.database.db.select({ id: authSessions.id, createdAt: authSessions.createdAt, expiresAt: authSessions.expiresAt }).from(authSessions).where(and(eq(authSessions.userId, userId), gt(authSessions.expiresAt, new Date()))).orderBy(desc(authSessions.createdAt));
    return { sessions: rows.map((row) => ({ ...row, current: row.id === currentId })) };
  }

  async revokeSession(userId: string, sessionId: string) {
    const rows = await this.database.db.delete(authSessions).where(and(eq(authSessions.userId, userId), eq(authSessions.id, sessionId))).returning({ id: authSessions.id });
    if (!rows.length) throw new NotFoundException("Sesi tidak ditemukan.");
    return { ok: true };
  }

  async actor(userId: string) {
    const user = await this.database.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return null;
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, emailVerified: Boolean(user.emailVerifiedAt) } satisfies AuthActor;
  }
}

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, gt } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { EmailRequestInput, LoginInput, RegisterInput, ResetPasswordInput } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import { emailVerificationTokens, passwordResetTokens, users } from "../database/schema";
import type { AuthActor } from "./auth.types";
import { EmailService } from "./email.service";

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
    await this.database.db.insert(users).values({ id, email, displayName: input.displayName, passwordHash });
    const token = await this.createVerificationToken(id);
    const emailSent = await this.deliverAuthEmail({ to: email, displayName: input.displayName, token, kind: "verification" });
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
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));
      return { ok: true, message: "Password berhasil diganti. Silakan masuk kembali." };
    });
  }

  async login(input: LoginInput) {
    const user = await this.database.db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase()) });
    if (!user?.passwordHash || !(await compare(input.password, user.passwordHash))) throw new UnauthorizedException("Email atau password salah.");
    if (!user.emailVerifiedAt) throw new UnauthorizedException("Verifikasi email terlebih dahulu.");
    const actor: AuthActor = { id: user.id, email: user.email, displayName: user.displayName, role: user.role, emailVerified: true };
    return { actor, token: await this.jwt.signAsync(actor) };
  }

  async actor(userId: string) {
    const user = await this.database.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return null;
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, emailVerified: Boolean(user.emailVerifiedAt) } satisfies AuthActor;
  }
}

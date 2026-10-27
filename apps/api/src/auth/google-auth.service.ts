import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const flowSchema = z.object({ purpose: z.literal("google-login"), state: z.string().length(64), nonce: z.string().length(64), verifier: z.string().min(43) });
const profileSchema = z.object({ sub: z.string().min(1).max(255), email: z.email(), email_verified: z.literal(true), name: z.string().optional() });

@Injectable()
export class GoogleAuthService {
  constructor(private readonly jwt: JwtService) {}

  appUrl() {
    const url = new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000");
    if (url.origin !== url.href.replace(/\/$/, "") || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost"))) throw new Error("PUBLIC_APP_URL OAuth harus berupa origin HTTPS atau localhost development.");
    return url.origin;
  }

  private client() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) throw new ServiceUnavailableException("Login Google belum dikonfigurasi.");
    return new OAuth2Client({ clientId, clientSecret, redirectUri: `${this.appUrl()}/api/auth/google/callback` });
  }

  async start() {
    const client = this.client();
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(32).toString("hex");
    const cookie = await this.jwt.signAsync({ purpose: "google-login", state, nonce, verifier: codeVerifier }, { expiresIn: 600, audience: "google-login" });
    const url = client.generateAuthUrl({ scope: ["openid", "email", "profile"], state, nonce, code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256, prompt: "select_account" });
    return { cookie, url };
  }

  async validateFlow(cookie: unknown, state: unknown) {
    try {
      if (typeof cookie !== "string" || typeof state !== "string") throw new Error("Missing state");
      const flow = flowSchema.parse(await this.jwt.verifyAsync(cookie, { audience: "google-login" }));
      if (flow.state !== state) throw new Error("Invalid state");
      return flow;
    } catch { throw new UnauthorizedException("Sesi login Google berakhir. Silakan coba lagi."); }
  }

  async profile(cookie: unknown, state: unknown, code: unknown) {
    const flow = await this.validateFlow(cookie, state);
    if (typeof code !== "string" || !code || code.length > 4096) throw new UnauthorizedException("Kode Google tidak valid.");
    const client = this.client();
    const { tokens } = await client.getToken({ code, codeVerifier: flow.verifier });
    if (!tokens.id_token) throw new UnauthorizedException("Identitas Google tidak tersedia.");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID!.trim() });
    const payload = ticket.getPayload();
    if (!payload || payload.nonce !== flow.nonce) throw new UnauthorizedException("Identitas Google tidak valid.");
    const profile = profileSchema.parse(payload);
    return { subject: profile.sub, email: profile.email.toLowerCase(), displayName: profile.name?.trim().slice(0, 80) || "Pengguna Google" };
  }
}

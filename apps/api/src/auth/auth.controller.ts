import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { emailRequestSchema, loginSchema, registerSchema, resetPasswordSchema, tokenSchema } from "@valrify/validation";
import { RATE_LIMITS } from "../rate-limit.config";
import { parseSchema } from "../validation/parse-schema";
import { AuthService } from "./auth.service";
import { CurrentActor } from "./current-actor";
import { JwtAuthGuard, type AuthenticatedRequest } from "./jwt-auth.guard";
import type { AuthActor } from "./auth.types";
import { GoogleAuthService } from "./google-auth.service";
import { TurnstileService } from "./turnstile.service";

const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge });

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly google: GoogleAuthService, private readonly turnstile: TurnstileService) {}

  @Get("google")
  @Throttle({ default: RATE_LIMITS.login })
  async googleStart(@Res() response: Response) {
    try {
      const result = await this.google.start();
      response.cookie("valrify_google_flow", result.cookie, cookieOptions(10 * 60 * 1000));
      response.redirect(result.url);
    } catch {
      response.redirect(`${this.google.appUrl()}/login?google_error=unavailable`);
    }
  }

  @Get("google/callback")
  @Throttle({ default: RATE_LIMITS.tokenAction })
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    response.clearCookie("valrify_google_flow", { path: "/" });
    try {
      const profile = await this.google.profile(request.cookies?.valrify_google_flow, request.query.state, request.query.code);
      const result = await this.auth.googleLogin(profile);
      response.cookie("valrify_session", result.token, cookieOptions(result.maxAge));
      response.redirect(`${this.google.appUrl()}${["ADMIN", "MODERATOR"].includes(result.actor.role) ? "/admin/reports" : "/account"}`);
    } catch (error) {
      const reason = error instanceof BadRequestException ? "existing_account" : "failed";
      response.redirect(`${this.google.appUrl()}/login?google_error=${reason}`);
    }
  }

  @Post("register")
  @Throttle({ default: RATE_LIMITS.register })
  async register(@Body() body: unknown, @Body("turnstileToken") token: unknown) {
    const input = parseSchema(registerSchema, body);
    await this.turnstile.verify(token, "register");
    return this.auth.register(input);
  }

  @Post("verify-email")
  @Throttle({ default: RATE_LIMITS.tokenAction })
  verify(@Body() body: unknown) { return this.auth.verifyEmail(parseSchema(tokenSchema, body).token); }

  @Post("resend-verification")
  @HttpCode(200)
  @Throttle({ default: RATE_LIMITS.emailRequest })
  async resendVerification(@Body() body: unknown, @Body("turnstileToken") token: unknown) {
    const input = parseSchema(emailRequestSchema, body);
    await this.turnstile.verify(token, "resend-verification");
    return this.auth.resendVerification(input);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: RATE_LIMITS.emailRequest })
  async forgotPassword(@Body() body: unknown, @Body("turnstileToken") token: unknown) {
    const input = parseSchema(emailRequestSchema, body);
    await this.turnstile.verify(token, "forgot-password");
    return this.auth.requestPasswordReset(input);
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: RATE_LIMITS.tokenAction })
  resetPassword(@Body() body: unknown) { return this.auth.resetPassword(parseSchema(resetPasswordSchema, body)); }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: RATE_LIMITS.login })
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(parseSchema(loginSchema, body));
    response.cookie("valrify_session", result.token, cookieOptions(result.maxAge));
    return { user: result.actor };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.valrify_session ?? request.headers.authorization?.replace(/^Bearer /, ""));
    response.clearCookie("valrify_session", { path: "/" });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentActor() actor: AuthActor, @Req() _request: Request) { return { user: actor }; }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  sessions(@Req() request: AuthenticatedRequest) { return this.auth.sessions(request.user.id, request.authSessionId); }

  @Delete("sessions/:id")
  @UseGuards(JwtAuthGuard)
  async revoke(@Param("id", new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.revokeSession(request.user.id, id);
    if (id === request.authSessionId) response.clearCookie("valrify_session", { path: "/" });
    return result;
  }
}

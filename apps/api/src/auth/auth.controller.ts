import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { emailRequestSchema, loginSchema, registerSchema, resetPasswordSchema, tokenSchema } from "@valrify/validation";
import { RATE_LIMITS } from "../rate-limit.config";
import { parseSchema } from "../validation/parse-schema";
import { AuthService } from "./auth.service";
import { CurrentActor } from "./current-actor";
import { JwtAuthGuard, type AuthenticatedRequest } from "./jwt-auth.guard";
import type { AuthActor } from "./auth.types";

const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge });

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @Throttle({ default: RATE_LIMITS.register })
  register(@Body() body: unknown) { return this.auth.register(parseSchema(registerSchema, body)); }

  @Post("verify-email")
  @Throttle({ default: RATE_LIMITS.tokenAction })
  verify(@Body() body: unknown) { return this.auth.verifyEmail(parseSchema(tokenSchema, body).token); }

  @Post("resend-verification")
  @HttpCode(200)
  @Throttle({ default: RATE_LIMITS.emailRequest })
  resendVerification(@Body() body: unknown) { return this.auth.resendVerification(parseSchema(emailRequestSchema, body)); }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: RATE_LIMITS.emailRequest })
  forgotPassword(@Body() body: unknown) { return this.auth.requestPasswordReset(parseSchema(emailRequestSchema, body)); }

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

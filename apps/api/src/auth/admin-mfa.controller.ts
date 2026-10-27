import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { z } from "zod";
import { loginSchema } from "@valrify/validation";
import { RATE_LIMITS } from "../rate-limit.config";
import { parseSchema } from "../validation/parse-schema";
import { AdminMfaService } from "./admin-mfa.service";

const challengePath = "/api/auth";
const cookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const };

@Controller("auth/admin/:entry")
export class AdminMfaController {
  constructor(private readonly mfa: AdminMfaService) {}

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: RATE_LIMITS.login })
  async login(@Param("entry") entry: string, @Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    this.mfa.requireEntry(entry);
    const input = parseSchema(loginSchema, body);
    const result = await this.mfa.login(entry, input.email, input.password);
    response.cookie("valrify_admin_challenge", result.token, { ...cookie, path: challengePath, maxAge: 5 * 60_000 });
    return { enrollmentRequired: result.enrollmentRequired };
  }

  @Get("setup")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: RATE_LIMITS.login })
  setup(@Param("entry") entry: string, @Req() request: Request) {
    this.mfa.requireEntry(entry);
    return this.mfa.setup(request.cookies?.valrify_admin_challenge ?? "");
  }

  @Post("verify")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: RATE_LIMITS.tokenAction })
  async verify(@Param("entry") entry: string, @Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.mfa.requireEntry(entry);
    const { code } = parseSchema(z.object({ code: z.string().trim().min(6).max(64) }), body);
    const result = await this.mfa.verify(request.cookies?.valrify_admin_challenge ?? "", code);
    if ("enrollmentRequired" in result) return result;
    response.clearCookie("valrify_admin_challenge", { path: challengePath });
    response.cookie("valrify_session", result.session.token, { ...cookie, path: "/", maxAge: result.session.maxAge });
    return { user: result.session.actor, ...(result.recoveryCodes ? { recoveryCodes: result.recoveryCodes } : {}) };
  }
}

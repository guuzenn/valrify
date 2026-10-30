import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, Injectable, Post, Req, Res, ServiceUnavailableException, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { z } from "zod";
import { reportSchema } from "@valrify/validation";
import { TurnstileService } from "../auth/turnstile.service";
import { JwtAuthGuard, type AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { RATE_LIMITS } from "../rate-limit.config";
import { parseSchema } from "../validation/parse-schema";
import { guestCookieName, guestSessionHash, guestSubmission, newGuestCookie, type GuestSubmission } from "./guest-report.security";
import { reportUploadInterceptor } from "./reports.controller";
import { ReportsService } from "./reports.service";

type GuestRequest = Request & { guestSubmission: GuestSubmission };
const trackingSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, "Tautan pelacakan tidak valid.") });

@Injectable()
export class GuestReportGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileService, private readonly reports: ReportsService) {}
  async canActivate(context: ExecutionContext) {
    if (process.env.GUEST_REPORTS_ENABLED === "false") throw new ServiceUnavailableException("Laporan tanpa akun sedang dibatasi. Silakan masuk untuk melapor.");
    const request = context.switchToHttp().getRequest<GuestRequest>();
    const sessionHash = guestSessionHash(request.cookies?.[guestCookieName]);
    if (!sessionHash) throw new BadRequestException("Sesi laporan belum siap. Muat ulang halaman dan izinkan cookie.");
    request.guestSubmission = guestSubmission(sessionHash, request.headers["x-report-key"]);
    await this.reports.checkGuestQuota(request.guestSubmission);
    await this.turnstile.verify(request.headers["x-turnstile-token"], "submit-report");
    return true;
  }
}

@Controller("reports/guest")
export class GuestReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("session")
  @Throttle({ default: RATE_LIMITS.search })
  session(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "private, no-store");
    if (!guestSessionHash(request.cookies?.[guestCookieName])) response.cookie(guestCookieName, newGuestCookie(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { enabled: process.env.GUEST_REPORTS_ENABLED !== "false" };
  }

  @Post()
  @Throttle({ default: RATE_LIMITS.upload })
  @UseGuards(GuestReportGuard)
  @UseInterceptors(reportUploadInterceptor)
  create(@Req() request: GuestRequest, @Body() body: Record<string, string>, @UploadedFiles() files: Express.Multer.File[] = []) {
    const input = parseSchema(reportSchema, body);
    const contactEmail = parseSchema(z.string().trim().max(254).pipe(z.union([z.literal(""), z.email()])), body.contactEmail ?? "") || null;
    if (!files.length && !input.evidenceUrl) throw new BadRequestException("Unggah minimal satu bukti atau sertakan link posting bukti.");
    return this.reports.create(null, input, files, { ...request.guestSubmission, contactEmail });
  }

  @Post("status")
  @Throttle({ default: RATE_LIMITS.search })
  status(@Body() body: unknown) { return this.reports.guestStatus(parseSchema(trackingSchema, body).token); }

  @Post("claim")
  @Throttle({ default: RATE_LIMITS.tokenAction })
  @UseGuards(JwtAuthGuard)
  claim(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    if (!request.user.emailVerified) throw new BadRequestException("Verifikasi email akun terlebih dahulu.");
    return this.reports.claimGuest(parseSchema(trackingSchema, body).token, request.user.id);
  }
}

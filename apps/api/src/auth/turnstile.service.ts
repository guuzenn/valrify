import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { z } from "zod";
import { readWebOrigins } from "../security";

const verificationSchema = z.object({ success: z.boolean(), hostname: z.string().optional(), action: z.string().optional() });

@Injectable()
export class TurnstileService {
  async verify(token: unknown, action: "register" | "forgot-password" | "resend-verification" | "submit-report") {
    const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) throw new ServiceUnavailableException("Verifikasi keamanan belum tersedia. Coba lagi nanti.");
    if (typeof token !== "string" || !token.trim() || token.length > 2048) throw new BadRequestException("Selesaikan verifikasi keamanan terlebih dahulu.");
    let result: z.infer<typeof verificationSchema>;
    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Siteverify unavailable");
      result = verificationSchema.parse(await response.json());
    } catch { throw new ServiceUnavailableException("Verifikasi keamanan belum dapat diperiksa. Silakan coba lagi."); }
    const hostnames = readWebOrigins().map(origin => new URL(origin).hostname);
    if (!result.success || result.action !== action || !result.hostname || !hostnames.includes(result.hostname)) throw new BadRequestException("Verifikasi keamanan gagal atau kedaluwarsa. Silakan coba lagi.");
  }
}

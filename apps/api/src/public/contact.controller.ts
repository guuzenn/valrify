import { Body, Controller, Post, ServiceUnavailableException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { EmailService } from "../auth/email.service";
import { TurnstileService } from "../auth/turnstile.service";
import { RATE_LIMITS } from "../rate-limit.config";
import { parseSchema } from "../validation/parse-schema";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/),
  email: z.email().max(254),
  topic: z.enum(["Saran & pertanyaan", "Koreksi laporan", "Data pribadi", "Masalah situs"]),
  message: z.string().trim().min(10, "Pesan minimal 10 karakter.").max(5000),
  turnstileToken: z.string().max(2048),
});

@Controller("contact")
export class ContactController {
  constructor(private readonly email: EmailService, private readonly turnstile: TurnstileService) {}

  @Post()
  @Throttle({ default: RATE_LIMITS.emailRequest })
  async send(@Body() body: unknown) {
    const input = parseSchema(contactSchema, body);
    await this.turnstile.verify(input.turnstileToken, "contact");
    try {
      if (await this.email.sendContact(input)) return { sent: true };
    } catch (error) {
      this.email.reportFailure("Contact email failed", error);
    }
    throw new ServiceUnavailableException("Pesan belum terkirim. Coba lagi nanti atau email support@valrify.app.");
  }
}

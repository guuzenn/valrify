import { Injectable, Logger } from "@nestjs/common";

type EmailKind = "verification" | "password-reset";

export type TransactionalEmail = {
  to: string;
  displayName: string;
  token: string;
  kind: EmailKind;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
})[character]!);

export function buildAuthEmail(input: TransactionalEmail, publicAppUrl: string) {
  const path = input.kind === "verification" ? "/verify-email" : "/reset-password";
  const url = new URL(path, publicAppUrl);
  url.searchParams.set("token", input.token);
  const verification = input.kind === "verification";
  const title = verification ? "Verifikasi akun Valrify" : "Atur ulang password Valrify";
  const action = verification ? "VERIFIKASI AKUN" : "ATUR ULANG PASSWORD";
  const intro = verification
    ? "Selesaikan verifikasi agar akunmu dapat digunakan untuk mengirim laporan dan mengakses fitur Valrify."
    : "Kami menerima permintaan untuk mengatur ulang password akunmu. Tautan ini berlaku selama 1 jam.";
  const safeName = escapeHtml(input.displayName);
  const safeUrl = escapeHtml(url.toString());
  return {
    subject: title,
    textContent: `Halo ${input.displayName},\n\n${intro}\n\n${url.toString()}\n\nJika kamu tidak meminta ini, abaikan email ini.`,
    htmlContent: `<!doctype html><html><body style="margin:0;background:#ece8e1;color:#0f1923;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:36px 20px"><div style="background:#0f1923;color:#fff;padding:28px"><strong style="font-size:24px">VALRIFY<span style="color:#ff4655">.</span></strong></div><div style="background:#fff;border:1px solid #b8b3ac;border-top:4px solid #ff4655;padding:32px"><p style="color:#ff4655;font-size:11px;font-weight:700;letter-spacing:.12em">// KEAMANAN AKUN</p><h1 style="font-size:32px;line-height:1.1;margin:18px 0">${title}</h1><p>Halo ${safeName},</p><p style="color:#68736d;line-height:1.6">${intro}</p><a href="${safeUrl}" style="display:inline-block;margin:18px 0;background:#ff4655;color:#fff;padding:16px 22px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.08em">${action}</a><p style="color:#68736d;font-size:12px;line-height:1.6">Jika kamu tidak meminta ini, abaikan email ini. Jangan membagikan tautan tersebut kepada siapa pun.</p></div></div></body></html>`,
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY?.trim();
  private readonly fromEmail = process.env.EMAIL_FROM?.trim();
  private readonly fromName = process.env.EMAIL_FROM_NAME?.trim() || "Valrify";
  private readonly publicAppUrl = process.env.PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  constructor() {
    if (Boolean(this.apiKey) !== Boolean(this.fromEmail)) throw new Error("BREVO_API_KEY dan EMAIL_FROM harus diisi bersamaan.");
    if (process.env.NODE_ENV === "production" && !this.isConfigured()) throw new Error("Brevo wajib dikonfigurasi pada production.");
    new URL(this.publicAppUrl);
  }

  isConfigured() {
    return Boolean(this.apiKey && this.fromEmail);
  }

  async send(input: TransactionalEmail) {
    if (!this.isConfigured()) return false;
    const content = buildAuthEmail(input, this.publicAppUrl);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": this.apiKey!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: input.to, name: input.displayName }],
        subject: content.subject,
        htmlContent: content.htmlContent,
        textContent: content.textContent,
        tags: [input.kind],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Brevo menolak email (${response.status}): ${detail}`);
    }
    return true;
  }

  reportFailure(context: string, error: unknown) {
    this.logger.error(`${context}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

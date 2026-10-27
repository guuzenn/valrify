import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";
import { Secret, TOTP } from "otpauth";

export const isPrivileged = (role: string) => role === "ADMIN" || role === "MODERATOR";
export const hashMfaToken = (value: string) => createHash("sha256").update(value).digest("hex");

export function adminLoginSlug() {
  const value = process.env.ADMIN_LOGIN_SLUG;
  return value && /^mgmt-[a-z0-9]{16,64}$/.test(value) ? value : null;
}

function encryptionKey() {
  const value = process.env.MFA_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new ServiceUnavailableException("Konfigurasi MFA admin belum tersedia.");
  return Buffer.from(value, "hex");
}

export function encryptMfaSecret(secret: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}

export function decryptMfaSecret(value: string, userId: string) {
  const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted || iv.length !== 12 || tag.length !== 16) throw new Error("Invalid encrypted MFA secret");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString("utf8");
}

export function authenticator(secret: string, email: string) {
  return new TOTP({ issuer: "Valrify", label: email, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) });
}

export function validateTotp(secret: string, code: string, lastUsedStep: number, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = authenticator(secret, "admin").validate({ token: code, window: 1, timestamp });
  if (delta === null) return null;
  const step = Math.floor(timestamp / 30_000) + delta;
  return step > lastUsedStep ? step : null;
}

import { BadRequestException } from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readAuthSecret } from "../auth/auth.config";

export const guestCookieName = "valrify_guest";
export const hashGuestSecret = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const sign = (value: string) => createHmac("sha256", readAuthSecret()).update(`guest-report:${value}`).digest("hex");

export function newGuestCookie() {
  const value = randomBytes(32).toString("hex");
  return `${value}.${sign(value)}`;
}

export function guestSessionHash(cookie: unknown) {
  if (typeof cookie !== "string" || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(cookie)) return null;
  const [value, signature] = cookie.split(".") as [string, string];
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(value), "hex")) ? hashGuestSecret(value) : null;
}

export function guestSubmission(sessionHash: string, key: unknown) {
  if (typeof key !== "string" || !/^[a-f0-9-]{36}$/.test(key)) throw new BadRequestException("Muat ulang halaman sebelum mengirim laporan.");
  const submissionHash = hashGuestSecret(`${sessionHash}:${key}`);
  return { sessionHash, submissionHash, trackingToken: sign(`tracking:${submissionHash}`) };
}

export type GuestSubmission = ReturnType<typeof guestSubmission>;

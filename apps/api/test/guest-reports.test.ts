import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { GuestReportGuard, GuestReportsController } from "../src/reports/guest-reports.controller";
import { guestSessionHash, guestSubmission, hashGuestSecret, newGuestCookie } from "../src/reports/guest-report.security";
import type { ReportsService } from "../src/reports/reports.service";
import type { TurnstileService } from "../src/auth/turnstile.service";

test("guest sessions reject tampering and tracking tokens are scoped to session and submission", () => {
  const cookie = newGuestCookie(), session = guestSessionHash(cookie)!;
  assert.equal(session.length, 64);
  for (const value of [undefined, "", cookie.slice(1), `${cookie.slice(0, -1)}${cookie.endsWith("0") ? "1" : "0"}`]) assert.equal(guestSessionHash(value), null);
  const key = randomUUID(), first = guestSubmission(session, key);
  assert.deepEqual(guestSubmission(session, key), first);
  assert.notEqual(guestSubmission(session, randomUUID()).trackingToken, first.trackingToken);
  assert.notEqual(guestSubmission(guestSessionHash(newGuestCookie())!, key).trackingToken, first.trackingToken);
  assert.notEqual(hashGuestSecret(first.trackingToken), first.trackingToken);
  assert.throws(() => guestSubmission(session, "x"));
});

test("guest guard fails closed before uploads and honours the emergency switch", async () => {
  const previous = process.env.GUEST_REPORTS_ENABLED;
  let captchaCalls = 0, blocked = false;
  const captcha = { verify: async (_token: unknown, action: string) => { captchaCalls++; assert.equal(action, "submit-report"); throw new Error("Captcha rejected"); } } as TurnstileService;
  const reports = { checkGuestQuota: async () => { if (blocked) throw new Error("Quota full"); } } as unknown as ReportsService;
  const guard = new GuestReportGuard(captcha, reports);
  const request = { cookies: {}, headers: { "x-report-key": randomUUID(), "x-turnstile-token": "fake" } };
  const context = new ExecutionContextHost([request]);
  try {
    delete process.env.GUEST_REPORTS_ENABLED;
    await assert.rejects(guard.canActivate(context), /Sesi laporan/);
    request.cookies = { valrify_guest: newGuestCookie() };
    blocked = true; await assert.rejects(guard.canActivate(context), /Quota full/);
    assert.equal(captchaCalls, 0);
    blocked = false; await assert.rejects(guard.canActivate(context), /Captcha rejected/);
    assert.equal(captchaCalls, 1);
    process.env.GUEST_REPORTS_ENABLED = "false";
    await assert.rejects(guard.canActivate(context), /sedang dibatasi/);
    assert.equal(captchaCalls, 1);
  } finally { if (previous === undefined) delete process.env.GUEST_REPORTS_ENABLED; else process.env.GUEST_REPORTS_ENABLED = previous; }
});

test("guest tracking rejects public IDs and claiming requires a verified account", async () => {
  const controller = new GuestReportsController({} as ReportsService);
  assert.throws(() => controller.status({ token: "VLR-12345" }));
  assert.throws(() => controller.claim({ user: { emailVerified: false } } as never, { token: "a".repeat(64) }), /Verifikasi email/);
});

import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { isDemoAccount, readAuthSecret } from "../src/auth/auth.config";
import { readWebOrigins, securityMiddleware } from "../src/security";
import { validateEvidence } from "../src/storage/validate-evidence";
import { registerSchema, resetPasswordSchema } from "@valrify/validation";

test("security boundaries reject demo production secrets, foreign mutations and disguised uploads", () => {
  for (const secret of [undefined, "short", "replace-with-at-least-32-random-characters", "valrify-development-secret-change-me"]) assert.throws(() => readAuthSecret({ NODE_ENV: "production", AUTH_SECRET: secret }));
  assert.equal(readAuthSecret({ NODE_ENV: "production", AUTH_SECRET: "x".repeat(40) }), "x".repeat(40));
  assert.equal(isDemoAccount({ id: "demo-admin", email: "admin@valrify.app" }), true);
  assert.equal(isDemoAccount({ id: "real", email: "tester@valrify.local" }), true);
  assert.equal(isDemoAccount({ id: "real", email: "admin@valrify.app" }), false);
  assert.equal(registerSchema.safeParse({ email: "user@example.com", username: "user_test", password: "x".repeat(73) }).success, false);
  const registration = { email: "user@example.com", username: "  Player_01  ", password: "Password!2026" };
  assert.equal(registerSchema.parse(registration).username, "player_01");
  for (const username of ["ab", "admin", "player name", "x".repeat(25)]) assert.equal(registerSchema.safeParse({ ...registration, username }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: "a".repeat(64), password: "é".repeat(37) }).success, false);
  assert.throws(() => readWebOrigins({ NODE_ENV: "production", WEB_ORIGIN: "http://localhost:3000" }));
  const origins = readWebOrigins({ NODE_ENV: "production", WEB_ORIGIN: "https://valrify.app" });
  const middleware = securityMiddleware(origins);
  function check(method: string, origin?: string, cookie?: string) {
    let passed = false, status = 200;
    const response = { setHeader() {}, status(value: number) { status = value; return this; }, json() {} } as unknown as Response;
    middleware({ method, headers: { origin }, cookies: { valrify_session: cookie } } as unknown as Request, response, () => { passed = true; });
    return { passed, status };
  }
  assert.deepEqual(check("POST", "https://evil.example"), { passed: false, status: 403 });
  assert.equal(check("DELETE", undefined, "session").passed, false);
  assert.equal(check("POST", "https://valrify.app", "session").passed, true);
  assert.equal(check("GET", undefined, "session").passed, true);
  assert.equal(check("POST").passed, true); // non-browser bearer clients
  const file = (mimetype: string, buffer: Buffer) => ({ mimetype, buffer } as Express.Multer.File);
  assert.throws(() => validateEvidence([file("image/png", Buffer.from("<script>alert(1)</script>"))]));
  assert.throws(() => validateEvidence([file("image/svg+xml", Buffer.from("<svg/>"))]));
  validateEvidence([file("image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), file("application/pdf", Buffer.from("%PDF-1.7"))]);
});

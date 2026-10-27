import assert from "node:assert/strict";
import test from "node:test";
import { TurnstileService } from "../src/auth/turnstile.service";
import { AuthController } from "../src/auth/auth.controller";
import type { AuthService } from "../src/auth/auth.service";
import type { GoogleAuthService } from "../src/auth/google-auth.service";

test("Turnstile rejects missing, expired, wrong-action and wrong-host tokens and fails closed", async () => {
  const originalEnv = { ...process.env }, originalFetch = globalThis.fetch;
  try {
    Object.assign(process.env, { NODE_ENV: "test", TURNSTILE_SECRET_KEY: "private-test-secret", WEB_ORIGIN: "http://localhost:3000", PUBLIC_APP_URL: "http://localhost:3000" });
    const service = new TurnstileService();
    let calls = 0;
    let payload: unknown = { success: true, action: "register", hostname: "localhost" };
    globalThis.fetch = (async (url, options) => {
      calls++;
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.deepEqual(JSON.parse(String(options?.body)), { secret: "private-test-secret", response: "valid-token" });
      assert.ok(options?.signal);
      return Response.json(payload);
    }) as typeof fetch;
    for (const token of [undefined, null, "", " ", [], {}, "x".repeat(2049)]) await assert.rejects(() => service.verify(token, "register"));
    assert.equal(calls, 0);
    await service.verify("valid-token", "register");
    for (const value of [
      { success: false, "error-codes": ["timeout-or-duplicate"] },
      { success: true, action: "forgot-password", hostname: "localhost" },
      { success: true, action: "register", hostname: "evil.example" },
      { success: true, action: "register" },
      { success: "true", action: "register", hostname: "localhost" },
    ]) { payload = value; await assert.rejects(() => service.verify("valid-token", "register")); }
    globalThis.fetch = (async () => new Response("unavailable", { status: 503 })) as typeof fetch;
    await assert.rejects(() => service.verify("valid-token", "register"));
    globalThis.fetch = (async () => { throw new Error("Network down"); }) as typeof fetch;
    await assert.rejects(() => service.verify("valid-token", "register"));
    delete process.env.TURNSTILE_SECRET_KEY;
    await assert.rejects(() => service.verify("valid-token", "register"));
  } finally { globalThis.fetch = originalFetch; process.env = originalEnv; }
});

test("all protected auth endpoints verify Turnstile before account or email work", async () => {
  const actions: string[] = [];
  let work = 0, rejected = true;
  const auth = { register: async () => { work++; }, resendVerification: async () => { work++; }, requestPasswordReset: async () => { work++; } } as unknown as AuthService;
  const captcha = { verify: async (token: unknown, action: string) => { assert.equal(token, "token"); actions.push(action); if (rejected) throw new Error("Rejected"); } } as TurnstileService;
  const controller = new AuthController(auth, {} as GoogleAuthService, captcha);
  const body = { email: "user@example.com", password: "Password!2026", username: "player_01" };
  for (const method of ["register", "resendVerification", "forgotPassword"] as const) await assert.rejects(() => controller[method](body, "token"));
  assert.equal(work, 0);
  assert.deepEqual(actions, ["register", "resend-verification", "forgot-password"]);
  rejected = false;
  for (const method of ["register", "resendVerification", "forgotPassword"] as const) await controller[method](body, "token");
  assert.equal(work, 3);
});

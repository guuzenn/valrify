import assert from "node:assert/strict";
import test from "node:test";
import { ContactController } from "../src/public/contact.controller";
import { EmailService } from "../src/auth/email.service";
import type { TurnstileService } from "../src/auth/turnstile.service";

const input = { name: "Pengguna", email: "user@example.com", topic: "Koreksi laporan", message: "Mohon periksa laporan ini.", turnstileToken: "valid-token" };

test("contact validates input, checks captcha before sending and reports delivery failure", async () => {
  let calls = 0;
  let verified = false;
  const email = { sendContact: async () => { assert.ok(verified); calls++; return true; }, reportFailure: () => {} } as unknown as EmailService;
  const turnstile = { verify: async (token: string, action: string) => { assert.equal(token, "valid-token"); assert.equal(action, "contact"); verified = true; } } as TurnstileService;
  const controller = new ContactController(email, turnstile);
  await assert.rejects(() => controller.send({ ...input, email: "invalid" }));
  await assert.rejects(() => controller.send({ ...input, message: "x".repeat(5001) }));
  await assert.rejects(() => controller.send({ ...input, topic: "arbitrary subject" }));
  assert.equal(calls, 0);
  assert.deepEqual(await controller.send(input), { sent: true });
  email.sendContact = async () => false;
  await assert.rejects(() => controller.send(input), /Pesan belum terkirim/);
  email.sendContact = async () => { throw new Error("provider unavailable"); };
  await assert.rejects(() => controller.send(input), /Pesan belum terkirim/);
  turnstile.verify = async () => { throw new Error("invalid captcha"); };
  await assert.rejects(() => controller.send(input), /invalid captcha/);
  assert.equal(calls, 1);
});

test("contact email uses a fixed recipient and authenticated sender with user as reply-to", async () => {
  const originalEnv = { ...process.env }, originalFetch = globalThis.fetch;
  try {
    Object.assign(process.env, { NODE_ENV: "test", BREVO_API_KEY: "test-key", EMAIL_FROM: "noreply@valrify.app" });
    globalThis.fetch = (async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.sender.email, "noreply@valrify.app");
      assert.equal(body.to[0].email, "support@valrify.app");
      assert.equal(body.replyTo.email, input.email);
      assert.ok(body.textContent.includes(input.message));
      assert.equal(body.htmlContent, undefined);
      return Response.json({ messageId: "test" });
    }) as typeof fetch;
    assert.equal(await new EmailService().sendContact(input), true);
  } finally { process.env = originalEnv; globalThis.fetch = originalFetch; }
});

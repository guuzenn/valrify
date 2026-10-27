import assert from "node:assert/strict";
import test from "node:test";
import { Secret, TOTP } from "otpauth";
import { adminLoginSlug, decryptMfaSecret, encryptMfaSecret, validateTotp } from "../src/auth/admin-mfa.crypto";

test("MFA encrypts per-user secrets, rejects tampering and verifies RFC TOTP without replay", () => {
  const oldKey = process.env.MFA_ENCRYPTION_KEY;
  const oldSlug = process.env.ADMIN_LOGIN_SLUG;
  try {
    process.env.MFA_ENCRYPTION_KEY = "ab".repeat(32);
    const secret = Secret.fromUTF8("12345678901234567890").base32;
    const value = encryptMfaSecret(secret, "user-one");
    assert.ok(!value.includes(secret));
    assert.equal(decryptMfaSecret(value, "user-one"), secret);
    assert.throws(() => decryptMfaSecret(value, "other-user"));
    const parts = value.split(".");
    const tag = Buffer.from(parts[1]!, "base64url"); tag[0] = tag[0]! ^ 1; parts[1] = tag.toString("base64url");
    assert.throws(() => decryptMfaSecret(parts.join("."), "user-one"));
    // RFC 6238 SHA-1 vector at 59 seconds, truncated to the app's six digits.
    assert.equal(new TOTP({ secret, digits: 6 }).generate({ timestamp: 59_000 }), "287082");
    assert.equal(validateTotp(secret, "287082", -1, 59_000), 1);
    assert.equal(validateTotp(secret, "287082", 1, 59_000), null);
    assert.equal(validateTotp(secret, "287082", -1, 120_000), null);
    assert.equal(validateTotp(secret, "28708x", -1, 59_000), null);
    for (const slug of ["admin", "mgmt-short", "mgmt-" + "x".repeat(65), "mgmt-<script>"]) {
      process.env.ADMIN_LOGIN_SLUG = slug;
      assert.equal(adminLoginSlug(), null);
    }
    process.env.ADMIN_LOGIN_SLUG = "mgmt-" + "a".repeat(24);
    assert.equal(adminLoginSlug(), process.env.ADMIN_LOGIN_SLUG);
    delete process.env.MFA_ENCRYPTION_KEY;
    assert.throws(() => encryptMfaSecret(secret, "user-one"));
  } finally {
    if (oldKey === undefined) delete process.env.MFA_ENCRYPTION_KEY; else process.env.MFA_ENCRYPTION_KEY = oldKey;
    if (oldSlug === undefined) delete process.env.ADMIN_LOGIN_SLUG; else process.env.ADMIN_LOGIN_SLUG = oldSlug;
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import { GoogleAuthService } from "../src/auth/google-auth.service";

test("Google OAuth binds state, expiry, PKCE and verified identity to the browser flow", async () => {
  const originalEnv = { ...process.env };
  const originalGetToken = OAuth2Client.prototype.getToken;
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  try {
    Object.assign(process.env, { NODE_ENV: "test", GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret", PUBLIC_APP_URL: "http://localhost:3000" });
    const jwt = new JwtService({ secret: "google-test-only", signOptions: { algorithm: "HS256" }, verifyOptions: { algorithms: ["HS256"] } });
    const google = new GoogleAuthService(jwt);
    const start = await google.start();
    const url = new URL(start.url);
    const state = url.searchParams.get("state");
    const flow = await google.validateFlow(start.cookie, state);
    assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/google/callback");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("nonce"), flow.nonce);
    await assert.rejects(() => google.validateFlow(undefined, state));
    await assert.rejects(() => google.validateFlow(start.cookie, "wrong-state"));
    await assert.rejects(() => google.validateFlow(`${start.cookie}x`, state));
    await assert.rejects(() => google.validateFlow(jwt.sign({ ...flow, exp: 1 }, { audience: "google-login" }), state));
    await assert.rejects(() => google.validateFlow(jwt.sign({ ...flow, aud: "other" }), state));
    const payload = { iss: "https://accounts.google.com", aud: "test-client", iat: 1, exp: 9999999999, sub: "google-user", email: "Person@gmail.com", email_verified: true, nonce: flow.nonce, name: "Person" };
    OAuth2Client.prototype.getToken = (async (options: { codeVerifier?: string }) => {
      assert.equal(options.codeVerifier, flow.verifier);
      return { tokens: { id_token: "signed-google-token" } };
    }) as unknown as typeof originalGetToken;
    OAuth2Client.prototype.verifyIdToken = (async (options: { audience?: string }) => {
      assert.equal(options.audience, "test-client");
      return new LoginTicket("", payload);
    }) as typeof originalVerify;
    assert.deepEqual(await google.profile(start.cookie, state, "code"), { subject: "google-user", email: "person@gmail.com", displayName: "Person" });
    payload.nonce = "wrong";
    await assert.rejects(() => google.profile(start.cookie, state, "code"));
    payload.nonce = flow.nonce;
    payload.email_verified = false;
    await assert.rejects(() => google.profile(start.cookie, state, "code"));
    delete process.env.GOOGLE_CLIENT_SECRET;
    await assert.rejects(() => google.start());
  } finally {
    OAuth2Client.prototype.getToken = originalGetToken;
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    process.env = originalEnv;
  }
});

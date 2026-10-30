import assert from "node:assert/strict";
import test from "node:test";
import { AccountService } from "../src/account/account.service";
import type { DatabaseService } from "../src/database/database.service";

test("name edits preserve username and its cooldown, including accounts without a public profile", async () => {
  for (const username of [null, "existing_user"]) {
    const changedAt = username ? new Date() : null;
    let saved: Record<string, unknown> = {};
    const database = { db: {
      query: { users: { findFirst: async () => ({ displayName: "Old name", username, usernameChangedAt: changedAt }) } },
      update: () => ({ set: (values: Record<string, unknown>) => {
        saved = values;
        return { where: () => ({ returning: async () => [{ ...values, usernameChangedAt: changedAt }] }) };
      } }),
    } } as unknown as DatabaseService;
    const profile = await new AccountService(database).updateProfile("owner", { displayName: "New name", bio: "New bio" });
    assert.equal(saved.displayName, "New name");
    assert.equal(saved.username, username);
    assert.equal("usernameChangedAt" in saved, false);
    assert.equal(profile.displayName, "New name");
    assert.equal(profile.username, username);
    assert.equal(Boolean(profile.usernameCanChangeAt), Boolean(changedAt));
  }
});

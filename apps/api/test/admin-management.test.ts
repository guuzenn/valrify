import assert from "node:assert/strict";
import test from "node:test";
import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { adminRoleSchema, adminUserQuerySchema, middlemanDirectorySchema } from "@valrify/validation";
import { AdminManagementController } from "../src/admin/admin-management.controller";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { RolesGuard } from "../src/auth/roles.guard";

test("management endpoints require authentication and only permit assigned admin roles", () => {
  assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, AdminManagementController), [JwtAuthGuard, RolesGuard]);
  const guard = new RolesGuard(new Reflector());
  for (const method of ["dashboard", "users", "user", "role", "directory", "createDirectory", "updateDirectory", "activity"] as const) {
    for (const role of ["USER", "VERIFIED_MIDDLEMAN", "MODERATOR", "ADMIN"] as const) {
      const context = new ExecutionContextHost([{ user: { role } }], AdminManagementController, AdminManagementController.prototype[method]);
      if (role === "ADMIN" || (method === "dashboard" && role === "MODERATOR")) assert.equal(guard.canActivate(context), true);
      else assert.throws(() => guard.canActivate(context), { status: 403 });
    }
  }
});

test("admin role changes require an expected role and meaningful reason", () => {
  assert.equal(adminRoleSchema.safeParse({ role: "ADMIN", expectedRole: "USER", rationale: "Akses diberikan sesuai tanggung jawab." }).success, true);
  for (const input of [{ role: "SUPERADMIN", expectedRole: "USER", rationale: "Alasan cukup panjang." }, { role: "ADMIN", rationale: "Alasan cukup panjang." }, { role: "ADMIN", expectedRole: "USER", rationale: "   " }]) assert.equal(adminRoleSchema.safeParse(input).success, false);
  assert.deepEqual(adminUserQuerySchema.parse({}), { q: "", page: 1 });
  assert.equal(adminUserQuerySchema.safeParse({ page: "-1" }).success, false);
});

test("directory entries reject unsafe links and default to unpublished", () => {
  const input = { displayName: "Rekber fixture", description: "Deskripsi layanan rekber untuk komunitas.", profileUrl: "https://example.test/profile", contactUrl: "https://example.test/contact", rationale: "Kontak resmi telah diperiksa admin." };
  const parsed = middlemanDirectorySchema.parse(input);
  assert.equal(parsed.isPublished, false);
  assert.equal(parsed.isSponsored, false);
  for (const profileUrl of ["broken", "javascript:alert(1)", "data:text/html,test", "http://example.test", "https://user:password@example.test"]) assert.equal(middlemanDirectorySchema.safeParse({ ...input, profileUrl }).success, false);
});

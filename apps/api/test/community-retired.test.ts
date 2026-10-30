import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { MODULE_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { AppModule } from "../src/app.module";
import { PublicController } from "../src/public/public.controller";

test("community routes are unmounted while public user profiles remain available", () => {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as Array<{ name?: string }>;
  assert.equal(imports.some(module => ["CommunityModule", "NotificationsModule"].includes(module.name ?? "")), false);
  const routes = Object.getOwnPropertyNames(PublicController.prototype).filter(key => key !== "constructor").map(key => Reflect.getMetadata(PATH_METADATA, PublicController.prototype[key as keyof PublicController]));
  assert.equal(routes.some(route => typeof route === "string" && route.startsWith("community/")), false);
  assert.ok(routes.includes("users/:username"));
});

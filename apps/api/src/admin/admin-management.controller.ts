import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { adminActivityQuerySchema, adminRoleSchema, adminUserQuerySchema, middlemanDirectoryEditSchema, middlemanDirectorySchema } from "@valrify/validation";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { parseSchema } from "../validation/parse-schema";
import { AdminManagementService } from "./admin-management.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminManagementController {
  constructor(private readonly management: AdminManagementService) {}
  @Get("dashboard")
  @Roles("ADMIN", "MODERATOR")
  dashboard() { return this.management.dashboard(); }
  @Get("users")
  users(@Query() query: unknown) { return this.management.userList(parseSchema(adminUserQuerySchema, query)); }
  @Get("users/:id")
  user(@Param("id") id: string) { return this.management.userDetail(id); }
  @Patch("users/:id/role")
  role(@Param("id") id: string, @CurrentActor() actor: AuthActor, @Body() body: unknown) { return this.management.changeRole(id, actor.id, parseSchema(adminRoleSchema, body)); }
  @Get("directory")
  directory() { return this.management.directory(); }
  @Post("directory")
  createDirectory(@CurrentActor() actor: AuthActor, @Body() body: unknown) { return this.management.saveDirectory(actor.id, parseSchema(middlemanDirectorySchema, body)); }
  @Patch("directory/:id")
  updateDirectory(@Param("id", ParseIntPipe) id: number, @CurrentActor() actor: AuthActor, @Body() body: unknown) {
    const { updatedAt, ...input } = parseSchema(middlemanDirectoryEditSchema, body);
    return this.management.saveDirectory(actor.id, input, id, updatedAt);
  }
  @Get("activity")
  activity(@Query() query: unknown) { return this.management.activity(parseSchema(adminActivityQuerySchema, query).page); }
}

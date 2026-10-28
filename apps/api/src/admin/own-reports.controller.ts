import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { reportEditSchema, reportQueueSchema, reviewSchema } from "@valrify/validation";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { parseSchema } from "../validation/parse-schema";
import { sendPrivateEvidence } from "./admin.controller";
import { AdminService } from "./admin.service";

@Controller("account")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("VERIFIED_MIDDLEMAN", "ADMIN")
export class OwnReportsController {
  constructor(private readonly admin: AdminService) {}

  @Get("reports")
  queue(@CurrentActor() actor: AuthActor, @Query("status") status: unknown) {
    return this.admin.queue(parseSchema(reportQueueSchema, status), actor.id);
  }

  @Patch("reports/:id")
  async edit(@Param("id", ParseIntPipe) id: number, @CurrentActor() actor: AuthActor, @Body() body: unknown) {
    await this.admin.assertReportOwner(id, actor.id);
    return this.admin.editReport(id, actor.id, parseSchema(reportEditSchema, body));
  }

  @Post("reports/:id/review")
  async review(@Param("id", ParseIntPipe) id: number, @CurrentActor() actor: AuthActor, @Body() body: unknown) {
    await this.admin.assertReportOwner(id, actor.id);
    return this.admin.review(id, actor.id, parseSchema(reviewSchema, body));
  }

  @Get("evidence/:id")
  async evidence(@Param("id", ParseIntPipe) id: number, @CurrentActor() actor: AuthActor, @Res() response: Response) {
    sendPrivateEvidence(response, await this.admin.evidence(id, actor.id));
  }
}

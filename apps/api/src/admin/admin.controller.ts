import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { confirmationReviewSchema, reviewSchema } from "@vlrfy/validation";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("MODERATOR", "ADMIN")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("reports")
  queue() {
    return this.admin.queue();
  }

  @Post("reports/:id/review")
  review(
    @Param("id") id: string,
    @CurrentActor() actor: AuthActor,
    @Body() body: unknown,
  ) {
    return this.admin.review(Number(id), actor.id, reviewSchema.parse(body));
  }

  @Get("transaction-confirmations")
  confirmationQueue() {
    return this.admin.confirmationQueue();
  }

  @Post("transaction-confirmations/:id/review")
  reviewConfirmation(
    @Param("id") id: string,
    @CurrentActor() actor: AuthActor,
    @Body() body: unknown,
  ) {
    return this.admin.reviewConfirmation(
      Number(id),
      actor.id,
      confirmationReviewSchema.parse(body),
    );
  }

  @Get("evidence/:id")
  async evidence(@Param("id") id: string, @Res() response: Response) {
    const result = await this.admin.evidence(Number(id));
    this.sendPrivateEvidence(response, result);
  }

  @Get("transaction-confirmation-evidence/:id")
  async confirmationEvidence(
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const result = await this.admin.confirmationEvidence(Number(id));
    this.sendPrivateEvidence(response, result);
  }

  private sendPrivateEvidence(
    response: Response,
    result: { meta: { mimeType: string; fileName: string }; bytes: Buffer },
  ) {
    response.setHeader("content-type", result.meta.mimeType);
    response.setHeader(
      "content-disposition",
      `inline; filename="${result.meta.fileName.replace(/["\r\n]/g, "_")}"`,
    );
    response.setHeader("cache-control", "private, no-store");
    response.setHeader("x-content-type-options", "nosniff");
    response.send(result.bytes);
  }
}

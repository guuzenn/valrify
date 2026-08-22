import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  inbox(@CurrentActor() actor: AuthActor) { return this.notifications.inbox(actor.id); }

  @Get("unread-count")
  unreadCount(@CurrentActor() actor: AuthActor) { return this.notifications.unreadCount(actor.id); }

  @Post("read-all")
  readAll(@CurrentActor() actor: AuthActor) { return this.notifications.readAll(actor.id); }

  @Post(":id/read")
  read(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number) { return this.notifications.read(actor.id, id); }
}

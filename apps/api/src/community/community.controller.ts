import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { communityCommentSchema, communityPostReportSchema, communityPostSchema } from "@valrify/validation";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RATE_LIMITS } from "../rate-limit.config";
import { parseSchema } from "../validation/parse-schema";
import { CommunityService } from "./community.service";

@Controller("community")
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Post("posts")
  create(@CurrentActor() actor: AuthActor, @Body() body: unknown) {
    return this.community.create(actor, parseSchema(communityPostSchema, body));
  }

  @Delete("posts/:id")
  remove(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number) {
    return this.community.remove(actor, id);
  }

  @Post("posts/:id/report")
  @Throttle({ default: RATE_LIMITS.communityReport })
  report(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
    return this.community.report(actor, id, parseSchema(communityPostReportSchema, body));
  }

  @Post("posts/:id/comments")
  comment(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
    return this.community.comment(actor, id, parseSchema(communityCommentSchema, body));
  }

  @Get("posts/like-state")
  postLikeState(@CurrentActor() actor: AuthActor) {
    return this.community.postLikeState(actor);
  }

  @Post("posts/:id/like")
  togglePostLike(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number) {
    return this.community.togglePostLike(actor, id);
  }

  @Get("posts/:id/comment-state")
  commentState(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number) {
    return this.community.commentState(actor, id);
  }

  @Post("comments/:id/like")
  toggleCommentLike(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number) {
    return this.community.toggleCommentLike(actor, id);
  }

  @Delete("comments/:id")
  removeComment(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number) {
    return this.community.removeComment(actor, id);
  }

  @Post("comments/:id/report")
  @Throttle({ default: RATE_LIMITS.communityReport })
  reportComment(@CurrentActor() actor: AuthActor, @Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
    return this.community.reportComment(actor, id, parseSchema(communityPostReportSchema, body));
  }
}

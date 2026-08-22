import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { publicProfileSchema } from "@valrify/validation";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { parseSchema } from "../validation/parse-schema";
import { AccountService } from "./account.service";

@Controller("account")
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get("overview")
  overview(@CurrentActor() actor: AuthActor) {
    return this.account.overview(actor.id);
  }

  @Patch("profile")
  updateProfile(@CurrentActor() actor: AuthActor, @Body() body: unknown) {
    return this.account.updateProfile(actor.id, parseSchema(publicProfileSchema, body));
  }
}

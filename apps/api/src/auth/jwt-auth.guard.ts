import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { AuthActor } from "./auth.types";
import { AuthService } from "./auth.service";
export type AuthenticatedRequest = Request & { user: AuthActor; authSessionId: string };
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.valrify_session ?? request.headers.authorization?.replace(/^Bearer /, "");
    if (!token) throw new UnauthorizedException("Silakan masuk.");
    const session = await this.auth.authenticate(token);
    request.user = session.actor;
    request.authSessionId = session.id;
    return true;
  }
}

import { GoogleAuthService } from "./google-auth.service";
import { TurnstileService } from "./turnstile.service";
import { AdminMfaController } from "./admin-mfa.controller";
import { AdminMfaService } from "./admin-mfa.service";
import { Module } from "@nestjs/common";import { JwtModule } from "@nestjs/jwt";import { AuthController } from "./auth.controller";import { AuthService } from "./auth.service";import { EmailService } from "./email.service";import { JwtAuthGuard } from "./jwt-auth.guard";import { RolesGuard } from "./roles.guard";
import { readAuthSecret } from "./auth.config";
@Module({imports:[JwtModule.register({global:true,secret:readAuthSecret(),signOptions:{algorithm:"HS256"},verifyOptions:{algorithms:["HS256"]}})],controllers:[AuthController,AdminMfaController],providers:[AdminMfaService,TurnstileService,GoogleAuthService,AuthService,EmailService,JwtAuthGuard,RolesGuard],exports:[AuthService,JwtAuthGuard,RolesGuard]})export class AuthModule{}

import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AccountModule } from "./account/account.module";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CommunityModule } from "./community/community.module";
import { ConfirmationsModule } from "./confirmations/confirmations.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { NotificationsModule } from "./notifications/notifications.module";
import { PublicModule } from "./public/public.module";
import { rateLimitOptions } from "./rate-limit.config";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    ThrottlerModule.forRoot(rateLimitOptions),
    DatabaseModule,
    AuthModule,
    AccountModule,
    CommunityModule,
    NotificationsModule,
    PublicModule,
    ReportsModule,
    ConfirmationsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { ConfirmationsController } from "./confirmations.controller";
import { ConfirmationsService } from "./confirmations.service";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ConfirmationsController],
  providers: [ConfirmationsService],
})
export class ConfirmationsModule {}

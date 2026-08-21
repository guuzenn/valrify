import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { confirmationSchema } from "@valrify/validation";
import { CurrentActor } from "../auth/current-actor";
import type { AuthActor } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { parseSchema } from "../validation/parse-schema";
import { ConfirmationsService } from "./confirmations.service";

const allowedProofTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

@Controller("transaction-confirmations")
export class ConfirmationsController {
  constructor(private readonly confirmations: ConfirmationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("proof", 3, {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(
          allowedProofTypes.has(file.mimetype)
            ? null
            : new BadRequestException("Tipe file tidak didukung."),
          allowedProofTypes.has(file.mimetype),
        ),
    }),
  )
  create(
    @CurrentActor() actor: AuthActor,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    if (!actor.emailVerified) {
      throw new BadRequestException("Email harus terverifikasi.");
    }
    return this.confirmations.create(
      actor.id,
      parseSchema(confirmationSchema, body),
      files,
    );
  }
}

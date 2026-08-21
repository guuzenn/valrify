import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { ConfirmationInput } from "@vlrfy/validation";
import { DatabaseService } from "../database/database.service";
import {
  entities,
  transactionConfirmationEvidence,
  transactionConfirmations,
} from "../database/schema";
import { EvidenceStorage } from "../storage/evidence-storage";

@Injectable()
export class ConfirmationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: EvidenceStorage,
  ) {}

  async create(
    userId: string,
    input: ConfirmationInput,
    files: Express.Multer.File[],
  ) {
    const entity = await this.database.db.query.entities.findFirst({
      where: eq(entities.id, input.entityId),
    });
    if (!entity) throw new NotFoundException("Profil tidak ditemukan.");

    const transactionDate = new Date(`${input.transactionDate}T00:00:00.000Z`);
    const duplicate = await this.database.db.query.transactionConfirmations.findFirst({
      where: and(
        eq(transactionConfirmations.userId, userId),
        eq(transactionConfirmations.entityId, input.entityId),
        eq(transactionConfirmations.transactionDate, transactionDate),
      ),
    });
    if (duplicate) {
      throw new ConflictException(
        "Konfirmasi untuk profil dan tanggal transaksi ini sudah pernah dikirim.",
      );
    }

    return this.database.db.transaction(async (tx) => {
      const [confirmation] = await tx
        .insert(transactionConfirmations)
        .values({
          userId,
          entityId: input.entityId,
          transactionDate,
          amount: input.amount,
          note: input.note,
        })
        .returning();
      if (!confirmation) throw new Error("Gagal menyimpan konfirmasi transaksi.");

      for (const file of files) {
        const stored = await this.storage.put(file, confirmation.id);
        await tx.insert(transactionConfirmationEvidence).values({
          confirmationId: confirmation.id,
          storageKey: stored.key,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          size: stored.size,
        });
      }

      return { id: confirmation.id, status: confirmation.status };
    });
  }
}

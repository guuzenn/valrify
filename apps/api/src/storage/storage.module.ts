import { Module } from "@nestjs/common";
import { EvidenceStorage } from "./evidence-storage";
import { createEvidenceStorage } from "./evidence-storage.factory";

@Module({
  providers: [
    {
      provide: EvidenceStorage,
      useFactory: () => createEvidenceStorage(),
    },
  ],
  exports: [EvidenceStorage],
})
export class StorageModule {}

import { EvidenceStorage } from "./evidence-storage";
import { LocalEvidenceStorage } from "./local-evidence-storage.service";
import {
  R2EvidenceStorage,
  readR2StorageConfig,
} from "./r2-evidence-storage.service";

export function createEvidenceStorage(
  env: NodeJS.ProcessEnv = process.env,
): EvidenceStorage {
  const driver = env.STORAGE_DRIVER?.trim().toLowerCase() || "local";
  if (driver === "local") return new LocalEvidenceStorage();
  if (driver === "r2") return new R2EvidenceStorage(readR2StorageConfig(env));
  throw new Error(
    `STORAGE_DRIVER tidak didukung: ${driver}. Gunakan local atau r2.`,
  );
}

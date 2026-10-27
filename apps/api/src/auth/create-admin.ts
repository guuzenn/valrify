import { z } from "zod";
import "../load-env";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { registerSchema } from "@valrify/validation";
import { DatabaseService } from "../database/database.service";
import { users } from "../database/schema";
import { isDemoAccount, readAuthSecret } from "./auth.config";

async function createAdmin() {
  readAuthSecret();
  const input = registerSchema.omit({ username: true }).extend({ displayName: z.string().trim().min(2).max(80) }).parse({ email: process.env.VALRIFY_BOOTSTRAP_ADMIN_EMAIL, password: process.env.VALRIFY_BOOTSTRAP_ADMIN_PASSWORD, displayName: process.env.VALRIFY_BOOTSTRAP_ADMIN_NAME ?? "Admin Valrify" });
  const id = randomUUID(), email = input.email.toLowerCase();
  if (isDemoAccount({ id, email }) || input.password === "DemoPass!2026") throw new Error("Gunakan email nyata dan password unik untuk admin.");
  const database = new DatabaseService();
  try {
    if (await database.db.query.users.findFirst({ where: eq(users.email, email) })) throw new Error("Email sudah terdaftar. Script ini tidak mengubah role atau password akun yang ada.");
    await database.db.insert(users).values({ id, email, displayName: input.displayName, passwordHash: await hash(input.password, 12), role: "ADMIN", emailVerifiedAt: new Date() });
    console.log("Akun admin dibuat. Hapus environment bootstrap password setelah selesai.");
  } finally { await database.onModuleDestroy(); }
}
void createAdmin().catch(() => { console.error("Admin gagal dibuat. Periksa input bootstrap, email yang sudah terdaftar, dan koneksi database."); process.exitCode = 1; });

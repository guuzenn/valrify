import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { maskIdentifier, normalizeIdentifier } from "@vlrfy/domain";
import {
  entities,
  entityIdentifiers,
  identifiers,
  moderationActions,
  reportIdentifiers,
  reports,
  reportStatusHistory,
  transactionConfirmations,
  users,
} from "./schema";

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://vlrfy:vlrfy_dev@localhost:5434/vlrfy",
  });
  const db = drizzle(pool);
  const adminEmail = process.env.VLRFY_ADMIN_EMAIL ?? "admin@vlrfy.local";
  const passwordHash = await hash(
    process.env.VLRFY_DEMO_PASSWORD ?? "DemoPass!2026",
    12,
  );

  await db
    .insert(users)
    .values([
      {
        id: "demo-admin",
        email: adminEmail,
        displayName: "Admin VLRFY",
        passwordHash,
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      },
      {
        id: "demo-reporter",
        email: "reporter.demo@vlrfy.invalid",
        displayName: "Anggota Demo",
        role: "USER",
        emailVerifiedAt: new Date(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(entities)
    .values({
      slug: "arkanusa-demo",
      displayName: "ArkaNusa Demo",
      description:
        "Profil fiktif untuk demonstrasi data pengembangan VLRFY.",
    })
    .onConflictDoNothing();
  const entity = (
    await db.select().from(entities).where(eq(entities.slug, "arkanusa-demo"))
  )[0];
  if (!entity) throw new Error("Seed entity gagal");

  const demoIdentifiers = [
    { type: "PERSON_NAME" as const, rawValue: "ArkaNusa Demo" },
    { type: "PHONE" as const, rawValue: "0800 0000 0901" },
    { type: "DISCORD" as const, rawValue: "arkanusa.demo" },
    { type: "RIOT_ID" as const, rawValue: "ArkaDemo#VLRFY" },
  ];
  const identifierRows: Array<typeof identifiers.$inferSelect> = [];
  for (const item of demoIdentifiers) {
    const normalizedValue = normalizeIdentifier(item.type, item.rawValue);
    await db
      .insert(identifiers)
      .values({
        type: item.type,
        rawValue: item.rawValue,
        normalizedValue,
        maskedValue: maskIdentifier(item.type, item.rawValue),
      })
      .onConflictDoNothing();
    const row = (
      await db
        .select()
        .from(identifiers)
        .where(
          and(
            eq(identifiers.type, item.type),
            eq(identifiers.normalizedValue, normalizedValue),
          ),
        )
    )[0];
    if (!row) throw new Error(`Seed identifier ${item.type} gagal`);
    identifierRows.push(row);
    await db
      .insert(entityIdentifiers)
      .values({
        entityId: entity.id,
        identifierId: row.id,
        isPrimary: item.type === "PHONE",
      })
      .onConflictDoNothing();
  }

  await db
    .insert(reports)
    .values({
      publicId: "VLR-DEMO-0001",
      reporterId: "demo-reporter",
      entityId: entity.id,
      title: "Akun tidak diterima setelah pembayaran",
      chronology: "Data kronologi fiktif untuk demo.",
      publicSummary:
        "Pelapor menyatakan pembayaran telah dikirim, tetapi akses akun yang disepakati tidak diterima. Bukti transaksi dan percakapan telah ditinjau moderator.",
      transactionDate: new Date("2026-08-12"),
      allegedLoss: 850_000,
      transactionType: "ACCOUNT_PURCHASE",
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-14T09:00:00Z"),
    })
    .onConflictDoNothing();
  const report = (
    await db
      .select()
      .from(reports)
      .where(eq(reports.publicId, "VLR-DEMO-0001"))
  )[0];
  if (!report) throw new Error("Seed report gagal");

  for (const identifier of identifierRows) {
    await db
      .insert(reportIdentifiers)
      .values({ reportId: report.id, identifierId: identifier.id })
      .onConflictDoNothing();
  }
  const existingHistory = await db
    .select({ id: reportStatusHistory.id })
    .from(reportStatusHistory)
    .where(eq(reportStatusHistory.reportId, report.id))
    .limit(1);
  if (existingHistory.length === 0) {
    await db.insert(reportStatusHistory).values({
      reportId: report.id,
      fromStatus: "VERIFIED",
      toStatus: "PUBLISHED",
      actorId: "demo-admin",
      note: "Publikasi data fiktif untuk development.",
    });
    await db.insert(moderationActions).values({
      reportId: report.id,
      actorId: "demo-admin",
      action: "REPORT_PUBLISHED",
      rationale: "Data demo fiktif untuk menguji vertical slice.",
    });
    await db.insert(transactionConfirmations).values({
      userId: "demo-reporter",
      entityId: entity.id,
      transactionDate: new Date("2026-07-20"),
      amount: 300_000,
      note: "Konfirmasi transaksi fiktif.",
      status: "APPROVED",
    });
  }

  await pool.end();
  console.log("VLRFY fictional seed ready");
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

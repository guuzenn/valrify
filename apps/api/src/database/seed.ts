import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { maskIdentifier, normalizeIdentifier } from "@valrify/domain";
import {
  communityPosts,
  communityPostLikes,
  communityPostReports,
  communityComments,
  communityCommentLikes,
  communityCommentReports,
  entities,
  entityIdentifiers,
  identifiers,
  moderationActions,
  notifications,
  reportIdentifiers,
  reports,
  reportStatusHistory,
  transactionConfirmations,
  users,
} from "./schema";

type IdentifierType = Parameters<typeof normalizeIdentifier>[0];
type DemoIdentifier = { type: IdentifierType; rawValue: string; provider?: string; primary?: boolean };
type DemoReport = {
  publicId: string;
  reporterId: string;
  title: string;
  chronology: string;
  publicSummary: string;
  evidenceUrl?: string;
  transactionDate: string;
  allegedLoss: number;
  transactionType: string;
  publishedAt: string;
  identifiers: DemoIdentifier[];
};
type DemoEntity = {
  slug: string;
  displayName: string;
  description: string;
  identifiers: DemoIdentifier[];
  reports: DemoReport[];
};

const sharedBankAccount: DemoIdentifier = {
  type: "BANK_ACCOUNT",
  rawValue: "9999 0000 1111",
  provider: "BCA",
  primary: true,
};
const sharedMarketplaceUsername: DemoIdentifier = {
  type: "DISCORD",
  rawValue: "relay.market.demo",
};
const sharedBankAccountHolder: DemoIdentifier = {
  type: "BANK_ACCOUNT_NAME",
  rawValue: "Anton Karsa Demo",
  provider: "BCA",
};

const demoEntities: DemoEntity[] = [
  {
    slug: "arkanusa-demo",
    displayName: "ArkaNusa Demo",
    description: "Profil fiktif dengan satu laporan untuk demonstrasi Valrify.",
    identifiers: [
      { type: "PERSON_NAME", rawValue: "ArkaNusa Demo" },
      { type: "PERSON_NAME", rawValue: "Tora Kencana Demo" },
      { type: "PHONE", rawValue: "0800 0000 0901", primary: true },
      { type: "DISCORD", rawValue: "arkanusa.demo" },
      { type: "RIOT_ID", rawValue: "ArkaDemo#VALRIFY" },
      { type: "RIOT_NICKNAME", rawValue: "ArkaPrime#DEMO", provider: "Riot" },
    ],
    reports: [
      {
        publicId: "VLR-DEMO-0001",
        reporterId: "demo-reporter",
        title: "Akun tidak diterima setelah pembayaran",
        chronology: "Data kronologi fiktif untuk demo kasus tunggal.",
        publicSummary: "Pelapor menyatakan pembayaran telah dikirim, tetapi akses akun yang disepakati tidak diterima. Bukti transaksi dan percakapan telah ditinjau moderator.",
        transactionDate: "2026-08-12",
        allegedLoss: 850_000,
        transactionType: "ACCOUNT_PURCHASE",
        publishedAt: "2026-08-14T09:00:00Z",
        identifiers: [
          { type: "PHONE", rawValue: "0800 0000 0901" },
          { type: "PERSON_NAME", rawValue: "Tora Kencana Demo" },
          { type: "DISCORD", rawValue: "arkanusa.demo" },
          { type: "RIOT_ID", rawValue: "ArkaDemo#VALRIFY" },
          { type: "RIOT_NICKNAME", rawValue: "ArkaPrime#DEMO", provider: "Riot" },
        ],
      },
    ],
  },
  {
    slug: "senja-vault-demo",
    displayName: "Senja Vault Demo",
    description: "Profil fiktif dengan kasus tunggal dan identifier unik.",
    identifiers: [
      { type: "PERSON_NAME", rawValue: "Senja Vault Demo" },
      { type: "FACEBOOK_NAME", rawValue: "Tomi Senja Demo" },
      { type: "PHONE", rawValue: "0800 0000 0902", primary: true },
      { type: "EWALLET", rawValue: "0800 0000 1902", provider: "DANA" },
      { type: "EWALLET_ACCOUNT_NAME", rawValue: "Tomi Senja Demo", provider: "DANA" },
      { type: "RIOT_ID", rawValue: "SenjaVault#DEMO" },
      { type: "RIOT_NICKNAME", rawValue: "SenjaPrime#DEMO", provider: "Riot" },
    ],
    reports: [
      {
        publicId: "VLR-DEMO-0002",
        reporterId: "demo-reporter-2",
        title: "Akses akun berubah setelah serah terima",
        chronology: "Kronologi fiktif: akses akun berubah setelah transaksi dinyatakan selesai.",
        publicSummary: "Pelapor menyatakan akses akun berubah setelah proses serah terima. Bukti percakapan dan riwayat perubahan akses telah diperiksa moderator.",
        transactionDate: "2026-08-10",
        allegedLoss: 425_000,
        transactionType: "ACCOUNT_PURCHASE",
        publishedAt: "2026-08-15T04:30:00Z",
        identifiers: [
          { type: "PHONE", rawValue: "0800 0000 0902" },
          { type: "FACEBOOK_NAME", rawValue: "Tomi Senja Demo" },
          { type: "EWALLET", rawValue: "0800 0000 1902", provider: "DANA" },
          { type: "EWALLET_ACCOUNT_NAME", rawValue: "Tomi Senja Demo", provider: "DANA" },
          { type: "RIOT_ID", rawValue: "SenjaVault#DEMO" },
          { type: "RIOT_NICKNAME", rawValue: "SenjaPrime#DEMO", provider: "Riot" },
        ],
      },
    ],
  },
  {
    slug: "karsa-store-demo",
    displayName: "Karsa Store Demo",
    description: "Profil fiktif yang terhubung ke profil lain melalui rekening dan username yang sama.",
    identifiers: [
      { type: "PERSON_NAME", rawValue: "Karsa Store Demo" },
      { type: "PHONE", rawValue: "0800 0000 0903" },
      sharedBankAccount,
      sharedBankAccountHolder,
      sharedMarketplaceUsername,
      { type: "RIOT_ID", rawValue: "KarsaStore#DEMO" },
      { type: "RIOT_NICKNAME", rawValue: "KarsaPrime#DEMO", provider: "Riot" },
    ],
    reports: [
      {
        publicId: "VLR-DEMO-0003",
        reporterId: "demo-reporter-3",
        title: "Pembayaran masuk ke rekening terkait",
        chronology: "Kronologi fiktif: pembayaran dikirim ke rekening demo, lalu penjual berhenti merespons.",
        publicSummary: "Pelapor menyatakan pembayaran dikirim ke rekening yang tercantum dalam percakapan, tetapi akun tidak diserahkan. Rekening tersebut juga muncul pada laporan lain.",
        evidenceUrl: "https://www.facebook.com/groups/valrify.demo/posts/vlr-demo-0003",
        transactionDate: "2026-08-05",
        allegedLoss: 1_250_000,
        transactionType: "ACCOUNT_PURCHASE",
        publishedAt: "2026-08-16T07:15:00Z",
        identifiers: [
          { type: "PHONE", rawValue: "0800 0000 0903" },
          sharedBankAccount,
          sharedBankAccountHolder,
          sharedMarketplaceUsername,
          { type: "RIOT_ID", rawValue: "KarsaStore#DEMO" },
          { type: "RIOT_NICKNAME", rawValue: "KarsaPrime#DEMO", provider: "Riot" },
        ],
      },
      {
        publicId: "VLR-DEMO-0004",
        reporterId: "demo-middleman",
        title: "Penjual tidak melanjutkan proses penggantian email",
        chronology: "Kronologi fiktif dari pelapor berbeda untuk profil dan rekening demo yang sama.",
        publicSummary: "Pelapor lain menyatakan proses penggantian email tidak dilanjutkan setelah pembayaran. Moderator menemukan rekening dan username yang sama dengan laporan sebelumnya.",
        transactionDate: "2026-08-09",
        allegedLoss: 675_000,
        transactionType: "ACCOUNT_PURCHASE",
        publishedAt: "2026-08-17T10:00:00Z",
        identifiers: [sharedBankAccount, sharedBankAccountHolder, sharedMarketplaceUsername],
      },
    ],
  },
  {
    slug: "rift-supply-demo",
    displayName: "Rift Supply Demo",
    description: "Profil fiktif kedua yang memakai rekening dan username sama pada laporan terpisah.",
    identifiers: [
      { type: "PERSON_NAME", rawValue: "Rift Supply Demo" },
      { type: "PHONE", rawValue: "0800 0000 0904" },
      sharedBankAccount,
      sharedBankAccountHolder,
      sharedMarketplaceUsername,
      { type: "FACEBOOK_NAME", rawValue: "Riftanto Demo" },
      { type: "RIOT_ID", rawValue: "RiftSupply#DEMO" },
      { type: "RIOT_NICKNAME", rawValue: "RiftPrime#DEMO", provider: "Riot" },
    ],
    reports: [
      {
        publicId: "VLR-DEMO-0005",
        reporterId: "demo-admin",
        title: "Profil berbeda menggunakan rekening yang sama",
        chronology: "Kronologi fiktif: nama profil berbeda mengarahkan pembayaran ke rekening demo yang sudah muncul pada laporan lain.",
        publicSummary: "Pelapor berinteraksi dengan profil berbeda, tetapi diarahkan ke rekening dan username yang sama dengan dua laporan lain. Hubungan identifier telah diperiksa moderator.",
        evidenceUrl: "https://www.facebook.com/groups/valrify.demo/posts/vlr-demo-0005",
        transactionDate: "2026-08-11",
        allegedLoss: 980_000,
        transactionType: "ACCOUNT_PURCHASE",
        publishedAt: "2026-08-18T03:45:00Z",
        identifiers: [
          { type: "PHONE", rawValue: "0800 0000 0904" },
          sharedBankAccount,
          sharedBankAccountHolder,
          sharedMarketplaceUsername,
          { type: "FACEBOOK_NAME", rawValue: "Riftanto Demo" },
          { type: "RIOT_ID", rawValue: "RiftSupply#DEMO" },
          { type: "RIOT_NICKNAME", rawValue: "RiftPrime#DEMO", provider: "Riot" },
        ],
      },
    ],
  },
];

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://valrify:valrify_dev@localhost:5434/valrify",
  });
  const db = drizzle(pool);
  const adminEmail = process.env.VALRIFY_ADMIN_EMAIL ?? "admin@valrify.local";
  const passwordHash = await hash(process.env.VALRIFY_DEMO_PASSWORD ?? "DemoPass!2026", 12);

  await db.insert(users).values([
    { id: "demo-admin", email: adminEmail, displayName: "Admin Valrify", username: "admin_valrify_demo", bio: "Tim moderasi Valrify. Meninjau laporan dan menjaga data komunitas tetap rapi.", passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
    { id: "demo-reporter", email: "reporter.demo@valrify.invalid", displayName: "Anggota Demo 1", username: "anggota_demo_1", bio: "Anggota komunitas jual beli akun Valorant.", passwordHash, role: "USER", emailVerifiedAt: new Date() },
    { id: "demo-reporter-2", email: "reporter2.demo@valrify.invalid", displayName: "Anggota Demo 2", passwordHash, role: "USER", emailVerifiedAt: new Date() },
    { id: "demo-reporter-3", email: "reporter3.demo@valrify.invalid", displayName: "Anggota Demo 3", passwordHash, role: "USER", emailVerifiedAt: new Date() },
    { id: "demo-reporter-4", email: "reporter4.demo@valrify.invalid", displayName: "Anggota Demo 4", passwordHash, role: "USER", emailVerifiedAt: new Date() },
    { id: "demo-middleman", email: "middleman.demo@valrify.invalid", displayName: "Rekber Nusantara Demo", username: "rekber_nusantara_demo", bio: "Verified middleman demo untuk transaksi komunitas.", passwordHash, role: "VERIFIED_MIDDLEMAN", emailVerifiedAt: new Date() },
    { id: "demo-moderator", email: "moderator.demo@valrify.invalid", displayName: "Moderator Valrify Demo", username: "moderator_valrify_demo", bio: "Moderator komunitas Valrify.", passwordHash, role: "MODERATOR", emailVerifiedAt: new Date() },
  ]).onConflictDoNothing();

  await db.insert(users).values({
    id: "demo-tester",
    email: "tester@valrify.local",
    displayName: "User Tester",
    username: "user_tester",
    bio: "Akun demo untuk mencoba fitur komunitas Valrify.",
    passwordHash,
    role: "USER",
    emailVerifiedAt: new Date(),
  }).onConflictDoUpdate({
    target: users.email,
    set: { displayName: "User Tester", username: "user_tester", bio: "Akun demo untuk mencoba fitur komunitas Valrify.", passwordHash, role: "USER", emailVerifiedAt: new Date() },
  });
  await Promise.all([
    db.update(users).set({ username: "admin_valrify_demo", bio: "Tim moderasi Valrify. Meninjau laporan dan menjaga data komunitas tetap rapi.", passwordHash }).where(eq(users.id, "demo-admin")),
    db.update(users).set({ username: "anggota_demo_1", bio: "Anggota komunitas jual beli akun Valorant.", passwordHash }).where(eq(users.id, "demo-reporter")),
    db.update(users).set({ username: "rekber_nusantara_demo", bio: "Verified middleman demo untuk transaksi komunitas.", passwordHash }).where(eq(users.id, "demo-middleman")),
    db.update(users).set({ username: "moderator_valrify_demo", bio: "Moderator komunitas Valrify.", passwordHash }).where(eq(users.id, "demo-moderator")),
  ]);
  const testerUser = (await db.select().from(users).where(eq(users.email, "tester@valrify.local")))[0];
  if (!testerUser) throw new Error("Seed user tester gagal");

  async function upsertIdentifier(item: DemoIdentifier) {
    const normalizedValue = normalizeIdentifier(item.type, item.rawValue);
    const maskedValue = maskIdentifier(item.type, item.rawValue, item.provider);
    await db.insert(identifiers).values({
      type: item.type,
      rawValue: item.rawValue,
      normalizedValue,
      maskedValue,
      provider: item.provider,
    }).onConflictDoUpdate({
      target: [identifiers.type, identifiers.normalizedValue],
      set: { rawValue: item.rawValue, maskedValue, provider: item.provider },
    });
    const row = (await db.select().from(identifiers).where(and(
      eq(identifiers.type, item.type),
      eq(identifiers.normalizedValue, normalizedValue),
    )))[0];
    if (!row) throw new Error(`Seed identifier ${item.type} gagal`);
    return row;
  }

  for (const fixture of demoEntities) {
    await db.insert(entities).values({
      slug: fixture.slug,
      displayName: fixture.displayName,
      description: fixture.description,
    }).onConflictDoUpdate({
      target: entities.slug,
      set: { displayName: fixture.displayName, description: fixture.description },
    });
    const entity = (await db.select().from(entities).where(eq(entities.slug, fixture.slug)))[0];
    if (!entity) throw new Error(`Seed entity ${fixture.slug} gagal`);

    for (const item of fixture.identifiers) {
      const identifier = await upsertIdentifier(item);
      await db.insert(entityIdentifiers).values({
        entityId: entity.id,
        identifierId: identifier.id,
        isPrimary: item.primary ?? false,
      }).onConflictDoNothing();
    }

    for (const fixtureReport of fixture.reports) {
      const reportValues = {
        reporterId: fixtureReport.reporterId,
        entityId: entity.id,
        title: fixtureReport.title,
        chronology: fixtureReport.chronology,
        publicSummary: fixtureReport.publicSummary,
        evidenceUrl: fixtureReport.evidenceUrl,
        transactionDate: new Date(fixtureReport.transactionDate),
        allegedLoss: fixtureReport.allegedLoss,
        transactionType: fixtureReport.transactionType,
        status: "PUBLISHED" as const,
        publishedAt: new Date(fixtureReport.publishedAt),
        updatedAt: new Date(fixtureReport.publishedAt),
      };
      await db.insert(reports).values({ publicId: fixtureReport.publicId, ...reportValues }).onConflictDoUpdate({
        target: reports.publicId,
        set: reportValues,
      });
      const report = (await db.select().from(reports).where(eq(reports.publicId, fixtureReport.publicId)))[0];
      if (!report) throw new Error(`Seed report ${fixtureReport.publicId} gagal`);

      for (const item of fixtureReport.identifiers) {
        const identifier = await upsertIdentifier(item);
        await db.insert(reportIdentifiers).values({ reportId: report.id, identifierId: identifier.id }).onConflictDoNothing();
      }

      const existingHistory = await db.select({ id: reportStatusHistory.id }).from(reportStatusHistory).where(eq(reportStatusHistory.reportId, report.id)).limit(1);
      if (existingHistory.length === 0) {
        await db.insert(reportStatusHistory).values({
          reportId: report.id,
          fromStatus: "VERIFIED",
          toStatus: "PUBLISHED",
          actorId: "demo-moderator",
          note: "Publikasi data fiktif untuk development.",
        });
        await db.insert(moderationActions).values({
          reportId: report.id,
          actorId: "demo-moderator",
          action: "REPORT_PUBLISHED",
          rationale: "Data demo fiktif untuk menguji hubungan antarkasus.",
        });
      }
    }
  }

  const arkaEntity = (await db.select().from(entities).where(eq(entities.slug, "arkanusa-demo")))[0];
  if (arkaEntity) {
    await db.insert(transactionConfirmations).values({
      userId: "demo-reporter",
      entityId: arkaEntity.id,
      transactionDate: new Date("2026-07-20"),
      amount: 300_000,
      note: "Konfirmasi transaksi fiktif.",
      status: "APPROVED",
    }).onConflictDoNothing();

    const pendingReportValues = {
      reporterId: testerUser.id,
      entityId: arkaEntity.id,
      title: "Pembayaran dikirim tetapi proses akun berhenti",
      chronology: "Laporan fiktif untuk latihan moderasi. Pelapor menyatakan sudah mengirim pembayaran melalui rekber, tetapi seller berhenti merespons sebelum data akun diberikan. Percakapan, waktu transfer, dan data rekening perlu dicocokkan oleh admin sebelum laporan diterbitkan.",
      publicSummary: "",
      evidenceUrl: "https://www.facebook.com/groups/valrify.demo/posts/pending-review",
      transactionDate: new Date("2026-08-20"),
      allegedLoss: 725_000,
      transactionType: "ACCOUNT_PURCHASE",
      status: "SUBMITTED" as const,
      publishedAt: null,
      updatedAt: new Date(),
    };
    await db.insert(reports).values({ publicId: "VLR-DEMO-REVIEW-01", ...pendingReportValues }).onConflictDoUpdate({
      target: reports.publicId,
      set: pendingReportValues,
    });
    const pendingReport = (await db.select().from(reports).where(eq(reports.publicId, "VLR-DEMO-REVIEW-01")))[0];
    if (pendingReport) {
      for (const item of [
        { type: "PHONE" as const, rawValue: "0800 0000 0901" },
        { type: "RIOT_ID" as const, rawValue: "ArkaDemo#VALRIFY" },
      ]) {
        const identifier = await upsertIdentifier(item);
        await db.insert(reportIdentifiers).values({ reportId: pendingReport.id, identifierId: identifier.id }).onConflictDoNothing();
      }
    }
  }

  const senjaEntity = (await db.select().from(entities).where(eq(entities.slug, "senja-vault-demo")))[0];
  if (senjaEntity) {
    const demoConfirmation = {
      userId: testerUser.id,
      entityId: senjaEntity.id,
      transactionDate: new Date("2026-08-21"),
      amount: 540_000,
      note: "Testi fiktif. Transaksi selesai melalui rekber dan data akun sudah diamankan oleh pembeli.",
      status: "APPROVED",
      moderationNote: "",
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: new Date(),
    };
    await db.insert(transactionConfirmations).values(demoConfirmation).onConflictDoUpdate({
      target: [transactionConfirmations.userId, transactionConfirmations.entityId, transactionConfirmations.transactionDate],
      set: demoConfirmation,
    });
  }

  for (const post of [
    { authorId: "demo-admin", body: "Selamat datang di Community Valrify. Pakai ruang ini untuk berbagi tips dan pengalaman. Kalau mau melaporkan scam, tetap gunakan form laporan supaya bukti bisa diperiksa admin.", createdAt: new Date("2026-08-22T03:00:00.000Z") },
    { authorId: "demo-middleman", body: "Tips singkat sebelum transaksi: pastikan nomor rekber berasal dari halaman resmi atau kontak yang memang sudah kamu simpan. Jangan percaya nomor alternatif yang hanya dikirim seller lewat chat.", createdAt: new Date("2026-08-22T04:15:00.000Z") },
    { authorId: "demo-reporter", body: "Ada yang biasa cek riwayat ticket Riot dulu sebelum mengamankan akun? Menurutku bagian username di ticket penting banget supaya tidak salah baca ticket akun lain.", createdAt: new Date("2026-08-22T05:30:00.000Z") },
    { authorId: testerUser.id, body: "Baru coba fitur profil komunitas Valrify. Semoga nanti bisa jadi tempat berbagi pengalaman transaksi yang tetap rapi dan gampang dicari.", createdAt: new Date("2026-08-22T06:45:00.000Z") },
  ]) {
    const [existingPost] = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.authorId, post.authorId), eq(communityPosts.body, post.body))).limit(1);
    if (existingPost) await db.update(communityPosts).set({ body: post.body, status: "PUBLISHED", createdAt: post.createdAt, updatedAt: post.createdAt }).where(eq(communityPosts.id, existingPost.id));
    else await db.insert(communityPosts).values(post);
  }
  const testerPostBody = "Baru coba fitur profil komunitas Valrify. Semoga nanti bisa jadi tempat berbagi pengalaman transaksi yang tetap rapi dan gampang dicari.";
  const [testerDemoPost] = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.authorId, testerUser.id), eq(communityPosts.body, testerPostBody))).limit(1);
  if (testerDemoPost) {
    await db.insert(communityPostLikes).values({ postId: testerDemoPost.id, userId: "demo-admin" }).onConflictDoNothing();
    await db.insert(notifications).values({ recipientId: testerUser.id, actorId: "demo-admin", type: "POST_LIKED", eventKey: `post-like:${testerDemoPost.id}:demo-admin`, postId: testerDemoPost.id, createdAt: new Date("2026-08-22T08:00:00.000Z") }).onConflictDoUpdate({
      target: notifications.eventKey,
      set: { readAt: null, createdAt: new Date("2026-08-22T08:00:00.000Z") },
    });
  }
  const [reportedDemoPost] = await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.authorId, "demo-middleman")).orderBy(communityPosts.id).limit(1);
  if (reportedDemoPost) {
    await db.insert(communityPostLikes).values([{ postId: reportedDemoPost.id, userId: "demo-admin" }, { postId: reportedDemoPost.id, userId: "demo-reporter" }]).onConflictDoNothing();
    await db.insert(communityPostReports).values({
      postId: reportedDemoPost.id,
      reporterId: testerUser.id,
      reason: "PERSONAL_DATA",
      detail: "Laporan dummy untuk mengecek antrean moderator. Mohon pastikan contoh post ini tidak membagikan data kontak pribadi.",
    }).onConflictDoUpdate({
      target: [communityPostReports.postId, communityPostReports.reporterId],
      set: { reason: "PERSONAL_DATA", detail: "Laporan dummy untuk mengecek antrean moderator. Mohon pastikan contoh post ini tidak membagikan data kontak pribadi.", status: "PENDING", reviewedBy: null, reviewedAt: null, resolution: "" },
    });
  }
  const [welcomePost] = await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.authorId, "demo-admin")).orderBy(communityPosts.id).limit(1);
  if (welcomePost) {
    await db.insert(communityPostLikes).values([{ postId: welcomePost.id, userId: testerUser.id }, { postId: welcomePost.id, userId: "demo-middleman" }, { postId: welcomePost.id, userId: "demo-reporter" }]).onConflictDoNothing();
    for (const comment of [
      { postId: welcomePost.id, authorId: "demo-middleman", body: "Setuju. Kalau ada indikasi scam lebih baik masuk lewat form laporan supaya data dan buktinya tidak tercecer.", createdAt: new Date("2026-08-22T07:00:00.000Z") },
      { postId: welcomePost.id, authorId: "demo-reporter", body: "Semoga nanti diskusinya tetap gampang dibaca walau sudah ramai. Thread komentar seperti ini cukup membantu.", createdAt: new Date("2026-08-22T07:10:00.000Z") },
      { postId: welcomePost.id, authorId: testerUser.id, body: "Siap ikut menjaga obrolannya tetap aman dan tidak menyebarkan data pribadi.", createdAt: new Date("2026-08-22T07:20:00.000Z") },
    ]) {
      const [existingComment] = await db.select({ id: communityComments.id }).from(communityComments).where(and(eq(communityComments.authorId, comment.authorId), eq(communityComments.body, comment.body))).limit(1);
      if (existingComment) await db.update(communityComments).set({ postId: comment.postId, status: "PUBLISHED", createdAt: comment.createdAt, updatedAt: comment.createdAt }).where(eq(communityComments.id, existingComment.id));
      else await db.insert(communityComments).values(comment);
    }
    const [firstComment] = await db.select({ id: communityComments.id }).from(communityComments).where(and(eq(communityComments.postId, welcomePost.id), eq(communityComments.authorId, "demo-middleman"))).orderBy(communityComments.id).limit(1);
    const [reportedComment] = await db.select({ id: communityComments.id }).from(communityComments).where(and(eq(communityComments.postId, welcomePost.id), eq(communityComments.authorId, "demo-reporter"))).orderBy(communityComments.id).limit(1);
    const [testerComment] = await db.select({ id: communityComments.id }).from(communityComments).where(and(eq(communityComments.postId, welcomePost.id), eq(communityComments.authorId, testerUser.id))).orderBy(communityComments.id).limit(1);
    if (firstComment && reportedComment) await db.update(communityComments).set({ replyToCommentId: firstComment.id }).where(eq(communityComments.id, reportedComment.id));
    if (reportedComment && testerComment) await db.update(communityComments).set({ replyToCommentId: reportedComment.id }).where(eq(communityComments.id, testerComment.id));
    if (firstComment) await db.insert(communityCommentLikes).values([{ commentId: firstComment.id, userId: testerUser.id }, { commentId: firstComment.id, userId: "demo-admin" }]).onConflictDoNothing();
    if (reportedComment) await db.insert(communityCommentLikes).values({ commentId: reportedComment.id, userId: "demo-middleman" }).onConflictDoNothing();
    if (firstComment) {
      await db.insert(notifications).values({ recipientId: "demo-admin", actorId: "demo-middleman", type: "POST_REPLIED", eventKey: `reply:${firstComment.id}`, postId: welcomePost.id, commentId: firstComment.id, createdAt: new Date("2026-08-22T07:00:00.000Z") }).onConflictDoUpdate({ target: notifications.eventKey, set: { readAt: null, createdAt: new Date("2026-08-22T07:00:00.000Z") } });
      await db.insert(notifications).values({ recipientId: "demo-middleman", actorId: testerUser.id, type: "COMMENT_LIKED", eventKey: `comment-like:${firstComment.id}:${testerUser.id}`, postId: welcomePost.id, commentId: firstComment.id, createdAt: new Date("2026-08-22T07:25:00.000Z") }).onConflictDoUpdate({ target: notifications.eventKey, set: { readAt: null, createdAt: new Date("2026-08-22T07:25:00.000Z") } });
    }
    if (reportedComment) await db.insert(notifications).values({ recipientId: "demo-middleman", actorId: "demo-reporter", type: "COMMENT_REPLIED", eventKey: `reply:${reportedComment.id}`, postId: welcomePost.id, commentId: reportedComment.id, createdAt: new Date("2026-08-22T07:10:00.000Z") }).onConflictDoUpdate({ target: notifications.eventKey, set: { readAt: null, createdAt: new Date("2026-08-22T07:10:00.000Z") } });
    if (reportedComment) {
      await db.insert(communityCommentReports).values({ commentId: reportedComment.id, reporterId: testerUser.id, reason: "HARASSMENT", detail: "Laporan komentar dummy untuk menguji tab moderation comment dan memastikan identitas pelapor tetap privat." }).onConflictDoUpdate({
        target: [communityCommentReports.commentId, communityCommentReports.reporterId],
        set: { reason: "HARASSMENT", detail: "Laporan komentar dummy untuk menguji tab moderation comment dan memastikan identitas pelapor tetap privat.", status: "PENDING", reviewedBy: null, reviewedAt: null, resolution: "" },
      });
    }
  }

  await pool.end();
  console.log("Valrify fictional seed ready: public cases, one report for admin review, and one public testi");
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

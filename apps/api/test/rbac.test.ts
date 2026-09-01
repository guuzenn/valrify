import assert from "node:assert/strict";
import test from "node:test";
import { canModerate, canTransition } from "@valrify/domain";
import {
  confirmationSchema,
  publicProfileSchema,
  reportSchema,
} from "@valrify/validation";
import { createEvidenceStorage } from "../src/storage/evidence-storage.factory";
import { LocalEvidenceStorage } from "../src/storage/local-evidence-storage.service";
import {
  R2EvidenceStorage,
  R2ObjectClient,
  R2StorageConfig,
  readR2StorageConfig,
} from "../src/storage/r2-evidence-storage.service";

test("moderation roles and publish lifecycle", () => {
  assert.equal(canModerate("USER"), false);
  assert.equal(canModerate("ADMIN"), true);
  assert.equal(canTransition("SUBMITTED", "PUBLISHED"), false);
  assert.equal(canTransition("VERIFIED", "PUBLISHED"), true);
});

test("successful transaction input is constrained", () => {
  assert.equal(
    confirmationSchema.safeParse({
      entityId: 1,
      transactionDate: "2026-08-20",
      amount: 300000,
      note: "Transaksi demo berhasil.",
    }).success,
    true,
  );
  assert.equal(
    confirmationSchema.safeParse({
      entityId: 1,
      transactionDate: "bad",
      amount: -1,
      note: "pendek",
    }).success,
    false,
  );
});

test("reports accept multiple account identifiers", () => {
  const result = reportSchema.safeParse({
    entityName: "Seller Demo",
    chronology:
      "Kronologi transaksi ini cukup panjang untuk memenuhi validasi laporan dan menjelaskan kejadian secara lengkap.",
    identifiers: JSON.stringify([
      { type: "PHONE", value: "081234567890" },
      { type: "BANK_ACCOUNT", value: "1234567890", provider: "BCA" },
    ]),
    transactionDate: "2026-08-20",
    category: "PAYMENT_FRAUD",
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.identifiers.length, 2);
});

test("reports accept a public evidence post link", () => {
  const result = reportSchema.safeParse({
    entityName: "Seller Demo",
    chronology:
      "Kronologi transaksi ini cukup panjang untuk memenuhi validasi laporan dan menjelaskan kejadian secara lengkap.",
    identifiers: JSON.stringify([
      { type: "BANK_ACCOUNT", value: "1234567890", provider: "BCA" },
    ]),
    evidenceUrl: "https://www.facebook.com/groups/demo/posts/123",
    category: "FAKE_MIDDLEMAN",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(
      result.data.evidenceUrl,
      "https://www.facebook.com/groups/demo/posts/123",
    );
  }
});

test("public profile username is normalized and constrained", () => {
  const valid = publicProfileSchema.safeParse({
    username: "  Reyv_01  ",
    bio: "Anggota komunitas.",
  });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.username, "reyv_01");
  assert.equal(
    publicProfileSchema.safeParse({ username: "admin", bio: "" }).success,
    false,
  );
  assert.equal(
    publicProfileSchema.safeParse({ username: "nama pakai spasi", bio: "" })
      .success,
    false,
  );
});

const r2Config: R2StorageConfig = {
  endpoint: "https://account-id.r2.cloudflarestorage.com",
  bucket: "valrify-evidence-test",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  region: "auto",
};

test("storage selects local by default and R2 when configured", () => {
  assert.equal(createEvidenceStorage({}) instanceof LocalEvidenceStorage, true);
  assert.equal(
    createEvidenceStorage({
      STORAGE_DRIVER: "r2",
      STORAGE_ENDPOINT: r2Config.endpoint,
      STORAGE_BUCKET: r2Config.bucket,
      STORAGE_ACCESS_KEY: r2Config.accessKeyId,
      STORAGE_SECRET_KEY: r2Config.secretAccessKey,
      STORAGE_REGION: r2Config.region,
    }) instanceof R2EvidenceStorage,
    true,
  );
});

test("R2 configuration requires every private credential", () => {
  assert.throws(
    () => readR2StorageConfig({ STORAGE_DRIVER: "r2" }),
    /STORAGE_ENDPOINT wajib diisi/,
  );
  assert.throws(
    () =>
      readR2StorageConfig({
        STORAGE_ENDPOINT: "not-a-url",
        STORAGE_BUCKET: "bucket",
        STORAGE_ACCESS_KEY: "access",
        STORAGE_SECRET_KEY: "secret",
      }),
    /STORAGE_ENDPOINT harus berupa URL/,
  );
});

test("R2 adapter stores and retrieves evidence without changing metadata", async () => {
  const objects = new Map<string, Uint8Array>();
  let uploadedContentType = "";
  const client: R2ObjectClient = {
    async putObject(input) {
      uploadedContentType = input.contentType;
      objects.set(`${input.bucket}/${input.key}`, input.body);
    },
    async getObject(input) {
      const body = objects.get(`${input.bucket}/${input.key}`);
      if (!body) throw new Error("missing object");
      return body;
    },
  };
  const storage = new R2EvidenceStorage(r2Config, client, () => "fixed-id");
  const buffer = Buffer.from("private evidence");
  const file = {
    buffer,
    originalname: "bukti.png",
    mimetype: "image/png",
    size: buffer.length,
  } as Express.Multer.File;

  const stored = await storage.put(file, 42);

  assert.deepEqual(stored, {
    key: "42/fixed-id",
    fileName: "bukti.png",
    mimeType: "image/png",
    size: buffer.length,
  });
  assert.equal(uploadedContentType, "image/png");
  assert.deepEqual(await storage.get(stored.key), buffer);
  await assert.rejects(() => storage.get("../outside"), /Storage key tidak valid/);
});

test("unsupported storage drivers fail during application startup", () => {
  assert.throws(
    () => createEvidenceStorage({ STORAGE_DRIVER: "public-bucket" }),
    /STORAGE_DRIVER tidak didukung/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { communityCommentSchema, communityPostReportSchema, communityPostReviewSchema, communityPostSchema } from "@valrify/validation";

test("community posts trim content and enforce safe length bounds", () => {
  const valid = communityPostSchema.safeParse({ body: "  Tips transaksi lewat rekber resmi.  " });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.body, "Tips transaksi lewat rekber resmi.");
  assert.equal(communityPostSchema.safeParse({ body: "x" }).success, false);
  assert.equal(communityPostSchema.safeParse({ body: "x".repeat(1001) }).success, false);
});

test("community comments are concise and trimmed", () => {
  const valid = communityCommentSchema.safeParse({ body: "  Setuju, cek ticket Riot dulu.  ", replyToCommentId: 12 });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.body, "Setuju, cek ticket Riot dulu.");
    assert.equal(valid.data.replyToCommentId, 12);
  }
  assert.equal(communityCommentSchema.safeParse({ body: "x" }).success, false);
  assert.equal(communityCommentSchema.safeParse({ body: "x".repeat(501) }).success, false);
  assert.equal(communityCommentSchema.safeParse({ body: "Balasan valid", replyToCommentId: -1 }).success, false);
});

test("community reports and moderation decisions require useful context", () => {
  assert.equal(communityPostReportSchema.safeParse({ reason: "PERSONAL_DATA", detail: "Post menampilkan nomor telepon pribadi." }).success, true);
  assert.equal(communityPostReportSchema.safeParse({ reason: "UNKNOWN", detail: "Alasan yang cukup panjang." }).success, false);
  assert.equal(communityPostReportSchema.safeParse({ reason: "SPAM", detail: "pendek" }).success, false);
  assert.equal(communityPostReviewSchema.safeParse({ decision: "REMOVE", rationale: "Post membagikan data pribadi tanpa izin." }).success, true);
  assert.equal(communityPostReviewSchema.safeParse({ decision: "DELETE", rationale: "Alasan keputusan yang cukup panjang." }).success, false);
});

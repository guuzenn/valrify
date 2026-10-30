import assert from "node:assert/strict";
import test from "node:test";
import { reportEditSchema, reportSchema, reportFormImportSchema } from "@valrify/validation";

const input = { updatedAt: new Date().toISOString(), chronology: "Kronologi yang cukup panjang untuk menjelaskan perkara transaksi ini.", category: "FAKE_MIDDLEMAN", transactionDate: "", evidenceUrl: "", rationale: "Memisahkan pihak pengarah dan akun rekber berdasarkan bukti.", parties: [{ entityName: "Pengarah Demo", role: "REFERRER", identifiers: [{ type: "PHONE", value: "081234567890" }] }, { entityName: "Rekber Demo", role: "MIDDLEMAN", identifiers: [{ type: "FACEBOOK_NAME", value: "Rekber Demo" }] }] };

test("other category requires a short description on submission, import and edit", () => {
  const submission = { category: "OTHER", entityName: "Akun contoh", chronology: input.chronology, identifiers: [{ type: "PHONE", value: "081234567890" }] };
  for (const [schema, data] of [[reportSchema, submission], [reportFormImportSchema, submission], [reportEditSchema, { ...input, category: "OTHER" }]] as const) {
    for (const otherCategory of [undefined, "  ", "abcd", "x".repeat(101)]) assert.equal(schema.safeParse({ ...data, otherCategory }).success, false);
    const parsed = schema.safeParse({ ...data, otherCategory: "  Jaminan penggantian tidak dipenuhi  " });
    assert(parsed.success);
    assert.equal(parsed.data.otherCategory, "Jaminan penggantian tidak dipenuhi");
    assert(schema.safeParse({ ...data, category: "HACKBACK" }).success);
  }
});

test("report edits require reason, valid dates and separate ownership of strong identifiers", () => {
  assert(reportEditSchema.safeParse(input).success);
  assert(!reportEditSchema.safeParse({ ...input, rationale: "" }).success);
  assert(!reportEditSchema.safeParse({ ...input, transactionDate: "2026-02-30" }).success);
  assert(!reportEditSchema.safeParse({ ...input, evidenceUrl: "javascript:alert(1)" }).success);
  assert(!reportEditSchema.safeParse({ ...input, parties: [input.parties[0], { ...input.parties[1], identifiers: [{ type: "PHONE", value: "+62 812-3456-7890" }] }] }).success);
  assert(!reportEditSchema.safeParse({ ...input, parties: [{ ...input.parties[0], identifiers: [{ type: "BANK_ACCOUNT", value: "1234567890" }] }] }).success);
  assert(reportEditSchema.safeParse({ ...input, parties: [{ ...input.parties[0], identifiers: [{ type: "BANK_ACCOUNT", value: "1234567890", provider: "BCA" }] }, { ...input.parties[1], identifiers: [{ type: "BANK_ACCOUNT", value: "1234567890", provider: "SeaBank" }] }] }).success);
});

import assert from "node:assert/strict";
import test from "node:test";
import { reportSchema } from "@valrify/validation";

test("reports accept a bank account holder name", () => {
  const result = reportSchema.safeParse({
    entityName: "Seller Demo",
    title: "Akun tidak dikirim",
    chronology: "Kronologi transaksi ini cukup panjang untuk memenuhi validasi laporan dan menjelaskan kejadian secara lengkap.",
    identifiers: JSON.stringify([
      { type: "BANK_ACCOUNT", value: "1234567890", provider: "BCA" },
      { type: "BANK_ACCOUNT_NAME", value: "Anton Demo", provider: "BCA" },
    ]),
    category: "PAYMENT_FRAUD",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.identifiers.length, 2);
});

test("reports accept composite e-wallet, Riot, and Facebook identifiers", () => {
  const result = reportSchema.safeParse({
    entityName: "Seller Demo",
    title: "Akun tidak dikirim",
    chronology: "Kronologi transaksi ini cukup panjang untuk memenuhi validasi laporan dan menjelaskan kejadian secara lengkap.",
    identifiers: JSON.stringify([
      { type: "EWALLET", value: "08000000000", provider: "DANA" },
      { type: "EWALLET_ACCOUNT_NAME", value: "Tomi Demo", provider: "DANA" },
      { type: "RIOT_ID", value: "riot-user-demo" },
      { type: "RIOT_NICKNAME", value: "DemoName#TAG", provider: "Riot" },
      { type: "FACEBOOK_NAME", value: "Facebook Demo" },
      { type: "FACEBOOK_URL", value: "https://www.facebook.com/demo", provider: "Facebook" },
    ]),
    category: "HACKBACK",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.identifiers.length, 6);
});

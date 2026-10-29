import assert from "node:assert/strict";
import test from "node:test";
import { parseReportJson, reportJsonTemplate } from "../lib/report-json.js";

test("template imports composite rows and defaults optional fields", () => {
  const data = parseReportJson(reportJsonTemplate);
  assert.equal(data.identifiers[0]?.relatedName, "Nama pemilik contoh");
  assert.equal(data.identifiers[1]?.provider, "");
  assert.equal(data.transactionDate, "");
});

test("invalid JSON, fields, dates and URLs are rejected before applying", () => {
  assert.throws(() => parseReportJson("{"), /JSON belum valid/);
  assert.throws(() => parseReportJson("x".repeat(30001)), /terlalu panjang/);
  for (const patch of [null, [], { unexpected: true }, { category: "BAD" }, { transactionDate: "2026-02-30" }, { evidenceUrl: "javascript:alert(1)" }, { chronology: "pendek" }, { identifiers: [] }, { identifiers: [{ type: "BANK_ACCOUNT", value: "12345" }] }, { identifiers: [{ type: "PHONE", value: "081234567890", relatedName: "Pemilik" }] }]) {
    const value = patch === null || Array.isArray(patch) ? patch : { ...JSON.parse(reportJsonTemplate), ...patch };
    assert.throws(() => parseReportJson(JSON.stringify(value)));
  }
});

test("composite fields count toward eight-data limit", () => {
  const data = JSON.parse(reportJsonTemplate);
  data.identifiers = Array.from({ length: 5 }, () => ({ type: "BANK_ACCOUNT", value: "1234567890", provider: "BCA", relatedName: "Nama contoh" }));
  assert.throws(() => parseReportJson(JSON.stringify(data)), /delapan/);
  data.identifiers.pop();
  assert.equal(parseReportJson(JSON.stringify(data)).identifiers.length, 4);
});

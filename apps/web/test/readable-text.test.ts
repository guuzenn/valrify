import assert from "node:assert/strict";
import test from "node:test";
import { readableParagraphs } from "../lib/readable-text.js";

test("long stories break at sentences without losing or rewriting words", () => {
  const text = "Menurut pelapor, akun diambil kembali setelah transaksi. ".repeat(24).trim();
  const paragraphs = readableParagraphs(text);
  assert.ok(paragraphs.length > 1);
  assert.equal(paragraphs.join(" "), text);
  assert.ok(paragraphs.every(value => value.endsWith(".")));
});
test("existing paragraph breaks and long single sentences remain intact", () => {
  assert.deepEqual(readableParagraphs("Bagian pertama.\n\nBagian kedua."), ["Bagian pertama.", "Bagian kedua."]);
  const text = "kata ".repeat(120).trim();
  assert.deepEqual(readableParagraphs(text), [text]);
  assert.deepEqual(readableParagraphs("  "), []);
});

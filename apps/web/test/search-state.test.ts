import assert from "node:assert/strict";
import test from "node:test";
import { getSearchViewState, parseSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "../app/search/search-state.js";

test("search stays idle before a query is submitted", () => {
  const search = parseSearchQuery("   ");
  assert.deepEqual(search, { kind: "idle", query: "" });
  assert.equal(getSearchViewState(search, 0), "idle");
});

test("search marks short and overlong queries as invalid", () => {
  const short = parseSearchQuery("a");
  const long = parseSearchQuery("x".repeat(SEARCH_QUERY_MAX_LENGTH + 1));

  assert.equal(short.kind, "invalid");
  assert.match(short.kind === "invalid" ? short.message : "", /minimal dua karakter/i);
  assert.equal(long.kind, "invalid");
  assert.match(long.kind === "invalid" ? long.message : "", /maksimal 80 karakter/i);
  assert.equal(getSearchViewState(short, 0), "invalid");
});

test("valid searches distinguish found and empty results", () => {
  const search = parseSearchQuery("  ArkaNusa   Demo  ");

  assert.deepEqual(search, { kind: "valid", query: "ArkaNusa Demo" });
  assert.equal(getSearchViewState(search, 0), "empty");
  assert.equal(getSearchViewState(search, 1), "found");
});

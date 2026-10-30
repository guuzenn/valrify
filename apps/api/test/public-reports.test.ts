import assert from "node:assert/strict";
import test from "node:test";
import { publicReportsQuerySchema } from "@valrify/validation";
import { PublicController } from "../src/public/public.controller";
import type { PublicService } from "../src/public/public.service";

test("public report pages default to one and reject malformed or unbounded input before querying", async () => {
  const pages: number[] = [];
  const controller = new PublicController({ reportDirectory: async (page: number) => { pages.push(page); return { items: [], page, hasNext: false }; } } as unknown as PublicService);
  await controller.reports({}); await controller.reports({ page: "2" });
  assert.deepEqual(pages, [1, 2]);
  for (const page of ["", "0", "-1", "1.5", "1e2", "Infinity", "100000", " 2", ["1", "2"], {}, null]) {
    assert.equal(publicReportsQuerySchema.safeParse({ page }).success, false);
    assert.throws(() => controller.reports({ page }));
  }
  assert.deepEqual(pages, [1, 2]);
  assert.equal(publicReportsQuerySchema.parse({ page: "99999" }).page, 99999);
  assert.equal(publicReportsQuerySchema.parse({ q: "  Arifaan  " }).q, "Arifaan");
  for (const q of [["a", "b"], {}, "x".repeat(101)]) assert.equal(publicReportsQuerySchema.safeParse({ q }).success, false);
});

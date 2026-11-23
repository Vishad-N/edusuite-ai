import { test } from "node:test";
import assert from "node:assert/strict";
import { FeeReceiptCreateSchema, RollNoSchema, RupeesSchema, StudentCreateSchema, daysBetween, financialYear, formatRupees, istDate } from "./students.ts";

test("financial year turns over on 1 April (DN-013)", () => {
  assert.equal(financialYear("2026-03-31"), "2025-26");
  assert.equal(financialYear("2026-04-01"), "2026-27");
  assert.equal(financialYear("2099-12-31"), "2099-00");
});

test("IST date: 23:00 UTC is already the next day in India", () => {
  assert.equal(istDate(new Date("2026-11-23T19:00:00Z")), "2026-11-24");
  assert.equal(istDate(new Date("2026-11-23T18:00:00Z")), "2026-11-23");
  assert.equal(daysBetween("2026-11-16", "2026-11-23"), 7);
});

test("money is rupees with at most 2 decimals; receipts must be above zero", () => {
  assert.ok(RupeesSchema.safeParse(12500.5).success);
  assert.ok(RupeesSchema.safeParse(0.1 + 0.2).success, "float noise from 0.30000000000000004 is still 2 decimals");
  assert.ok(!RupeesSchema.safeParse(10.555).success);
  assert.ok(!RupeesSchema.safeParse(-1).success);
  assert.ok(!FeeReceiptCreateSchema.safeParse({ studentId: crypto.randomUUID(), amount: 0, mode: "cash" }).success);
  assert.ok(!FeeReceiptCreateSchema.safeParse({ studentId: crypto.randomUUID(), amount: 10, mode: "paytm" }).success);
  assert.equal(formatRupees(125000), "₹1,25,000");
  assert.equal(formatRupees(99.5), "₹99.50");
});

test("roll numbers are upper-cased and limited to letters, digits, - and /", () => {
  assert.equal(RollNoSchema.parse(" demo-gtb-2026-0001 "), "DEMO-GTB-2026-0001");
  assert.ok(!RollNoSchema.safeParse("A B").success);
  const s = StudentCreateSchema.parse({ fullName: "सीमा", course: "SSC", totalFee: 0, guardianName: "  ", phone: "98260-12345" });
  assert.equal(s.guardianName, null);
  assert.equal(s.phone, "+919826012345");
});

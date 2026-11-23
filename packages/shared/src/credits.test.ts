import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_JOB_TYPES, CreditGrantSchema, DEFAULT_CREDIT_PRICES, creditCost, jobTypesFor } from "./credits.ts";
import { ALL_ROLES, ROLES, can, visibleScreens } from "./permissions.ts";
import { assignableRoles } from "./users.ts";

test("every AI job type has a default price", () => {
  for (const t of AI_JOB_TYPES) assert.ok(DEFAULT_CREDIT_PRICES[t], t);
});

test("per-item prices scale with the input; flat prices don't", () => {
  assert.equal(creditCost({ credits: 1, unit: "item" }, 20), 20);
  assert.equal(creditCost({ credits: 1, unit: "item" }, 0), 1, "at least one item");
  assert.equal(creditCost({ credits: 10, unit: "job" }, 20), 10);
});

test("only the operator can manage credits, and nobody in an institute can give that role", () => {
  for (const r of ALL_ROLES) assert.equal(can(r, "platform.credits"), r === "platform_admin", r);
  for (const r of ROLES) assert.ok(!assignableRoles(r).includes("platform_admin" as never), r);
  assert.deepEqual(visibleScreens("platform_admin"), ["platform"]);
  assert.deepEqual(jobTypesFor("platform_admin"), [], "the operator runs no AI jobs");
  assert.ok(jobTypesFor("teacher").includes("deck_quiz"));
  assert.ok(!jobTypesFor("counselor").includes("poster_copy"), "DN-008");
});

test("a grant needs a non-zero whole amount and a reason", () => {
  assert.ok(CreditGrantSchema.safeParse({ delta: 100, note: "UPI ref 123" }).success);
  assert.ok(!CreditGrantSchema.safeParse({ delta: 0, note: "nothing" }).success);
  assert.ok(!CreditGrantSchema.safeParse({ delta: 1.5, note: "half" }).success);
  assert.ok(!CreditGrantSchema.safeParse({ delta: 10, note: "  " }).success);
});

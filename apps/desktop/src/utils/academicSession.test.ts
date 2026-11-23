import { test } from "node:test";
import assert from "node:assert/strict";
import { academicSession } from "./academicSession.ts";

test("the session starts in April", () => {
  assert.equal(academicSession("hi", new Date(2026, 10, 23)), "सत्र 2026-27");
  assert.equal(academicSession("en", new Date(2027, 2, 31)), "Session 2026-27");
  assert.equal(academicSession("en", new Date(2027, 3, 1)), "Session 2027-28");
  assert.equal(academicSession("en", new Date(2099, 5, 1)), "Session 2099-00");
});

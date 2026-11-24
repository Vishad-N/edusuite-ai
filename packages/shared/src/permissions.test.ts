import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AI_JOB_PERMISSIONS,
  PERMISSION_MATRIX,
  PERMISSIONS,
  ROLES,
  can,
  scopeFor,
  visibleScreens,
} from "./permissions.ts";

test("every permission has an entry in the matrix", () => {
  assert.deepEqual(Object.keys(PERMISSION_MATRIX).sort(), [...PERMISSIONS].sort());
});

test("super admin holds every institute permission institute-wide, but none of the operator's (DN-053)", () => {
  for (const p of PERMISSIONS.filter((x) => !x.startsWith("platform."))) assert.equal(scopeFor("superadmin", p), "institute", p);
  assert.equal(can("superadmin", "platform.credits"), false);
});

test("no role other than super admin gets institute-wide scope", () => {
  for (const role of ROLES.filter((r) => r !== "superadmin")) {
    for (const p of PERMISSIONS) assert.notEqual(scopeFor(role, p), "institute", `${role} ${p}`);
  }
});

test("typists cannot handle fees or cancel receipts (DN-007)", () => {
  assert.equal(can("typist", "students.fees"), false);
  assert.equal(can("typist", "receipts.cancel"), false);
});

test("counselors issue receipts but cannot cancel them", () => {
  assert.equal(can("counselor", "students.fees"), true);
  assert.equal(can("counselor", "receipts.cancel"), false);
});

test("counselors get Image Studio templates but no AI copy (DN-008)", () => {
  assert.equal(can("counselor", "image_studio"), true);
  assert.equal(can("counselor", "image_studio.ai_copy"), false);
  assert.equal(can("counselor", "ai.content"), false);
});

test("branch admins manage users only in their branch (DN-009)", () => {
  assert.equal(scopeFor("branch_admin", "users.manage"), "branch");
  assert.equal(can("teacher", "users.manage"), false);
});

test("sidebar screens per role", () => {
  assert.deepEqual(visibleScreens("counselor").sort(), ["dashboard", "image", "notice", "receipt"]);
  assert.deepEqual(
    visibleScreens("typist").sort(),
    ["book", "dashboard", "deck_quiz", "doubt", "dpp", "image", "lesson", "ocr_ppt", "ppt", "test", "youtube"],
  );
  assert.equal(visibleScreens("teacher").includes("teacher_desk"), true);
  assert.equal(visibleScreens("teacher").includes("users"), false);
  assert.equal(visibleScreens("superadmin").length, 16);
  assert.equal(visibleScreens("branch_admin").includes("audit"), true);
  assert.equal(visibleScreens("teacher").includes("audit"), false);
});

test("every AI job type maps to a known permission", () => {
  for (const p of Object.values(AI_JOB_PERMISSIONS)) assert.ok(PERMISSIONS.includes(p));
  assert.equal(can("counselor", AI_JOB_PERMISSIONS.poster_copy), false);
  assert.equal(can("counselor", AI_JOB_PERMISSIONS.notice_draft), true);
});

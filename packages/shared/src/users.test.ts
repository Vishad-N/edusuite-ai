import { test } from "node:test";
import assert from "node:assert/strict";
import { UserCreateSchema, assignableRoles } from "./users.ts";
import { decodeCursor, encodeCursor } from "./pagination.ts";

const base = {
  employeeCode: " dmo-7 ",
  email: " New.Teacher@Example.TEST ",
  displayName: "नया शिक्षक",
  fullName: "New Teacher",
  role: "teacher",
  branchId: "11111111-1111-4111-8111-111111111111",
  password: "long-enough-1",
};

test("user create normalises code, email and phone", () => {
  const parsed = UserCreateSchema.parse({ ...base, phone: "098260-12345" });
  assert.equal(parsed.employeeCode, "DMO-7");
  assert.equal(parsed.email, "new.teacher@example.test");
  assert.equal(parsed.phone, "+919826012345");
  assert.deepEqual(parsed.extraBranchIds, []);
});

test("short passwords and bad phone numbers are rejected", () => {
  assert.equal(UserCreateSchema.safeParse({ ...base, password: "123" }).success, false);
  assert.equal(UserCreateSchema.safeParse({ ...base, phone: "12345" }).success, false);
});

test("branch admins can't hand out admin roles (DN-034)", () => {
  assert.deepEqual(assignableRoles("branch_admin"), ["teacher", "typist", "counselor"]);
  assert.equal(assignableRoles("superadmin").includes("superadmin"), true);
  assert.deepEqual(assignableRoles("teacher"), []);
});

test("cursors round-trip and bad ones decode to null", () => {
  const row = { updatedAt: new Date("2026-11-20T10:00:00.000Z"), id: "abc" };
  assert.deepEqual(decodeCursor(encodeCursor(row)), row);
  assert.equal(decodeCursor("not-a-cursor"), null);
});

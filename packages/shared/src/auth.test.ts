import { test } from "node:test";
import assert from "node:assert/strict";
import { LoginRequestSchema, endOfIstDay, permissionsFor } from "./auth.ts";

test("sessions end at 23:59:59.999 IST on the day of login", () => {
  // 10:00 IST on 20 Nov 2026 = 04:30 UTC
  assert.equal(endOfIstDay(new Date("2026-11-20T04:30:00Z")).toISOString(), "2026-11-20T18:29:59.999Z");
  // 23:30 IST on 20 Nov is still the 20th in India
  assert.equal(endOfIstDay(new Date("2026-11-20T18:00:00Z")).toISOString(), "2026-11-20T18:29:59.999Z");
  // 00:15 IST on 21 Nov (18:45 UTC on the 20th) belongs to the 21st
  assert.equal(endOfIstDay(new Date("2026-11-20T18:45:00Z")).toISOString(), "2026-11-21T18:29:59.999Z");
});

test("login request trims the identifier and requires a device id", () => {
  const ok = LoginRequestSchema.safeParse({ identifier: "  DEMO-T ", password: "x", deviceId: "device-1234" });
  assert.equal(ok.success, true);
  assert.equal(ok.success && ok.data.identifier, "DEMO-T");
  assert.equal(LoginRequestSchema.safeParse({ identifier: "a", password: "x" }).success, false);
});

test("permissionsFor lists only what the role may do", () => {
  assert.deepEqual(permissionsFor("counselor").sort(), ["dashboard.view", "image_studio", "notices", "students.fees"]);
  assert.equal(permissionsFor("superadmin").includes("users.manage"), true);
});

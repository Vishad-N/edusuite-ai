import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { DEVICE, startTestApp, type TestApp } from "./helpers/app";
import { PASSWORD } from "./helpers/fixtures";
import { dbTestsSkipReason } from "./helpers/testDb";

type Login = { accessToken: string; refreshToken: string; user: { branch: { id: string }; branches: Array<{ id: string }> } };

describe("branch switching and own password change (real Postgres, DN-070)", { skip: dbTestsSkipReason() }, () => {
  let t: TestApp;
  before(async () => {
    t = await startTestApp();
  });
  after(async () => {
    await t?.close();
  });

  const login = async (identifier: string, password = PASSWORD, device = DEVICE) => {
    const res = await t.app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { identifier, password, deviceId: device } });
    return { status: res.statusCode, body: res.json() as Login };
  };
  const refresh = (refreshToken: string, device = DEVICE) =>
    t.app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken, deviceId: device } });

  test("a teacher with two branches switches; the new session works and the old refresh token doesn't", async () => {
    const first = await login("A-T");
    assert.equal(first.status, 200);
    assert.equal(first.body.user.branch.id, t.fx.mainA.id);
    assert.equal(first.body.user.branches.length, 2);

    const sw = await t.call("POST", "/api/v1/auth/switch-branch", first.body.accessToken, { branchId: t.fx.otherA.id });
    assert.equal(sw.statusCode, 200);
    const next = sw.json() as Login;
    assert.equal(next.user.branch.id, t.fx.otherA.id);
    assert.notEqual(next.refreshToken, first.body.refreshToken);

    const me = await t.call("GET", "/api/v1/me", next.accessToken);
    assert.equal(me.json().branch.id, t.fx.otherA.id);
    assert.equal((await refresh(next.refreshToken)).statusCode, 200, "the new session refreshes");

    const audit = await t.db.auditLog.findFirst({ where: { action: "auth.switch_branch", actorId: t.fx.users.teacher.id } });
    assert.deepEqual(audit?.meta, { fromBranchId: t.fx.mainA.id, branchId: t.fx.otherA.id });

    // The replaced token now counts as reuse (DN-033).
    assert.equal((await refresh(first.body.refreshToken)).statusCode, 401);
  });

  test("only branches the user may work at", async () => {
    const teacher = await login("A-T");
    const res = await t.call("POST", "/api/v1/auth/switch-branch", teacher.body.accessToken, { branchId: t.fx.mainB.id });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, "AUTH_BRANCH_NOT_ALLOWED");

    const typist = await login("A-TY");
    assert.equal(typist.body.user.branches.length, 1);
    const other = await t.call("POST", "/api/v1/auth/switch-branch", typist.body.accessToken, { branchId: t.fx.otherA.id });
    assert.equal(other.statusCode, 403);
    assert.equal((await t.call("POST", "/api/v1/auth/switch-branch", undefined, { branchId: t.fx.otherA.id })).statusCode, 401);
  });

  test("changing one's own password: checks, other sessions end, this one stays", async () => {
    const elsewhere = await login("A-TY", PASSWORD, "other-device-0002");
    const here = await login("A-TY");
    const change = (body: object) => t.call("POST", "/api/v1/me/password", here.body.accessToken, body);

    const wrong = await change({ currentPassword: "not-it-at-all", newPassword: "New-Typist-Pass-1" });
    assert.equal(wrong.statusCode, 400);
    assert.equal(wrong.json().code, "PASSWORD_WRONG");
    assert.equal((await change({ currentPassword: PASSWORD, newPassword: PASSWORD })).json().code, "PASSWORD_SAME");
    assert.equal((await change({ currentPassword: PASSWORD, newPassword: "short" })).json().code, "VALIDATION_FAILED");

    assert.equal((await change({ currentPassword: PASSWORD, newPassword: "New-Typist-Pass-1" })).statusCode, 204);
    assert.equal((await login("A-TY")).status, 401, "old password no longer works");
    assert.equal((await login("A-TY", "New-Typist-Pass-1")).status, 200, "new password works");
    assert.equal((await refresh(elsewhere.body.refreshToken, "other-device-0002")).statusCode, 401, "the other PC is signed out");
    assert.equal((await t.call("GET", "/api/v1/me", here.body.accessToken)).statusCode, 200, "this session stays");
    assert.equal((await refresh(here.body.refreshToken)).statusCode, 200, "this session still refreshes");

    const rows = await t.db.auditLog.findMany({ where: { actorId: t.fx.users.typist.id, action: { startsWith: "auth.password_change" } } });
    assert.deepEqual(rows.map((r) => r.action).sort(), ["auth.password_change", "auth.password_change_failed"]);
    assert.ok(!JSON.stringify(rows).includes("New-Typist-Pass-1"), "no password in the audit log");
  });
});

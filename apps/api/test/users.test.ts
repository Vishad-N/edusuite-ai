import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { DEVICE, startTestApp, type TestApp } from "./helpers/app";
import { PASSWORD } from "./helpers/fixtures";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();

describe("users API (real Postgres)", { skip }, () => {
  let t: TestApp;
  let sa: string;
  let ba: string;

  const newUser = (overrides: object = {}) => ({
    employeeCode: "a-new-1",
    email: "new.one@test.edusuite.test",
    phone: "98260 11111",
    displayName: "नया",
    fullName: "New One",
    role: "teacher",
    branchId: t.fx.mainA.id,
    password: "new-password-1",
    ...overrides,
  });

  before(async () => {
    t = await startTestApp();
    sa = await t.token("A-SA");
    ba = await t.token("A-BA");
  });
  after(async () => {
    await t?.close();
  });

  test("roles without users.manage get 403", async () => {
    for (const id of ["A-T", "A-TY", "A-C"]) {
      const res = await t.call("GET", "/api/v1/users", await t.token(id));
      assert.equal(res.statusCode, 403, id);
    }
  });

  test("super admin sees every user of their own institute and no one else's", async () => {
    const res = await t.call("GET", "/api/v1/users?limit=100", sa);
    assert.equal(res.statusCode, 200);
    const codes = res.json().items.map((u: { employeeCode: string }) => u.employeeCode).sort();
    assert.deepEqual(codes, ["A-BA", "A-C", "A-SA", "A-T", "A-TY"]);
    assert.doesNotMatch(res.body, /passwordHash|argon2/);
  });

  test("cursor pagination walks every user exactly once", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const url: string = `/api/v1/users?limit=2${cursor ? `&cursor=${cursor}` : ""}`;
      const page = (await t.call("GET", url, sa)).json();
      assert.ok(page.items.length <= 2);
      seen.push(...page.items.map((u: { id: string }) => u.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.equal(seen.length, 5);
    assert.equal(new Set(seen).size, 5);
    assert.equal((await t.call("GET", "/api/v1/users?cursor=garbage", sa)).statusCode, 400);
  });

  test("branch admin sees only teachers, typists and counselors of their branch", async () => {
    const res = await t.call("GET", "/api/v1/users", ba);
    const codes = res.json().items.map((u: { employeeCode: string }) => u.employeeCode).sort();
    // A-C works at the other branch; A-SA and A-BA are admins.
    assert.deepEqual(codes, ["A-T", "A-TY"]);
  });

  test("search and filters", async () => {
    const byName = (await t.call("GET", "/api/v1/users?q=a-ty", sa)).json().items;
    assert.deepEqual(byName.map((u: { employeeCode: string }) => u.employeeCode), ["A-TY"]);
    const counselors = (await t.call("GET", "/api/v1/users?role=counselor", sa)).json().items;
    assert.equal(counselors.length, 1);
  });

  test("super admin creates a user who can then log in", async () => {
    const res = await t.call("POST", "/api/v1/users", sa, newUser({ branchId: t.fx.otherA.id, extraBranchIds: [t.fx.mainA.id] }));
    assert.equal(res.statusCode, 201);
    const user = res.json();
    assert.equal(user.employeeCode, "A-NEW-1");
    assert.equal(user.phone, "+919826011111");
    assert.deepEqual(user.extraBranchIds, [t.fx.mainA.id]);
    assert.ok(await t.token("A-NEW-1", "new-password-1"));
    const row = await t.db.appUser.findUniqueOrThrow({ where: { id: user.id } });
    assert.match(row.passwordHash, /^\$argon2id\$/);
    assert.equal(await t.db.auditLog.count({ where: { action: "user.create", entityId: user.id } }), 1);
  });

  test("branch admin may only create teachers, typists and counselors in their own branch", async () => {
    const ok = await t.call("POST", "/api/v1/users", ba, newUser({ employeeCode: "A-NEW-2", email: "n2@test.edusuite.test", phone: undefined }));
    assert.equal(ok.statusCode, 201);
    for (const role of ["branch_admin", "superadmin"]) {
      const res = await t.call("POST", "/api/v1/users", ba, newUser({ employeeCode: `A-X-${role.length}`, email: `${role}@x.test`, phone: undefined, role }));
      assert.equal(res.statusCode, 403, role);
      assert.equal(res.json().code, "ROLE_NOT_ALLOWED");
    }
    const otherBranch = await t.call("POST", "/api/v1/users", ba, newUser({ employeeCode: "A-NEW-3", email: "n3@test.edusuite.test", phone: undefined, branchId: t.fx.otherA.id }));
    assert.equal(otherBranch.statusCode, 403);
  });

  test("branches from another institute are rejected", async () => {
    const res = await t.call("POST", "/api/v1/users", sa, newUser({ employeeCode: "A-NEW-4", email: "n4@test.edusuite.test", phone: undefined, branchId: t.fx.mainB.id }));
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().code, "VALIDATION_FAILED");
  });

  test("duplicate email, code or phone answers 409 with the field, across institutes too", async () => {
    const email = await t.call("POST", "/api/v1/users", sa, newUser({ employeeCode: "A-DUP-1", email: "B-BA@test.edusuite.test", phone: undefined }));
    assert.equal(email.statusCode, 409);
    assert.deepEqual(email.json().details, { field: "email" });
    const code = await t.call("POST", "/api/v1/users", sa, newUser({ employeeCode: "b-ba", email: "dup2@test.edusuite.test", phone: undefined }));
    assert.deepEqual(code.json().details, { field: "employeeCode" });
    const phone = await t.call("POST", "/api/v1/users", sa, newUser({ employeeCode: "A-DUP-3", email: "dup3@test.edusuite.test", phone: "8000000003" }));
    assert.deepEqual(phone.json().details, { field: "phone" });
  });

  test("another institute's user looks like it doesn't exist", async () => {
    const other = await t.token("B-BA");
    const target = t.fx.users.teacher.id;
    assert.equal((await t.call("GET", `/api/v1/users/${target}`, other)).statusCode, 404);
    assert.equal((await t.call("PATCH", `/api/v1/users/${target}`, other, { displayName: "x" })).statusCode, 404);
    assert.equal((await t.call("POST", `/api/v1/users/${target}/block`, other)).statusCode, 404);
    assert.equal((await t.call("POST", `/api/v1/users/${target}/reset-password`, other, { password: "whatever-123" })).statusCode, 404);
  });

  test("branch admin can't reach admins or other branches", async () => {
    assert.equal((await t.call("GET", `/api/v1/users/${t.fx.users.superadmin.id}`, ba)).statusCode, 404);
    assert.equal((await t.call("GET", `/api/v1/users/${t.fx.users.counselor.id}`, ba)).statusCode, 404);
    assert.equal((await t.call("GET", `/api/v1/users/${t.fx.users.teacher.id}`, ba)).statusCode, 200);
    const promote = await t.call("PATCH", `/api/v1/users/${t.fx.users.teacher.id}`, ba, { role: "branch_admin" });
    assert.equal(promote.statusCode, 403);
    assert.equal(promote.json().code, "ROLE_NOT_ALLOWED");
  });

  test("nobody changes their own role or status", async () => {
    const id = t.fx.users.superadmin.id;
    for (const [method, url, body] of [
      ["POST", `/api/v1/users/${id}/block`, undefined],
      ["PATCH", `/api/v1/users/${id}`, { role: "teacher" }],
    ] as const) {
      const res = await t.call(method, url, sa, body);
      assert.equal(res.statusCode, 403);
      assert.equal(res.json().code, "CANNOT_CHANGE_SELF");
    }
    // Editing one's own name is fine.
    assert.equal((await t.call("PATCH", `/api/v1/users/${id}`, sa, { displayName: "मुख्य एडमिन" })).statusCode, 200);
  });

  test("blocking ends the user's sessions; unblocking lets them back in", async () => {
    const login = await t.call("POST", "/api/v1/auth/login", undefined, { identifier: "A-TY", password: PASSWORD, deviceId: DEVICE });
    const { refreshToken } = login.json();
    const blocked = await t.call("POST", `/api/v1/users/${t.fx.users.typist.id}/block`, sa);
    assert.equal(blocked.json().status, "blocked");
    assert.equal((await t.call("POST", "/api/v1/auth/refresh", undefined, { refreshToken, deviceId: DEVICE })).statusCode, 401);
    const denied = await t.call("POST", "/api/v1/auth/login", undefined, { identifier: "A-TY", password: PASSWORD, deviceId: DEVICE });
    assert.equal(denied.json().code, "AUTH_BLOCKED");
    await t.call("POST", `/api/v1/users/${t.fx.users.typist.id}/unblock`, sa);
    assert.ok(await t.token("A-TY"));
  });

  test("password reset replaces the password, clears lockout and ends sessions", async () => {
    await t.db.appUser.update({ where: { id: t.fx.users.counselor.id }, data: { lockedUntil: new Date(Date.now() + 600_000) } });
    const res = await t.call("POST", `/api/v1/users/${t.fx.users.counselor.id}/reset-password`, sa, { password: "fresh-password-9" });
    assert.equal(res.statusCode, 204);
    const old = await t.call("POST", "/api/v1/auth/login", undefined, { identifier: "A-C", password: PASSWORD, deviceId: DEVICE });
    assert.equal(old.statusCode, 401);
    assert.ok(await t.token("A-C", "fresh-password-9"));
    const short = await t.call("POST", `/api/v1/users/${t.fx.users.counselor.id}/reset-password`, sa, { password: "123" });
    assert.equal(short.statusCode, 400);
  });

  test("a role change ends the user's sessions so new rights apply at once", async () => {
    const login = await t.call("POST", "/api/v1/auth/login", undefined, { identifier: "A-T", password: PASSWORD, deviceId: DEVICE });
    const { refreshToken } = login.json();
    const res = await t.call("PATCH", `/api/v1/users/${t.fx.users.teacher.id}`, sa, { role: "typist" });
    assert.equal(res.json().role, "typist");
    assert.equal((await t.call("POST", "/api/v1/auth/refresh", undefined, { refreshToken, deviceId: DEVICE })).statusCode, 401);
  });

  test("audit entries name the changed fields but never their values", async () => {
    const rows = await t.db.auditLog.findMany({ where: { action: { startsWith: "user." } } });
    for (const a of ["user.create", "user.update", "user.block", "user.unblock", "user.reset_password"]) {
      assert.ok(rows.some((r) => r.action === a), a);
    }
    const text = JSON.stringify(rows);
    assert.doesNotMatch(text, /fresh-password-9|new-password-1|मुख्य एडमिन/);
  });

  test("body-less actions work when the client still sends content-type: application/json", async () => {
    // Regression: Fastify answered 400 for an empty JSON body, so blocking silently failed.
    const res = await t.app.inject({
      method: "POST",
      url: `/api/v1/users/${t.fx.users.typist.id}/block`,
      headers: { authorization: `Bearer ${sa}`, "content-type": "application/json" },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().status, "blocked");
    await t.call("POST", `/api/v1/users/${t.fx.users.typist.id}/unblock`, sa);
    const bad = await t.app.inject({
      method: "PATCH",
      url: `/api/v1/users/${t.fx.users.typist.id}`,
      headers: { authorization: `Bearer ${sa}`, "content-type": "application/json" },
      payload: "{not json",
    });
    assert.equal(bad.statusCode, 400);
    assert.equal(bad.json().code, "BAD_REQUEST");
  });

  test("malformed ids answer 404", async () => {
    assert.equal((await t.call("GET", "/api/v1/users/not-a-uuid", sa)).statusCode, 404);
  });
});

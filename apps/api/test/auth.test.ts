import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { Controller, Get, Param } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { PrismaClient } from "../src/generated/prisma/client";
import { createApp } from "../src/bootstrap";
import { loadEnv } from "../src/config/env";
import { AnySignedIn, CurrentUser, RequirePermission, type AuthUser } from "../src/auth/authUser";
import { assertSameInstitute, scopeWhere } from "../src/auth/scope";
import { PASSWORD, createFixtures, type Fixtures } from "./helpers/fixtures";
import { dbTestsSkipReason, prepareTestDatabase, testDatabaseUrl } from "./helpers/testDb";

/** Test-only routes that exercise the guards the way real modules will. */
@Controller("_probe")
class ProbeController {
  @Get("users")
  @RequirePermission("users.manage")
  users(@CurrentUser() user: AuthUser) {
    return scopeWhere(user, "users.manage");
  }

  @Get("institutes/:id")
  @AnySignedIn()
  institute(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    assertSameInstitute(user, { instituteId: id });
    return { ok: true };
  }

  // No permission decorator on purpose: the guard must refuse it.
  @Get("forgotten")
  forgotten() {
    return { open: true };
  }
}

const DEVICE = "test-device-0001";
const skip = dbTestsSkipReason();

describe("auth (real Postgres)", { skip }, () => {
  let app: NestFastifyApplication;
  let db: PrismaClient;
  let fx: Fixtures;

  const env = () =>
    loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      LOGIN_RATE_LIMIT: "1000",
    });

  const post = (url: string, payload: object, headers: Record<string, string> = {}) =>
    app.inject({ method: "POST", url, payload, headers });
  const get = (url: string, token?: string) =>
    app.inject({ method: "GET", url, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const login = (identifier: string, password = PASSWORD, extra: object = {}) =>
    post("/api/v1/auth/login", { identifier, password, deviceId: DEVICE, ...extra });

  before(async () => {
    db = await prepareTestDatabase(testDatabaseUrl()!);
    fx = await createFixtures(db);
    app = await createApp(env(), [ProbeController]);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  after(async () => {
    await app?.close();
    await db?.$disconnect();
  });

  test("logs in by employee code, email or mobile number", async () => {
    for (const id of ["A-T", "a-t@test.edusuite.test", "8000000003", "+91 80000 00003"]) {
      const res = await login(id);
      assert.equal(res.statusCode, 200, id);
      const body = res.json();
      assert.equal(body.user.employeeCode, "A-T");
      assert.equal(body.user.role, "teacher");
      assert.ok(body.accessToken && body.refreshToken);
      assert.equal(body.user.permissions.includes("users.manage"), false);
    }
  });

  test("the refresh session ends at 23:59 IST", async () => {
    const body = (await login("A-SA")).json();
    const expires = new Date(body.refreshTokenExpiresAt);
    const ist = new Date(expires.getTime() + 5.5 * 3600_000);
    assert.equal(ist.getUTCHours(), 23);
    assert.equal(ist.getUTCMinutes(), 59);
    assert.ok(new Date(body.accessTokenExpiresAt) <= expires);
  });

  test("wrong password and unknown ID give the same answer", async () => {
    const wrong = await login("A-TY", "not-the-password");
    const unknown = await login("NOBODY-99", "whatever");
    assert.equal(wrong.statusCode, 401);
    assert.equal(unknown.statusCode, 401);
    assert.equal(wrong.json().code, "AUTH_INVALID");
    assert.deepEqual(wrong.json(), unknown.json());
  });

  test("the old fakes are gone: no 'super' ID trick, no master passwords", async () => {
    assert.equal((await login("super-anything", "x")).statusCode, 401);
    assert.equal((await login("superadmin", "admin123")).statusCode, 401);
    for (const master of ["123", "admin123", "admin770"]) {
      assert.equal((await login("A-C", master)).statusCode, 401, master);
    }
  });

  test("five wrong passwords lock the account for 15 minutes", async () => {
    for (let i = 0; i < 5; i++) assert.equal((await login("A-BA", "wrong")).statusCode, 401);
    const locked = await login("A-BA");
    assert.equal(locked.statusCode, 423);
    assert.equal(locked.json().code, "AUTH_LOCKED");
    const row = await db.appUser.findUniqueOrThrow({ where: { employeeCode: "A-BA" } });
    const minutes = (row.lockedUntil!.getTime() - Date.now()) / 60_000;
    assert.ok(minutes > 14 && minutes <= 15);
    await db.appUser.update({ where: { id: row.id }, data: { lockedUntil: null } });
    assert.equal((await login("A-BA")).statusCode, 200);
  });

  test("a blocked user can't log in", async () => {
    await db.appUser.update({ where: { id: fx.users.typist.id }, data: { status: "blocked" } });
    const res = await login("A-TY");
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, "AUTH_BLOCKED");
    await db.appUser.update({ where: { id: fx.users.typist.id }, data: { status: "active" } });
  });

  test("branch at login must be one the user may work at", async () => {
    assert.equal((await login("A-T", PASSWORD, { branchId: fx.otherA.id })).statusCode, 200);
    const res = await login("A-T", PASSWORD, { branchId: fx.mainB.id });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, "AUTH_BRANCH_NOT_ALLOWED");
    assert.equal((await login("A-TY", PASSWORD, { branchId: fx.otherA.id })).statusCode, 403);
  });

  test("validation errors never echo the submitted password", async () => {
    const res = await post("/api/v1/auth/login", { identifier: "", password: "secret-value", deviceId: "x" });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().code, "VALIDATION_FAILED");
    assert.doesNotMatch(res.body, /secret-value/);
  });

  test("GET /me needs a valid token", async () => {
    assert.equal((await get("/api/v1/me")).statusCode, 401);
    assert.equal((await get("/api/v1/me", "not.a.token")).statusCode, 401);
    const { accessToken } = (await login("A-C")).json();
    const me = await get("/api/v1/me", accessToken);
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().role, "counselor");
    assert.equal(me.json().institute.code, "TSTA");
  });

  test("refresh rotates the token; reusing an old one ends every session", async () => {
    const first = (await login("A-SA")).json();
    const second = await post("/api/v1/auth/refresh", { refreshToken: first.refreshToken, deviceId: DEVICE });
    assert.equal(second.statusCode, 200);
    const rotated = second.json();
    assert.notEqual(rotated.refreshToken, first.refreshToken);

    const reuse = await post("/api/v1/auth/refresh", { refreshToken: first.refreshToken, deviceId: DEVICE });
    assert.equal(reuse.statusCode, 401);
    assert.equal(reuse.json().code, "AUTH_SESSION_REVOKED");

    const afterReuse = await post("/api/v1/auth/refresh", { refreshToken: rotated.refreshToken, deviceId: DEVICE });
    assert.equal(afterReuse.statusCode, 401, "the newest token is also revoked");
    // Two reuse events: the copied old token, then the newest token after everything was revoked.
    const reuseLog = await db.auditLog.count({ where: { action: "auth.refresh_reuse", actorId: fx.users.superadmin.id } });
    assert.equal(reuseLog, 2);
  });

  test("refresh from a different device is treated as theft", async () => {
    const { refreshToken } = (await login("A-T")).json();
    const res = await post("/api/v1/auth/refresh", { refreshToken, deviceId: "another-device-99" });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().code, "AUTH_SESSION_REVOKED");
  });

  test("an expired session can't be refreshed", async () => {
    const { refreshToken } = (await login("A-C")).json();
    await db.session.updateMany({
      where: { userId: fx.users.counselor.id, revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await post("/api/v1/auth/refresh", { refreshToken, deviceId: DEVICE });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().code, "AUTH_SESSION_EXPIRED");
  });

  test("logout revokes the session", async () => {
    const { refreshToken } = (await login("A-TY")).json();
    assert.equal((await post("/api/v1/auth/logout", { refreshToken })).statusCode, 204);
    assert.equal((await post("/api/v1/auth/refresh", { refreshToken, deviceId: DEVICE })).statusCode, 401);
  });

  test("permission guard: wrong role gets 403, right role gets its scope", async () => {
    const teacher = (await login("A-T")).json().accessToken;
    const denied = await get("/api/v1/_probe/users", teacher);
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.json().code, "FORBIDDEN");

    const sa = (await login("A-SA")).json().accessToken;
    assert.deepEqual((await get("/api/v1/_probe/users", sa)).json(), { instituteId: fx.instA.id });

    const ba = (await login("A-BA")).json().accessToken;
    assert.deepEqual((await get("/api/v1/_probe/users", ba)).json(), { instituteId: fx.instA.id, branchId: fx.mainA.id });
  });

  test("institute scope: another institute's record looks like it doesn't exist", async () => {
    const token = (await login("B-BA")).json().accessToken;
    assert.equal((await get(`/api/v1/_probe/institutes/${fx.instB.id}`, token)).statusCode, 200);
    const other = await get(`/api/v1/_probe/institutes/${fx.instA.id}`, token);
    assert.equal(other.statusCode, 404);
    assert.equal(other.json().code, "NOT_FOUND");
  });

  test("a route without a permission decorator is refused, not open", async () => {
    const token = (await login("A-SA")).json().accessToken;
    assert.equal((await get("/api/v1/_probe/forgotten", token)).statusCode, 403);
  });

  test("logins and failures are written to the audit log, without secrets", async () => {
    const rows = await db.auditLog.findMany({ where: { action: { startsWith: "auth." } } });
    assert.ok(rows.some((r) => r.action === "auth.login"));
    assert.ok(rows.some((r) => r.action === "auth.login_failed"));
    assert.ok(rows.some((r) => r.action === "auth.locked"));
    const text = JSON.stringify(rows);
    assert.doesNotMatch(text, new RegExp(PASSWORD.replace(/[-!]/g, "\\$&")));
    assert.doesNotMatch(text, /refreshToken|accessToken/);
  });

  test("passwords are stored as argon2id hashes", async () => {
    const row = await db.appUser.findUniqueOrThrow({ where: { employeeCode: "A-SA" } });
    assert.match(row.passwordHash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });
});

describe("login rate limit", { skip }, () => {
  let app: NestFastifyApplication;
  before(async () => {
    app = await createApp(
      loadEnv({
        NODE_ENV: "test",
        DATABASE_URL: testDatabaseUrl(),
        JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
        LOGIN_RATE_LIMIT: "3",
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  after(async () => {
    await app?.close();
  });

  test("more than the allowed logins per minute from one IP get 429", async () => {
    const attempt = () =>
      app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { identifier: "NOBODY", password: "x", deviceId: DEVICE },
      });
    for (let i = 0; i < 3; i++) assert.equal((await attempt()).statusCode, 401);
    const limited = await attempt();
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.json().code, "TOO_MANY_REQUESTS");
    // Other routes are not limited by the login rule.
    assert.equal((await app.inject({ method: "GET", url: "/health" })).statusCode, 200);
  });
});

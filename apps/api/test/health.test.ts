import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createApp } from "../src/bootstrap";
import { loadEnv } from "../src/config/env";

let app: NestFastifyApplication;

before(async () => {
  // No service URLs: /ready must report them as not configured.
  app = await createApp(loadEnv({ NODE_ENV: "test" }));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

after(async () => {
  await app.close();
});

test("GET /health is up without any dependencies", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: "ok" });
});

test("GET /ready returns 503 and lists unconfigured dependencies", async () => {
  const res = await app.inject({ method: "GET", url: "/ready" });
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.json(), {
    ready: false,
    checks: { database: "not_configured", redis: "not_configured", storage: "not_configured" },
  });
});

test("unknown routes use the shared error shape, Hindi by default", async () => {
  const res = await app.inject({ method: "GET", url: "/api/v1/nope" });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.json(), { code: "NOT_FOUND", message: "यह चीज़ नहीं मिली।" });
});

test("error messages follow Accept-Language", async () => {
  const res = await app.inject({ method: "GET", url: "/api/v1/nope", headers: { "accept-language": "en-IN" } });
  assert.equal(res.json().message, "Not found.");
});

test("an unreachable database reports down, not up", async () => {
  const other = await createApp(
    loadEnv({ NODE_ENV: "test", DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" }),
  );
  await other.init();
  const res = await other.inject({ method: "GET", url: "/ready" });
  assert.equal(res.json().checks.database, "down");
  await other.close();
});

test("CORS allows the desktop app's file:// origin and refuses others", async () => {
  const preflight = (origin: string) =>
    app.inject({
      method: "OPTIONS",
      url: "/api/v1/me",
      headers: { origin, "access-control-request-method": "GET", "access-control-request-headers": "authorization" },
    });
  const desktop = await preflight("null");
  assert.equal(desktop.headers["access-control-allow-origin"], "null");
  assert.match(String(desktop.headers["access-control-allow-headers"]), /authorization/);
  const stranger = await preflight("https://evil.example");
  assert.equal(stranger.headers["access-control-allow-origin"], undefined);
});

test("production refuses to start without service URLs", () => {
  assert.throws(() => loadEnv({ NODE_ENV: "production" }), /DATABASE_URL, REDIS_URL, S3_ENDPOINT/);
});

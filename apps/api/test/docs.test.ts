import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";
import { apiDocsEnabled, loadEnv } from "../src/config/env";

type Op = { requestBody?: { content: { "application/json": { schema: { properties?: Record<string, unknown>; required?: string[] } } } }; parameters?: Array<{ name: string; in: string; required: boolean }>; security?: unknown[]; description?: string };

describe("API docs at /docs (real Postgres)", { skip: dbTestsSkipReason() }, () => {
  let t: TestApp;
  let spec: { paths: Record<string, Record<string, Op>> };
  before(async () => {
    t = await startTestApp();
    const res = await t.app.inject({ method: "GET", url: "/docs/openapi.json" });
    assert.equal(res.statusCode, 200);
    spec = res.json();
  });
  after(async () => {
    await t?.close();
  });

  test("every route is listed, under /api/v1 except the probes", () => {
    const paths = Object.keys(spec.paths);
    for (const p of ["/health", "/ready", "/api/v1/auth/login", "/api/v1/ai/jobs", "/api/v1/ai/jobs/{id}/cancel", "/api/v1/fee-receipts", "/api/v1/audit-logs", "/api/v1/usage", "/api/v1/documents/{id}"]) {
      assert.ok(paths.includes(p), p);
    }
    const count = Object.values(spec.paths).reduce((n, item) => n + Object.keys(item).length, 0);
    assert.ok(count >= 50, `${count} operations`);
  });

  test("bodies, queries and headers come from the zod schemas the routes validate with", () => {
    const receipt = spec.paths["/api/v1/fee-receipts"]!.post!;
    const body = receipt.requestBody!.content["application/json"].schema;
    assert.deepEqual(Object.keys(body.properties!).sort(), ["amount", "mode", "paidOn", "studentId"]);
    assert.deepEqual(body.required!.sort(), ["amount", "mode", "studentId"]);
    assert.ok(receipt.parameters!.some((p) => p.in === "header" && p.name === "idempotency-key" && p.required));
    assert.match(receipt.description!, /students\.fees/);

    const list = spec.paths["/api/v1/students"]!.get!;
    assert.ok(["q", "status", "cursor", "limit"].every((n) => list.parameters!.some((p) => p.in === "query" && p.name === n)));

    const login = spec.paths["/api/v1/auth/login"]!.post!;
    assert.equal(login.security, undefined, "login is public");
    assert.ok(spec.paths["/api/v1/me"]!.get!.security, "everything else needs a token");
  });

  test("the browsable page is served; production turns docs off unless API_DOCS=true", async () => {
    const page = await t.app.inject({ method: "GET", url: "/docs" });
    assert.equal(page.statusCode, 200);
    assert.match(page.body, /swagger-ui/i);
    assert.equal(loadEnv({ NODE_ENV: "development" }).API_DOCS, true);
    assert.equal(loadEnv({ NODE_ENV: "development", API_DOCS: "false" }).API_DOCS, false);
    assert.equal(apiDocsEnabled(undefined, "production"), false);
    assert.equal(apiDocsEnabled("true", "production"), true);
    const css = await t.app.inject({ method: "GET", url: "/docs/assets/swagger-ui.css" });
    assert.equal(css.statusCode, 200);
    assert.match(String(css.headers["content-type"]), /text\/css/);
    assert.equal((await t.app.inject({ method: "GET", url: "/docs/assets/..%2Fpackage.json" })).statusCode, 404, "only the three known files");
  });
});

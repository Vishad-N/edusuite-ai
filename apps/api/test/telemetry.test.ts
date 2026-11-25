import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { gunzipSync } from "node:zlib";
import { Controller, Get, Post } from "@nestjs/common";
import { Public } from "../src/auth/authUser";
import { captureError, flushTelemetry, initTelemetry, scrubMessage } from "../src/common/telemetry";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

@Public()
@Controller("telemetry-test")
class BoomController {
  @Post("boom")
  boom(): never {
    throw new Error('insert failed for "ramesh@example.com" phone 9876543210');
  }

  @Get("ok")
  ok() {
    return { ok: true };
  }
}

/** A stand-in for Sentry's ingest endpoint that keeps every event it receives. */
function fakeSentry(): Promise<{ server: Server; port: number; events: Array<Record<string, unknown>> }> {
  const events: Array<Record<string, unknown>> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body = Buffer.concat(chunks);
      if (req.headers["content-encoding"] === "gzip") body = gunzipSync(body);
      // Envelope: header line, then item header / payload pairs.
      const lines = body.toString("utf8").split("\n").filter(Boolean);
      for (let i = 1; i + 1 < lines.length; i += 2) {
        const item = JSON.parse(lines[i]!) as { type?: string };
        if (item.type === "event") events.push(JSON.parse(lines[i + 1]!));
      }
      res.writeHead(200, { "content-type": "application/json" }).end("{}");
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: (server.address() as { port: number }).port, events })));
}

test("scrubMessage keeps the shape and drops quoted values, emails and long numbers", () => {
  assert.equal(scrubMessage('Unique constraint failed on "email" = "a@b.co"'), 'Unique constraint failed on "…" = "…"');
  assert.equal(scrubMessage("call 9876543210 or mail x.y@school.in"), "call [number] or mail [email]");
  assert.equal(scrubMessage("x".repeat(400)).length, 300);
});

test("without a DSN nothing is set up and capture does nothing", () => {
  assert.equal(initTelemetry({ dsn: undefined, environment: "test", service: "api" }), false);
  captureError(new Error("ignored"));
});

describe("error reports (real Postgres, fake Sentry)", { skip: dbTestsSkipReason() }, () => {
  let t: TestApp;
  let sentry: Awaited<ReturnType<typeof fakeSentry>>;
  before(async () => {
    sentry = await fakeSentry();
    assert.equal(initTelemetry({ dsn: `http://publickey@127.0.0.1:${sentry.port}/1`, environment: "test", service: "api", release: "edusuite-api@test" }), true);
    t = await startTestApp([BoomController]);
  });
  after(async () => {
    await t?.close();
    sentry?.server.close();
  });

  test("a 500 is reported with safe tags and nothing personal; 4xx are not", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/api/v1/telemetry-test/boom",
      headers: { authorization: "Bearer secret-token-value", cookie: "a=b", "content-type": "application/json" },
      payload: { name: "Ramesh", phone: "9876543210" },
    });
    assert.equal(res.statusCode, 500);
    assert.equal((await t.call("POST", "/api/v1/auth/login", undefined, { identifier: "nobody", password: "wrong-password", deviceId: "test-device-0001" })).statusCode, 401);
    await flushTelemetry(5000);

    assert.equal(sentry.events.length, 1, "only the 500");
    const ev = sentry.events[0]!;
    const tags = ev.tags as Record<string, string>;
    assert.equal(tags.service, "api");
    assert.equal(tags.code, "INTERNAL");
    assert.equal(tags.route, "POST /api/v1/telemetry-test/boom");
    assert.ok(tags.request_id);
    assert.equal(ev.release, "edusuite-api@test");
    assert.equal(ev.request, undefined);
    assert.equal(ev.user, undefined);
    assert.equal(ev.breadcrumbs, undefined);

    const raw = JSON.stringify(ev);
    for (const secret of ["ramesh@example.com", "9876543210", "secret-token-value", "Ramesh", "a=b"]) assert.ok(!raw.includes(secret), `leaked ${secret}`);
    const value = (ev.exception as { values: Array<{ value: string }> }).values[0]!.value;
    assert.equal(value, 'insert failed for "…" phone [number]');
  });
});

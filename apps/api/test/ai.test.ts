import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AiJobSchema, IMPLEMENTED_AI_JOBS, PptOutlineOutputSchema } from "@edusuite/shared";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";
import { AI_QUEUE, type AiQueue } from "../src/ai/queue";
import { AiProcessor } from "../src/ai/processor";
import { AiJobError, AiRunner, costOf, fixtureKey } from "../src/ai/runner";
import { JOB_DEFINITIONS } from "../src/ai/definitions";
import { PrismaService } from "../src/prisma/prisma.service";
import { CreditsService } from "../src/credits/credits.service";
import { loadEnv } from "../src/config/env";

const skip = dbTestsSkipReason();

/** Records queued ids instead of talking to Redis; can be told to fail. */
class FakeQueue implements AiQueue {
  added: string[] = [];
  failNext = false;
  async add(id: string) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("redis down");
    }
    this.added.push(id);
  }
  async close() {}
}

describe("unit: runner helpers", () => {
  test("worker definitions match the shared list of implemented jobs", () => {
    assert.deepEqual(Object.keys(JOB_DEFINITIONS).sort(), [...IMPLEMENTED_AI_JOBS].sort());
  });
  test("fixture keys ignore key order; cost uses per-model rates", () => {
    assert.equal(fixtureKey("ppt_outline", { a: 1, b: { c: 2, d: 3 } }), fixtureKey("ppt_outline", { b: { d: 3, c: 2 }, a: 1 }));
    // 1M input + 1M output on Opus 5.5 = $4 + $20.
    assert.equal(costOf("claude-opus-5-5", { inputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 0, cacheWriteTokens: 0 }), 24);
  });
  test("production refuses fixture mode (DN-012); an empty key counts as unset", () => {
    assert.equal(loadEnv({ NODE_ENV: "development", ANTHROPIC_API_KEY: "" }).ANTHROPIC_API_KEY, undefined);
    assert.throws(() => loadEnv({ NODE_ENV: "production", AI_MODE: "fixture" }), /AI_MODE/);
    assert.equal(loadEnv({ NODE_ENV: "development" }).AI_MODE, "fixture");
  });
});

describe("AI jobs API (real Postgres)", { skip }, () => {
  let t: TestApp;
  let queue: FakeQueue;
  let processor: AiProcessor;
  let operator: string;
  let teacher: string;
  let typist: string;
  let ba: string;
  let counselor: string;
  let otherAdmin: string;

  const balance = async (instituteId: string) => (await t.db.institute.findUniqueOrThrow({ where: { id: instituteId } })).creditBalance;
  const start = (token: string, key: string | null, body: object = { type: "ppt_outline", input: { topic: "प्रकाश संश्लेषण", subject: "विज्ञान" } }) =>
    t.app.inject({
      method: "POST",
      url: "/api/v1/ai/jobs",
      headers: { authorization: `Bearer ${token}`, ...(key && { "idempotency-key": key }) },
      payload: body,
    });

  before(async () => {
    queue = new FakeQueue();
    t = await startTestApp([], [{ provide: AI_QUEUE, useValue: queue }]);
    operator = await t.token("P-PA");
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    ba = await t.token("A-BA");
    counselor = await t.token("A-C");
    otherAdmin = await t.token("B-BA");
    await t.call("POST", `/api/v1/platform/institutes/${t.fx.instA.id}/credits`, operator, { delta: 5, note: "test credits" });
    const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: process.env.DATABASE_URL_TEST ?? undefined, AI_FIXTURES_DIR: "does-not-exist" });
    // Reuse the app's own database connection.
    const prisma = t.app.get(PrismaService);
    processor = new AiProcessor(prisma, t.app.get(CreditsService), new AiRunner(env));
  });
  after(async () => {
    await t?.close();
  });
  beforeEach(() => {
    queue.added = [];
  });

  test("the app can read the AI mode", async () => {
    assert.deepEqual((await t.call("GET", "/api/v1/ai/mode", teacher)).json(), { mode: "fixture" });
  });

  test("starting a job takes its credits, queues it, and a repeat key is free", async () => {
    const before = await balance(t.fx.instA.id);
    const key = randomUUID();
    const res = await start(teacher, key);
    assert.equal(res.statusCode, 202);
    const job = AiJobSchema.parse(res.json());
    assert.equal(job.status, "queued");
    assert.equal(job.creditsCharged, 1);
    assert.deepEqual(queue.added, [job.id]);
    assert.equal(await balance(t.fx.instA.id), before - 1);
    const charge = await t.db.creditLedger.findUnique({ where: { aiJobId_kind: { aiJobId: job.id, kind: "job_charge" } } });
    assert.equal(charge?.delta, -1);

    // Double click / network retry with the same key: same job, no second charge, not queued again.
    const again = await start(teacher, key);
    assert.equal(again.statusCode, 200);
    assert.equal(again.json().id, job.id);
    assert.equal(await balance(t.fx.instA.id), before - 1);
    assert.deepEqual(queue.added, [job.id]);
  });

  test("bad requests: no key, bad input, unknown type, role without permission", async () => {
    assert.equal((await start(teacher, null)).statusCode, 400);
    assert.equal((await start(teacher, randomUUID(), { type: "ppt_outline", input: { topic: "x" } })).statusCode, 400);
    assert.equal((await start(teacher, randomUUID(), { type: "book_chapter", input: {} })).statusCode, 400);
    assert.equal((await start(counselor, randomUUID())).statusCode, 403, "DN-008: counselors don't get AI content");
    assert.equal((await t.call("POST", "/api/v1/ai/jobs")).statusCode, 401);
  });

  test("without enough credits the job is refused and nothing is written", async () => {
    const jobsBefore = await t.db.aiJob.count({ where: { instituteId: t.fx.instB.id } });
    const res = await start(otherAdmin, randomUUID());
    assert.equal(res.statusCode, 402);
    assert.equal(res.json().code, "CREDITS_EXHAUSTED");
    assert.equal(await t.db.aiJob.count({ where: { instituteId: t.fx.instB.id } }), jobsBefore, "the job row rolled back too");
  });

  test("the worker runs a job in fixture mode; the starter and admins can read the result", async () => {
    const job = AiJobSchema.parse((await start(teacher, randomUUID(), { type: "ppt_outline", input: { topic: "जल चक्र", slideCount: 5 } })).json());
    assert.equal(await processor.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "succeeded");
    const done = AiJobSchema.parse((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, teacher)).json());
    assert.equal(done.status, "succeeded");
    assert.equal(done.fixture, true);
    assert.deepEqual(done.progress, { done: 1, total: 1 });
    const deck = PptOutlineOutputSchema.parse(done.result);
    assert.equal(deck.title, "जल चक्र");
    assert.equal(deck.slides.length, 5);

    assert.equal((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, ba)).statusCode, 200, "branch admin");
    assert.equal((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, typist)).statusCode, 404, "another staff member");
    assert.equal((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, otherAdmin)).statusCode, 404, "another institute");
    // Processing again is a no-op.
    assert.equal(await processor.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "skipped");
  });

  test("a retryable failure waits for a retry; a final failure refunds once", async () => {
    const failing = new AiProcessor(t.app.get(PrismaService), t.app.get(CreditsService), {
      mode: "live",
      run: async () => {
        throw new AiJobError("AI_UNAVAILABLE", true, "status 529");
      },
    } as unknown as AiRunner);
    const before = await balance(t.fx.instA.id);
    const job = AiJobSchema.parse((await start(teacher, randomUUID())).json());
    assert.equal(await balance(t.fx.instA.id), before - 1);

    await assert.rejects(failing.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), AiJobError);
    assert.equal((await t.db.aiJob.findUniqueOrThrow({ where: { id: job.id } })).status, "queued");
    assert.equal(await balance(t.fx.instA.id), before - 1, "no refund while retries remain");

    assert.equal(await failing.process(job.id, { attemptsMade: 2, maxAttempts: 3 }), "failed");
    assert.equal(await balance(t.fx.instA.id), before, "refunded on the final attempt");
    const failed = (await t.app.inject({ method: "GET", url: `/api/v1/ai/jobs/${job.id}`, headers: { authorization: `Bearer ${teacher}`, "accept-language": "en" } })).json();
    assert.equal(failed.status, "failed");
    assert.equal(failed.error.code, "AI_UNAVAILABLE");
    assert.match(failed.error.message, /credits were returned/);
    // A second refund can't happen.
    assert.equal(await t.app.get(CreditsService).refundJob(job.id), false);
    assert.equal(await balance(t.fx.instA.id), before);
  });

  test("a job that can't be queued is failed and refunded", async () => {
    const before = await balance(t.fx.instA.id);
    queue.failNext = true;
    const res = await start(teacher, randomUUID());
    assert.equal(res.statusCode, 503);
    assert.equal(await balance(t.fx.instA.id), before);
  });

  test("the event stream sends the job and ends when it's finished", async () => {
    const job = AiJobSchema.parse((await start(teacher, randomUUID())).json());
    await processor.process(job.id, { attemptsMade: 0, maxAttempts: 3 });
    const res = await t.app.inject({ method: "GET", url: `/api/v1/ai/jobs/${job.id}/events`, headers: { authorization: `Bearer ${teacher}` } });
    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers["content-type"]), /text\/event-stream/);
    const events = res.body.split("\n\n").filter((e) => e.startsWith("data: ")).map((e) => JSON.parse(e.slice(6)));
    assert.equal(events.at(-1).status, "succeeded");
    assert.equal((await t.call("GET", `/api/v1/ai/jobs/${job.id}/events`, otherAdmin)).statusCode, 404);
  });
});

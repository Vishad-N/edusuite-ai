import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AiJobSchema, DeckQuizSchema, McqExtractResultSchema, PaperGenerateOutputSchema, IMPLEMENTED_AI_JOBS, PptOutlineOutputSchema, buildDeckQuizHtml } from "@edusuite/shared";
import { STORAGE } from "../src/files/storage";
import { FakeStorage, PNG_BYTES } from "./helpers/fakeStorage";
import type { JobContext, JobDefinition } from "../src/ai/definitions";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";
import { AI_QUEUE, type AiQueue } from "../src/ai/queue";
import { AiProcessor } from "../src/ai/processor";
import { AiJobError, AiRunner, costOf, fixtureKey } from "../src/ai/runner";
import { JOB_DEFINITIONS } from "../src/ai/definitions";
import { normalizePaper } from "../src/ai/paperGenerate";
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
  test("paper output keeps mcq, short, long order and drops broken questions", () => {
    const out = normalizePaper({
      title: " रसायन ",
      sections: [
        { kind: "long", questions: [{ q: "दीर्घ", options: ["x"], answer: "हल" }] },
        { kind: "mcq", questions: [{ q: "a?", options: ["1", "2", "3", "4"], answer: "A)" }, { q: "b?", options: ["1", "2"], answer: "A)" }] },
        { kind: "short", questions: [{ q: " ", options: [], answer: "" }] },
      ],
    });
    assert.deepEqual(out.sections.map((s) => [s.kind, s.questions.length]), [["mcq", 1], ["long", 1]]);
    assert.deepEqual(out.sections[1]!.questions[0]!.options, [], "only MCQs keep options");
    assert.throws(() => normalizePaper({ title: "x", sections: [] }), AiJobError);
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
  const storage = new FakeStorage();
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
    t = await startTestApp([], [
      { provide: AI_QUEUE, useValue: queue },
      { provide: STORAGE, useValue: storage },
    ]);
    operator = await t.token("P-PA");
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    ba = await t.token("A-BA");
    counselor = await t.token("A-C");
    otherAdmin = await t.token("B-BA");
    await t.call("POST", `/api/v1/platform/institutes/${t.fx.instA.id}/credits`, operator, { delta: 40, note: "test credits" });
    const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: process.env.DATABASE_URL_TEST ?? undefined, AI_FIXTURES_DIR: "does-not-exist" });
    // Reuse the app's own database connection.
    const prisma = t.app.get(PrismaService);
    processor = new AiProcessor(prisma, t.app.get(CreditsService), new AiRunner(env), storage);
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

  test("paper_generate runs in fixture mode with the requested counts", async () => {
    const res = await start(teacher, randomUUID(), { type: "paper_generate", input: { subject: "रसायन", topics: "अम्ल और क्षार", mcqCount: 4, shortCount: 2, longCount: 0 } });
    const job = AiJobSchema.parse(res.json());
    assert.equal(job.creditsCharged, 2, "DN-053 default price");
    assert.equal(await processor.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "succeeded");
    const paper = PaperGenerateOutputSchema.parse(AiJobSchema.parse((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, teacher)).json()).result);
    assert.deepEqual(paper.sections.map((s) => [s.kind, s.questions.length]), [["mcq", 4], ["short", 2]]);
    assert.equal(paper.sections[0]!.questions[0]!.options.length, 4);
  });

  test("a retryable failure waits for a retry; a final failure refunds once", async () => {
    const failing = new AiProcessor(t.app.get(PrismaService), t.app.get(CreditsService), {
      mode: "live",
      run: async () => {
        throw new AiJobError("AI_UNAVAILABLE", true, "status 529");
      },
    } as unknown as AiRunner, storage);
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

  /** Presign → upload → complete through the files API, as the desktop app does. */
  const upload = async (token: string, mime: string, bytes: Uint8Array, complete = true): Promise<string> => {
    const { fileId } = (await t.call("POST", "/api/v1/files/presign", token, { name: "deck.pdf", mime, bytes: bytes.byteLength })).json();
    const key = (await t.db.file.findUniqueOrThrow({ where: { id: fileId } })).bucketKey;
    storage.upload(key, bytes);
    if (complete) assert.equal((await t.call("POST", `/api/v1/files/${fileId}/complete`, token)).statusCode, 200);
    return fileId;
  };
  const PDF = (size = 256) => {
    const b = new Uint8Array(size);
    b.set(new TextEncoder().encode("%PDF-1.7\n"));
    return b;
  };
  const deck = (fileId: string) => ({ type: "deck_quiz", input: { fileId, exam: "SSC CGL", subject: "जीव विज्ञान · यूनिट-1" } });

  test("deck_quiz refuses a bad file before any credits are taken", async () => {
    const before = await balance(t.fx.instA.id);
    const png = await upload(teacher, "image/png", PNG_BYTES(64));
    const unfinished = await upload(teacher, "application/pdf", PDF(), false);
    const foreign = await upload(otherAdmin, "application/pdf", PDF());
    for (const fileId of [png, unfinished, foreign, randomUUID()]) {
      const res = await start(teacher, randomUUID(), deck(fileId));
      assert.equal(res.statusCode, 400, fileId);
      assert.equal(res.json().code, "AI_INPUT_FILE_INVALID");
    }
    assert.equal(await balance(t.fx.instA.id), before);
  });

  test("deck_quiz costs 10 credits and returns checked quiz data (fixture mode)", async () => {
    const before = await balance(t.fx.instA.id);
    const job = AiJobSchema.parse((await start(teacher, randomUUID(), deck(await upload(teacher, "application/pdf", PDF())))).json());
    assert.equal(job.creditsCharged, 10);
    assert.equal(await balance(t.fx.instA.id), before - 10);
    assert.equal(await processor.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "succeeded");
    const done = AiJobSchema.parse((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, teacher)).json());
    const quiz = DeckQuizSchema.parse(done.result);
    assert.equal(quiz.questions.length, 3);
    assert.equal(quiz.questions.filter((q) => !q.answerInDeck).length, 2, "unverified answers are marked");
    const html = buildDeckQuizHtml(quiz, { instituteName: t.fx.instA.name, exam: "SSC CGL", subject: "जीव विज्ञान" });
    assert.ok(html.includes(`<b>${t.fx.instA.name}</b>`));
  });

  test("deck_quiz sends the uploaded PDF to Claude; a job can't read another institute's file", async () => {
    const pdf = PDF(300);
    const own = await upload(teacher, "application/pdf", pdf);
    const foreign = await upload(otherAdmin, "application/pdf", PDF());
    let sent: unknown[] = [];
    // A runner that builds the real request content, then answers like the fixture.
    const peek = { mode: "live", run: async (def: JobDefinition<never, unknown>, input: never, ctx: JobContext) => {
      sent = await def.user(input, ctx);
      return { output: def.fixture(input, ctx), fixture: false, usage: [] };
    } } as unknown as AiRunner;
    const p = new AiProcessor(t.app.get(PrismaService), t.app.get(CreditsService), peek, storage);

    const job = AiJobSchema.parse((await start(teacher, randomUUID(), deck(own))).json());
    assert.equal(await p.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "succeeded");
    const doc = sent[0] as { type: string; source: { media_type: string; data: string } };
    assert.equal(doc.type, "document");
    assert.equal(doc.source.media_type, "application/pdf");
    assert.deepEqual(new Uint8Array(Buffer.from(doc.source.data, "base64")), pdf);
    assert.match((sent[1] as { text: string }).text, new RegExp(`Institute: ${t.fx.instA.name}`));

    // Swap the stored input to another institute's file: the worker refuses it and refunds.
    const before = await balance(t.fx.instA.id);
    const job2 = AiJobSchema.parse((await start(teacher, randomUUID(), deck(own))).json());
    await t.db.aiJob.update({ where: { id: job2.id }, data: { input: deck(foreign).input } });
    assert.equal(await p.process(job2.id, { attemptsMade: 0, maxAttempts: 3 }), "failed");
    assert.equal((await t.db.aiJob.findUniqueOrThrow({ where: { id: job2.id } })).errorCode, "AI_INPUT_FILE_INVALID");
    assert.equal(await balance(t.fx.instA.id), before, "refunded");
  });

  const JPEG = (size = 128) => {
    const b = new Uint8Array(size);
    b.set([0xff, 0xd8, 0xff, 0xe0]);
    return b;
  };
  const shots = (fileIds: string[]) => ({ type: "mcq_extract", input: { fileIds, subject: "इतिहास" } });

  test("mcq_extract refuses non-images and other institutes' files before charging", async () => {
    const before = await balance(t.fx.instA.id);
    const good = await upload(teacher, "image/png", PNG_BYTES(64));
    const pdf = await upload(teacher, "application/pdf", PDF());
    const foreign = await upload(otherAdmin, "image/png", PNG_BYTES(64));
    for (const bad of [pdf, foreign, randomUUID()]) {
      const res = await start(teacher, randomUUID(), shots([good, bad]));
      assert.equal(res.json().code, "AI_INPUT_FILE_INVALID", bad);
    }
    assert.equal(await balance(t.fx.instA.id), before);
    assert.equal((await start(counselor, randomUUID(), shots([good]))).statusCode, 403);
  });

  test("mcq_extract charges per screenshot and returns one item per file, in order", async () => {
    const ids = [await upload(teacher, "image/png", PNG_BYTES(64)), await upload(teacher, "image/jpeg", JPEG()), await upload(teacher, "image/png", PNG_BYTES(80))];
    const before = await balance(t.fx.instA.id);
    const job = AiJobSchema.parse((await start(teacher, randomUUID(), shots(ids))).json());
    assert.equal(job.creditsCharged, 3);
    assert.equal(await balance(t.fx.instA.id), before - 3);
    assert.equal(await processor.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "succeeded");
    const result = McqExtractResultSchema.parse(AiJobSchema.parse((await t.call("GET", `/api/v1/ai/jobs/${job.id}`, teacher)).json()).result);
    assert.deepEqual(result.items.map((i) => i.fileId), ids);
    assert.deepEqual(result.items.map((i) => i.answerFromImage), [true, false, true]);
  });

  test("mcq_extract sends each image with its type; a screenshot Claude skips comes back as not found", async () => {
    const png = PNG_BYTES(70);
    const jpg = JPEG(90);
    const ids = [await upload(teacher, "image/png", png), await upload(teacher, "image/jpeg", jpg)];
    let sent: Array<{ type: string; text?: string; source?: { media_type: string; data: string } }> = [];
    const peek = { mode: "live", run: async (def: JobDefinition<never, unknown>, input: never, ctx: JobContext) => {
      sent = (await def.user(input, ctx)) as typeof sent;
      const out = def.fixture(input, ctx) as { items: unknown[] };
      return { output: { items: out.items.slice(0, 1) }, fixture: false, usage: [] };
    } } as unknown as AiRunner;
    const p = new AiProcessor(t.app.get(PrismaService), t.app.get(CreditsService), peek, storage);
    const job = AiJobSchema.parse((await start(teacher, randomUUID(), shots(ids))).json());
    assert.equal(await p.process(job.id, { attemptsMade: 0, maxAttempts: 3 }), "succeeded");
    assert.deepEqual(sent.map((b) => b.type), ["text", "image", "text", "image", "text"]);
    assert.equal(sent[1]!.source!.media_type, "image/png");
    assert.deepEqual(new Uint8Array(Buffer.from(sent[3]!.source!.data, "base64")), jpg);
    assert.equal(sent[3]!.source!.media_type, "image/jpeg");
    const result = McqExtractResultSchema.parse((await t.db.aiJob.findUniqueOrThrow({ where: { id: job.id } })).result);
    assert.deepEqual(result.items.map((i) => i.found), [true, false]);
  });
});
import { test } from "node:test";
import assert from "node:assert/strict";
import { AiJobCreateSchema, IMPLEMENTED_AI_JOBS, PAPER_MAX_QUESTIONS, PptOutlineOutputSchema, jobItemCount } from "./ai.ts";
import { AI_JOB_PERMISSIONS } from "./permissions.ts";

test("implemented job types are known, permissioned job types", () => {
  assert.deepEqual(IMPLEMENTED_AI_JOBS, ["ppt_outline", "paper_generate", "mcq_extract", "deck_quiz"]);
  for (const t of IMPLEMENTED_AI_JOBS) assert.ok(t in AI_JOB_PERMISSIONS, t);
});

test("ppt_outline input gets defaults and limits", () => {
  const job = AiJobCreateSchema.parse({ type: "ppt_outline", input: { topic: "प्रकाश संश्लेषण" } });
  assert.equal(job.type, "ppt_outline");
  assert.equal(job.input.slideCount, 6);
  assert.equal(job.input.language, "hi");
  assert.equal(jobItemCount(job), 1);
  assert.ok(!AiJobCreateSchema.safeParse({ type: "ppt_outline", input: { topic: "x" } }).success, "topic too short");
  assert.ok(!AiJobCreateSchema.safeParse({ type: "ppt_outline", input: { topic: "ok topic", slideCount: 40 } }).success);
  assert.ok(!AiJobCreateSchema.safeParse({ type: "book_chapter", input: {} }).success, "not implemented yet");
});

test("ppt_outline output matches what PptMaker fills", () => {
  const out = PptOutlineOutputSchema.parse({
    title: "प्रकाश संश्लेषण",
    subtitle: "कक्षा 10 · विज्ञान",
    slides: [{ tag: "परिचय", title: "क्या है?", points: ["a", "b", "c"], takeaway: "" }],
  });
  assert.equal(out.slides[0]!.points.length, 3);
});

test("paper_generate input gets defaults and needs 1 to 60 questions", () => {
  const job = AiJobCreateSchema.parse({ type: "paper_generate", input: { subject: "रसायन", topics: "अम्ल, क्षार और लवण" } });
  assert.equal(job.type, "paper_generate");
  if (job.type !== "paper_generate") return;
  assert.deepEqual([job.input.mcqCount, job.input.shortCount, job.input.longCount], [10, 5, 2]);
  assert.equal(job.input.difficulty, "mixed");
  const bad = (input: object) => !AiJobCreateSchema.safeParse({ type: "paper_generate", input: { subject: "रसायन", topics: "अम्ल", ...input } }).success;
  assert.ok(bad({ mcqCount: 0, shortCount: 0, longCount: 0 }), "no questions");
  assert.ok(bad({ mcqCount: 50, shortCount: 30, longCount: 10 }), `more than ${PAPER_MAX_QUESTIONS}`);
  assert.ok(bad({ topics: "" }));
});
test("mcq_extract is priced per screenshot and takes 1 to 20 distinct files", () => {
  const ids = Array.from({ length: 3 }, () => crypto.randomUUID());
  const job = AiJobCreateSchema.parse({ type: "mcq_extract", input: { fileIds: ids } });
  assert.equal(jobItemCount(job), 3);
  const bad = (fileIds: string[]) => !AiJobCreateSchema.safeParse({ type: "mcq_extract", input: { fileIds } }).success;
  assert.ok(bad([]));
  assert.ok(bad([ids[0]!, ids[0]!]), "duplicates");
  assert.ok(bad(Array.from({ length: 21 }, () => crypto.randomUUID())));
});
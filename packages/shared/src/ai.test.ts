import { test } from "node:test";
import assert from "node:assert/strict";
import { AiJobCreateSchema, IMPLEMENTED_AI_JOBS, PptOutlineOutputSchema, jobItemCount } from "./ai.ts";
import { AI_JOB_PERMISSIONS } from "./permissions.ts";

test("implemented job types are known, permissioned job types", () => {
  assert.deepEqual(IMPLEMENTED_AI_JOBS, ["ppt_outline", "deck_quiz"]);
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

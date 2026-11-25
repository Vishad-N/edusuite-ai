import { test } from "node:test";
import assert from "node:assert/strict";
import { QuestionBulkCreateSchema, QuestionInputSchema, bankToPaperMcq, normalizeQuestionText, paperMcqToBank } from "./questions.ts";

const base = { subject: "जीव विज्ञान", bodyHi: "कोशिका का पावरहाउस?", options: { A: "माइटोकॉन्ड्रिया", B: "राइबोसोम", C: "केंद्रक", D: "लाइसोसोम" }, answer: "A" };

test("input is tidied and checked (DN-074)", () => {
  const parsed = QuestionInputSchema.parse({ ...base, bodyHi: "  कोशिका   का\nपावरहाउस? ", topic: "  ", trick: "" });
  assert.equal(parsed.bodyHi, "कोशिका का पावरहाउस?");
  assert.equal(parsed.topic, undefined);
  assert.equal(parsed.trick, undefined);
  assert.equal(QuestionInputSchema.safeParse({ ...base, answer: "E" }).success, false);
  assert.equal(QuestionInputSchema.safeParse({ ...base, options: { ...base.options, D: " " } }).success, false);
  assert.equal(QuestionBulkCreateSchema.safeParse({ questions: [] }).success, false);
  assert.equal(QuestionBulkCreateSchema.safeParse({ questions: Array(201).fill(base) }).success, false);
  assert.equal(normalizeQuestionText(" a \n b "), "a b");
});

test("paper MCQs convert both ways; anything not a clean MCQ is skipped", () => {
  const paper = { q: "कोशिका का पावरहाउस?", options: ["A) माइटोकॉन्ड्रिया", "B) राइबोसोम", "(c) केंद्रक", "D. लाइसोसोम"], ans: "A) माइटोकॉन्ड्रिया" };
  const bank = paperMcqToBank(paper, "जीव विज्ञान", "कोशिका")!;
  assert.deepEqual(bank.options, base.options);
  assert.equal(bank.answer, "A");
  assert.equal(bank.topic, "कोशिका");
  assert.equal(paperMcqToBank({ ...paper, ans: "b" }, "जीव")!.answer, "B");
  assert.equal(paperMcqToBank({ ...paper, options: paper.options.slice(0, 3) }, "जीव"), null, "three options");
  assert.equal(paperMcqToBank({ ...paper, ans: "" }, "जीव"), null, "no answer");
  assert.equal(paperMcqToBank({ q: "Explain osmosis.", ans: "…" }, "जीव"), null, "not an MCQ");
  assert.equal(paperMcqToBank(paper, " "), null, "no subject");

  const back = bankToPaperMcq({ bodyHi: bank.bodyHi, options: base.options, answer: "C" });
  assert.deepEqual(back.options, ["A) माइटोकॉन्ड्रिया", "B) राइबोसोम", "C) केंद्रक", "D) लाइसोसोम"]);
  assert.equal(back.ans, "C) केंद्रक");
});

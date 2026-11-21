import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENT_CONTENT_SCHEMAS,
  DOCUMENT_PERMISSIONS,
  DOCUMENT_SCHEMA_VERSIONS,
  DOCUMENT_TYPES,
  DocumentUpdateSchema,
  parseDocumentContent,
} from "./documents.ts";
import { PERMISSIONS, can } from "./permissions.ts";

test("every document type has a schema, a version and a known permission", () => {
  for (const t of DOCUMENT_TYPES) {
    assert.ok(DOCUMENT_CONTENT_SCHEMAS[t], t);
    assert.ok(DOCUMENT_SCHEMA_VERSIONS[t] >= 1, t);
    assert.ok(PERMISSIONS.includes(DOCUMENT_PERMISSIONS[t]), t);
  }
});

test("a PPT matching the screen's state is accepted", () => {
  const ok = parseDocumentContent("ppt", {
    title: "प्रकाश संश्लेषण",
    grade: "Class 10",
    subject: "Biology",
    theme: "navy",
    slides: [{ tag: "Introduction", title: "मूल बातें", points: ["एक", "दो"], takeaway: "याद रखें" }],
  });
  assert.equal(ok.success, true);
});

test("an MCQ needs four options and a valid answer letter", () => {
  const base = { sessionTitle: "MP GK", questions: [{ qNum: 1, question: "प्रश्न?", options: { A: "1", B: "2", C: "3", D: "4" }, correct: "B" }] };
  assert.equal(parseDocumentContent("mcq_set", base).success, true);
  const badLetter = { ...base, questions: [{ ...base.questions[0], correct: "E" }] };
  assert.equal(parseDocumentContent("mcq_set", badLetter).success, false);
  const threeOptions = { ...base, questions: [{ ...base.questions[0], options: { A: "1", B: "2", C: "3" } }] };
  assert.equal(parseDocumentContent("mcq_set", threeOptions).success, false);
});

test("wrong shapes are rejected", () => {
  assert.equal(parseDocumentContent("doubt", { question: "x" }).success, false);
  assert.equal(parseDocumentContent("poster", { category: "a", headline: "b", accentColor: "red" }).success, false);
});

test("counselors may save notices and posters but not AI content", () => {
  assert.equal(can("counselor", DOCUMENT_PERMISSIONS.notice), true);
  assert.equal(can("counselor", DOCUMENT_PERMISSIONS.poster), true);
  assert.equal(can("counselor", DOCUMENT_PERMISSIONS.ppt), false);
  assert.equal(can("typist", DOCUMENT_PERMISSIONS.notice), false);
});

test("an update must say which version it is replacing", () => {
  assert.equal(DocumentUpdateSchema.safeParse({ title: "x" }).success, false);
  assert.equal(DocumentUpdateSchema.safeParse({ expectedUpdatedAt: "2026-11-21T10:00:00.000Z" }).success, false);
  assert.equal(DocumentUpdateSchema.safeParse({ title: "x", expectedUpdatedAt: "2026-11-21T10:00:00.000Z" }).success, true);
});

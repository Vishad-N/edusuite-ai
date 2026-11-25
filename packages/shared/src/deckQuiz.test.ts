import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  DeckQuizSchema,
  buildDeckQuizHtml,
  deckQuizFileName,
  normalizeDeckQuiz,
  type DeckQuizOutput,
} from "./deckQuiz.ts";
import { DECK_QUIZ_TEMPLATE } from "./deckQuizTemplate.ts";
import { AiJobCreateSchema } from "./ai.ts";

const bi = (hi: string, en = hi) => ({ hi, en });
const question = (over: Partial<DeckQuizOutput["questions"][number]> = {}): DeckQuizOutput["questions"][number] => ({
  q: bi("प्रश्न?", "Question?"),
  options: [bi("क"), bi("ख"), bi("ग"), bi("घ")],
  answer: 1,
  answerInDeck: false,
  explanation: bi("क्योंकि", "Because"),
  visual: { title: bi("अवधारणा"), points: [{ ...bi("बिंदु 1"), key: true }, { ...bi("बिंदु 2"), key: false }] },
  note: "",
  ...over,
});

test("the generated template module matches templates/deck-quiz.html", () => {
  const html = readFileSync(new URL("../templates/deck-quiz.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(DECK_QUIZ_TEMPLATE, html, "run: npm run gen:quiz-template -w @edusuite/shared");
});

test("the template carries no other institute's name, no ads and no outside requests", () => {
  assert.doesNotMatch(DECK_QUIZ_TEMPLATE, /Satyadhi|सत्याधी|MPTET|Sponsored|विज्ञापन/i);
  assert.doesNotMatch(DECK_QUIZ_TEMPLATE, /<script[^>]+src=|<link[^>]+href=|@import|https:\/\//);
  for (const p of ["{{TITLE}}", "{{BRAND}}", "{{SUBLINE}}", "/*{{CFG}}*/null", "/*{{Q}}*/[]"]) assert.ok(DECK_QUIZ_TEMPLATE.includes(p), p);
});

test("deck_quiz input: an uploaded file id plus exam and subject", () => {
  const ok = AiJobCreateSchema.safeParse({ type: "deck_quiz", input: { fileId: crypto.randomUUID(), exam: "MPTET", subject: "जीव विज्ञान" } });
  assert.ok(ok.success);
  assert.ok(!AiJobCreateSchema.safeParse({ type: "deck_quiz", input: { fileId: "x", exam: "MPTET", subject: "Bio" } }).success);
});

test("normalize keeps good questions and lists every dropped one", () => {
  const quiz = normalizeDeckQuiz({
    title: bi(" जीव विज्ञान ", "Biology"),
    questions: [question(), question({ options: [bi("a"), bi("b")] }), question({ answer: 4 }), question({ q: bi(" ", "") })],
    issues: ["Page 3 is blurred", " "],
  });
  assert.ok(quiz);
  assert.equal(quiz.title.hi, "जीव विज्ञान");
  assert.equal(quiz.questions.length, 1);
  assert.deepEqual(quiz.issues, [
    "Page 3 is blurred",
    "Question 2 was left out: it has 2 options, not 4.",
    "Question 3 was left out: no valid answer.",
    "Question 4 was left out: the question text is empty.",
  ]);
  assert.ok(DeckQuizSchema.safeParse(quiz).success);
  assert.equal(normalizeDeckQuiz({ title: bi("x"), questions: [question({ answer: -1 })], issues: [] }), null);
});

test("the built file uses this institute's name, escapes deck text, and its data runs as script", () => {
  const quiz = normalizeDeckQuiz({
    title: bi("भौतिकी $& <b>", "Physics"),
    questions: [question({ q: bi("</script><script>alert(1)</script>", "x\u2028y") })],
    issues: [],
  })!;
  const html = buildDeckQuizHtml(quiz, { instituteName: "डेमो कोचिंग & Co", exam: "SSC", subject: "भौतिकी" });
  assert.doesNotMatch(html, /\{\{|\/\*\{\{/, "every placeholder filled");
  assert.match(html, /<b>डेमो कोचिंग &#38; Co<\/b>/);
  assert.match(html, /<title>भौतिकी \$&#38; &#60;b&#62; — डेमो कोचिंग &#38; Co<\/title>/);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1, "deck text can't close the script block");
  assert.ok(!html.includes(String.fromCharCode(0x2028)));

  // The data lines are valid JavaScript with the values we expect.
  const cfgLine = html.split("\n").find((l) => l.startsWith("const CFG = "))!;
  const qLine = html.split("\n").find((l) => l.startsWith("const Q = "))!;
  const data = runInNewContext(`${cfgLine}\n${qLine}\n({ CFG, Q })`) as { CFG: { brand: string; initials: string }; Q: Array<{ a: number; q: { hi: string } }> };
  assert.equal(data.CFG.brand, "डेमो कोचिंग &#38; Co");
  assert.equal(data.CFG.initials, "डेको");
  assert.equal(data.Q.length, 1);
  assert.equal(data.Q[0]!.a, 1);
  assert.equal(data.Q[0]!.q.hi, "&#60;/script&#62;&#60;script&#62;alert(1)&#60;/script&#62;");
});

test("the institute's logo goes in only as an embedded image (DN-071)", () => {
  const quiz = normalizeDeckQuiz({ title: bi("जीव", "Biology"), questions: [question()], issues: [] })!;
  const cfgOf = (logo: string | undefined) => {
    const html = buildDeckQuizHtml(quiz, { instituteName: "डेमो", exam: "SSC", subject: "जीव", logo });
    const line = html.split("\n").find((l) => l.startsWith("const CFG = "))!;
    return runInNewContext(`${line}\nCFG`) as { logo: string };
  };
  const png = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(cfgOf(png).logo, png);
  for (const bad of [undefined, "https://example.com/logo.png", "data:image/svg+xml;base64,PHN2Zz4=", 'data:image/png;base64,x"onerror=alert(1)']) {
    assert.equal(cfgOf(bad).logo, "", String(bad));
  }
});

test("download name comes from the English title", () => {
  const quiz = normalizeDeckQuiz({ title: bi("जीव", "Biology · Taxonomy!"), questions: [question()], issues: [] })!;
  assert.equal(deckQuizFileName(quiz), "biology-taxonomy-quiz.html");
  assert.equal(deckQuizFileName({ ...quiz, title: bi("जीव", "") }), "quiz.html");
});

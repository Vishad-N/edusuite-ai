import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeForTemplate, generateMotionHtml } from "./motionHtmlGenerator.js";

// Plain JS test: the generator and its 77 KB template are JS (run by node directly, see package.json).
test("the motion file carries only the given institute and set details", () => {
  const html = generateMotionHtml({
    title: "Rivers $& Lakes",
    examTag: "MPPSC",
    subject: "भूगोल",
    facultyName: "Ms. Rao",
    instituteName: "Demo `Coaching` ${x} <b>",
    questions: [{ question: "Q?", options: { A: "1", B: "2", C: "3", D: "4" }, correct: "B" }],
  });
  for (const banned of ["Satyadhi", "सत्याधी", "इंदौर", "INDORE", "makeAdSlide('", "{{"]) {
    assert.equal(html.includes(banned), false, `still contains ${banned}`);
  }
  assert.ok(html.includes("Rivers &#36;&#38; Lakes"), "a $& in the title is inserted as text, not a replacement pattern");
  assert.ok(html.includes("Demo &#96;Coaching&#96; &#36;{x} &#60;b&#62;"), "the name can't break HTML or a template literal");
  assert.ok(html.includes("0 / 1</div>"), "question count is the real one");
});

test("escapeForTemplate covers HTML and JS template-literal characters", () => {
  assert.equal(escapeForTemplate("a<b>&\"'`$\\"), "a&#60;b&#62;&#38;&#34;&#39;&#96;&#36;&#92;");
});

import { MOTION_TEMPLATE_BEFORE, MOTION_TEMPLATE_AFTER } from "./motionTemplate.js";
import { initialsLogo } from "./branding.ts";

/**
 * Maps our scanned questions into the exact motion engine schema:
 * {
 *   h: "Hindi Question",
 *   e: "English Question",
 *   o: [ ["Opt A Hindi", "Opt A Eng"], ["Opt B Hindi", "Opt B Eng"], ... ],
 *   a: 0|1|2|3,
 *   v: "tree" | "dna" | "cell" | ...,
 *   cat: "Exam / Subject Tag",
 *   exp: "Explanation / Shortcut Trick",
 *   screenshotDataUrl: "data:image/..."
 * }
 */
export function buildMotionQuestions(questions = [], defaultExam = "") {
  return questions.map((q, idx) => {
    // Map options
    const optList = [
      [q.options?.A || "विकल्प A", "Option A"],
      [q.options?.B || "विकल्प B", "Option B"],
      [q.options?.C || "विकल्प C", "Option C"],
      [q.options?.D || "विकल्प D", "Option D"],
    ];

    // Determine correct answer index
    const correctLetter = (q.correct || "A").trim().toUpperCase();
    const correctIndex = { A: 0, B: 1, C: 2, D: 3 }[correctLetter] ?? 0;

    // Vector art type
    const artTypes = ["tree", "dna", "cell", "hierarchy", "microscope"];
    const artChoice = artTypes[idx % artTypes.length];

    return {
      h: q.question || `प्रश्न संख्या ${idx + 1}`,
      e: `Question ${idx + 1}: Select the correct option.`,
      o: optList,
      a: correctIndex,
      v: artChoice,
      cat: q.exam || defaultExam,
      exp: q.trick || "",
      screenshotDataUrl: q.screenshotDataUrl || null,
    };
  });
}

/**
 * Text placed into the template lands in HTML and, on some slides, inside a JS
 * template literal, so escape both kinds of special character.
 */
export function escapeForTemplate(value) {
  return String(value ?? "").replace(/[&<>"'`$\\]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function fill(template, values) {
  // A function replacement, so "$&" or "$1" in staff text is inserted as-is.
  return template.replace(/{{([A-Z_]+)}}/g, (whole, key) => (key in values ? values[key] : whole));
}

/**
 * Compiles the standalone HTML5 Motion Interactive Studio file. Everything shown
 * comes from the set and the signed-in institute (DN-052); there are no ad slides.
 */
export function generateMotionHtml({
  title = "MCQ अभ्यास",
  examTag = "",
  subject = "",
  facultyName = "",
  instituteName = "",
  /** City and phone, shown where the template has a contact line. */
  instituteContact = "",
  logoUrl = "",
  questions = [],
}) {
  const motionQuestions = buildMotionQuestions(questions, examTag);
  const values = {
    TITLE: escapeForTemplate(title),
    INSTITUTE_NAME: escapeForTemplate(instituteName),
    INSTITUTE_CONTACT: escapeForTemplate(instituteContact),
    EXAM_TAG: escapeForTemplate(examTag),
    SUBJECT: escapeForTemplate(subject),
    FACULTY_NAME: escapeForTemplate(facultyName),
    TOTAL_QUESTIONS: String(questions.length),
    // Data URLs only (a logo from the app, or the initials badge); quotes can't occur in them.
    LOGO_URL: escapeForTemplate(logoUrl || initialsLogo(instituteName)),
  };
  // `<` is escaped so question text can never close the script block.
  const questionsJson = JSON.stringify(motionQuestions, null, 2).replace(/</g, "\\u003c");
  return `${fill(MOTION_TEMPLATE_BEFORE, values)}const QS = ${questionsJson};${fill(MOTION_TEMPLATE_AFTER, values)}`;
}

/**
 * 1-Click Browser Download of standalone .html file
 */
export function downloadMotionHtmlFile(params) {
  const htmlContent = generateMotionHtml(params);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (params.title || "Motion_Class").replace(/[^a-zA-Z0-9_ऀ-ॿ]/g, "_");
  a.download = `${safeName}_Motion.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

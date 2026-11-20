import { MOTION_TEMPLATE_BEFORE, MOTION_TEMPLATE_AFTER } from "./motionTemplate.js";
import { SATYADHI_LOGO } from "./mediaHelper.js";

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
export function buildMotionQuestions(questions = [], defaultExam = "MPPSC / व्यापम PYQ") {
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
      exp: q.trick || "सत्याधी शर्मा क्लासेस व्याख्या एवं महत्वपूर्ण परीक्षा तथ्य।",
      screenshotDataUrl: q.screenshotDataUrl || null,
    };
  });
}

/**
 * Compiles the standalone HTML5 Motion Interactive Studio file
 */
export function generateMotionHtml({
  title = "MCQ Live Motion Class",
  examTag = "MPPSC / व्यापम PYQ",
  subject = "सामान्य अध्ययन & विज्ञान",
  facultyName = "शर्मा सर & फैकल्टी",
  instituteName = "सत्याधी शर्मा क्लासेस, इंदौर",
  logoUrl = SATYADHI_LOGO,
  questions = [],
}) {
  const motionQuestions = buildMotionQuestions(questions, examTag);
  const questionsJson = JSON.stringify(motionQuestions, null, 2);

  // Replace placeholders in before template
  let before = MOTION_TEMPLATE_BEFORE
    .replace(/{{TITLE}}/g, title)
    .replace(/{{INSTITUTE_NAME}}/g, instituteName)
    .replace(/{{LOGO_URL}}/g, logoUrl || SATYADHI_LOGO)
    .replace(/{{EXAM_TAG}}/g, examTag)
    .replace(/{{SUBJECT}}/g, subject)
    .replace(/{{BRAND_NAME}}/g, "SATYADHI SHARMA")
    .replace(/{{BRAND_SUB}}/g, "CLASSES · INDORE");

  // Replace placeholders in after template
  let after = MOTION_TEMPLATE_AFTER
    .replace(/{{TITLE}}/g, title)
    .replace(/{{INSTITUTE_NAME}}/g, instituteName)
    .replace(/{{LOGO_URL}}/g, logoUrl || SATYADHI_LOGO)
    .replace(/{{EXAM_TAG}}/g, examTag)
    .replace(/{{SUBJECT}}/g, subject)
    .replace(/{{FACULTY_NAME}}/g, facultyName)
    .replace(/{{TOTAL_QUESTIONS}}/g, String(questions.length));

  // Assemble full HTML with the questions array
  const fullHtml = `${before}const QS = ${questionsJson};${after}`;
  return fullHtml;
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
  const safeName = (params.title || "Satyadhi_Motion_Class").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_");
  a.download = `${safeName}_Motion.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

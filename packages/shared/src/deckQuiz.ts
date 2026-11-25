import { z } from "zod";
import { initialsOf } from "./branding.ts";
import { DECK_QUIZ_TEMPLATE } from "./deckQuizTemplate.ts";

/**
 * Deck → interactive quiz (DN-055). A teacher uploads an MCQ deck (PDF); Claude reads
 * it and returns the questions in Hindi and English with explanations and the key
 * points behind each answer. The teacher checks the answers, then the app builds one
 * self-contained HTML quiz that carries only the signed-in institute's name.
 */

const Bi = z.object({ hi: z.string(), en: z.string() });
export type BiText = z.infer<typeof Bi>;

/** Claude's limit for a PDF in one request is 32 MB including the rest of the request (base64 adds a third). */
export const DECK_QUIZ_MAX_PDF_BYTES = 20 * 1024 * 1024;
export const DECK_QUIZ_MAX_QUESTIONS = 100;

export const DeckQuizInputSchema = z.object({
  /** An uploaded, verified PDF of the institute (files API, DN-040). */
  fileId: z.uuid(),
  /** Shown on the quiz, e.g. "MPTET वर्ग-1". */
  exam: z.string().trim().min(2).max(100),
  /** Shown on the quiz, e.g. "जीव विज्ञान · यूनिट-1". */
  subject: z.string().trim().min(2).max(150),
});
export type DeckQuizInput = z.infer<typeof DeckQuizInputSchema>;

const VisualSchema = z.object({
  title: Bi.describe("The concept the question tests, 2 to 6 words"),
  points: z
    .array(z.object({ hi: z.string(), en: z.string(), key: z.boolean().describe("true for the points the correct answer rests on") }))
    .describe("2 to 5 short facts that explain the concept; one or two are key"),
});

/** What Claude returns (structured outputs). Kept loose; normalizeDeckQuiz checks the rest. */
export const DeckQuizOutputSchema = z.object({
  title: Bi.describe("Short quiz title: subject and unit, e.g. जीव विज्ञान · वर्गीकरण / Biology · Taxonomy"),
  questions: z.array(
    z.object({
      q: Bi,
      options: z.array(Bi).describe("Exactly four options, in the deck's order"),
      answer: z.number().int().describe("Index of the correct option: 0 = a, 1 = b, 2 = c, 3 = d"),
      answerInDeck: z.boolean().describe("true only if the deck itself marks or states this answer; false if you worked it out"),
      explanation: Bi.describe("1 to 3 exam-oriented sentences on why the answer is right"),
      visual: VisualSchema,
      note: z.string().describe("A problem with this question in the deck (wrong or duplicate option, typo, no single correct answer), in English; empty if none"),
    }),
  ),
  issues: z.array(z.string()).describe("Problems with the deck as a whole (unreadable pages, missing options), in English; empty if none"),
});
export type DeckQuizOutput = z.infer<typeof DeckQuizOutputSchema>;

export const DeckQuizQuestionSchema = z.object({
  q: Bi,
  options: z.array(Bi).length(4),
  answer: z.number().int().min(0).max(3),
  /** False when Claude inferred the answer: the teacher must confirm it before sharing. */
  answerInDeck: z.boolean(),
  explanation: Bi,
  visual: VisualSchema,
  note: z.string(),
});
export type DeckQuizQuestion = z.infer<typeof DeckQuizQuestionSchema>;

/** The job's result and what the review screen edits. */
export const DeckQuizSchema = z.object({
  title: Bi,
  questions: z.array(DeckQuizQuestionSchema).min(1).max(DECK_QUIZ_MAX_QUESTIONS),
  issues: z.array(z.string()),
});
export type DeckQuiz = z.infer<typeof DeckQuizSchema>;

const clean = (s: string) => s.trim().slice(0, 2000);
const cleanBi = (b: BiText): BiText => ({ hi: clean(b.hi), en: clean(b.en) });

/**
 * Keeps only usable questions (four options, an answer among them) and lists every
 * dropped one in `issues`, so nothing disappears silently. Returns null if none is left.
 */
export function normalizeDeckQuiz(out: DeckQuizOutput): DeckQuiz | null {
  const issues = out.issues.map(clean).filter(Boolean);
  const questions: DeckQuizQuestion[] = [];
  out.questions.forEach((q, i) => {
    const n = i + 1;
    if (q.options.length !== 4) return issues.push(`Question ${n} was left out: it has ${q.options.length} options, not 4.`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return issues.push(`Question ${n} was left out: no valid answer.`);
    if (!q.q.hi.trim() && !q.q.en.trim()) return issues.push(`Question ${n} was left out: the question text is empty.`);
    if (questions.length >= DECK_QUIZ_MAX_QUESTIONS) return issues.push(`Question ${n} was left out: a quiz holds at most ${DECK_QUIZ_MAX_QUESTIONS} questions.`);
    const points = q.visual.points.slice(0, 5).map((p) => ({ hi: clean(p.hi), en: clean(p.en), key: p.key }));
    questions.push({
      q: cleanBi(q.q),
      options: q.options.map(cleanBi),
      answer: q.answer,
      answerInDeck: q.answerInDeck,
      explanation: cleanBi(q.explanation),
      visual: { title: cleanBi(q.visual.title), points },
      note: clean(q.note),
    });
  });
  return questions.length ? { title: cleanBi(out.title), questions, issues } : null;
}

// ---------- the HTML file ----------

/** HTML-escapes with numeric entities, which are also valid inside the SVG watermark. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const escBi = (b: BiText): BiText => ({ hi: esc(b.hi || b.en), en: esc(b.en || b.hi) });
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
/** JSON that can sit inside a <script> block. */
const scriptJson = (v: unknown) =>
  JSON.stringify(v).replace(/</g, "\\u003c").split(LS).join("\\u2028").split(PS).join("\\u2029");

/** logo: the institute's uploaded logo as an image data URL (DN-071); anything else shows initials. */
export type DeckQuizBrand = { instituteName: string; exam: string; subject: string; logo?: string | undefined };

/** Only an embedded PNG/JPEG/WebP is accepted, so the quiz never loads anything from outside. */
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** One self-contained HTML quiz carrying only this institute's name (DN-052). */
export function buildDeckQuizHtml(quiz: DeckQuiz, brand: DeckQuizBrand): string {
  const name = brand.instituteName.trim() || "—";
  const subline = `${brand.exam.trim()} · ${brand.subject.trim()}`;
  const cfg = {
    brand: esc(name),
    title: escBi(quiz.title),
    sub: { hi: esc(subline), en: esc(subline) },
    initials: esc(initialsOf(name)),
    logo: brand.logo && LOGO_DATA_URL.test(brand.logo) ? brand.logo : "",
  };
  const q = quiz.questions.map((x) => ({
    q: escBi(x.q),
    o: x.options.map(escBi),
    a: x.answer,
    ex: escBi(x.explanation),
    sc: { t: "concept", p: { title: escBi(x.visual.title), points: x.visual.points.map((p) => ({ ...escBi(p), key: p.key })) } },
  }));
  const text: Record<string, string> = {
    "{{TITLE}}": esc(`${quiz.title.hi || quiz.title.en} — ${name}`),
    "{{BRAND}}": esc(name),
    "{{SUBLINE}}": esc(subline),
    "/*{{CFG}}*/null": scriptJson(cfg),
    "/*{{Q}}*/[]": scriptJson(q),
  };
  // A function replacement, so "$&" or "$1" in a title stays text.
  return DECK_QUIZ_TEMPLATE.replace(/\{\{TITLE\}\}|\{\{BRAND\}\}|\{\{SUBLINE\}\}|\/\*\{\{CFG\}\}\*\/null|\/\*\{\{Q\}\}\*\/\[\]/g, (m) => text[m]!);
}

/** A download name like "biology-taxonomy-quiz.html" (ASCII only; falls back to "quiz.html"). */
export function deckQuizFileName(quiz: DeckQuiz): string {
  const slug = quiz.title.en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug ? `${slug}-` : ""}quiz.html`;
}

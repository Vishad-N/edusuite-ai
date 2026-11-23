import { BookChapterInputSchema, BookChapterOutputSchema, type BookChapterInput, type BookChapterOutput } from "@edusuite/shared";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/** book_chapter (plan §08, DN-060): theory, exam points and practice MCQs for one study-book chapter. */
const LANGUAGE_RULE: Record<BookChapterInput["language"], string> = {
  hi: "Write in clear Hindi (Devanagari). Keep standard technical terms, formulas and names as they are taught.",
  en: "Write in clear English.",
  both: "Write in Hindi (Devanagari) with key technical terms also in English in brackets.",
};

/** Drops empty paragraphs and MCQs without four options. */
export function fitBookChapter(out: BookChapterOutput): BookChapterOutput {
  const clean = (xs: string[], max: number) => xs.map((x) => x.trim()).filter(Boolean).slice(0, max);
  const theory = clean(out.theory, 200);
  if (!theory.length) throw new AiJobError("AI_BAD_OUTPUT", false, "no theory");
  return {
    subtitle: out.subtitle.trim().slice(0, 200),
    theory,
    highlights: clean(out.highlights, 100),
    practiceQuestions: out.practiceQuestions
      .map((p) => ({ q: p.q.trim(), options: p.options.map((o) => o.trim()), answer: p.answer.trim() }))
      .filter((p) => p.q && p.options.length === 4 && p.options.every(Boolean)),
  };
}

export const bookChapter: JobDefinition<BookChapterInput, BookChapterOutput> = {
  type: "book_chapter",
  input: BookChapterInputSchema,
  output: BookChapterOutputSchema,
  effort: "medium",
  maxTokens: 32000,
  system: [
    "You write study-book chapters for students of an Indian coaching institute (MPPSC, SSC, Vyapam, TET, school boards).",
    "Theory: 4 to 10 paragraphs in teaching order, from basics to exam-level detail, each 3 to 6 sentences, with examples. Exam points: one-line facts that are commonly asked.",
    "Practice MCQs: exactly four plausible options, exactly one correct, no 'all/none of the above'.",
    "Be accurate to the syllabus the exam follows. Never invent statistics, dates, names or data you are not sure of. The teacher reviews the chapter before printing.",
  ].join("\n"),
  user: (input) => [
    {
      type: "text",
      text: [
        `Chapter: ${input.chapterTitle}`,
        input.bookTitle ? `Book: ${input.bookTitle}` : "",
        input.subject ? `Subject: ${input.subject}` : "",
        input.targetExam ? `Exam: ${input.targetExam}` : "",
        `Practice MCQs: ${input.questionCount}`,
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  finish: fitBookChapter,
  steps: () => 1,
  fixture: (input) => ({
    subtitle: "नमूना उपशीर्षक",
    theory: [`नमूना अनुच्छेद 1: ${input.chapterTitle} (AI का नहीं)।`, "नमूना अनुच्छेद 2।"],
    highlights: ["नमूना परीक्षा बिंदु 1", "नमूना परीक्षा बिंदु 2"],
    practiceQuestions: Array.from({ length: input.questionCount }, (_, i) => ({
      q: `नमूना अभ्यास प्रश्न ${i + 1}`,
      options: ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"],
      answer: "(a) विकल्प 1",
    })),
  }),
};

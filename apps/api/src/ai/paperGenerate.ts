import {
  PAPER_MARKS,
  PaperGenerateInputSchema,
  PaperGenerateOutputSchema,
  type PaperGenerateInput,
  type PaperGenerateOutput,
} from "@edusuite/shared";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/**
 * paper_generate (plan §08, DN-056): a sectioned test paper with an answer key for
 * QuestionPaperMaker. The teacher reviews and edits it before saving or printing.
 */
const LANGUAGE_RULE: Record<PaperGenerateInput["language"], string> = {
  hi: "Write every question, option and answer in clear Hindi (Devanagari). Keep standard technical terms, formulas and units as they are taught.",
  en: "Write every question, option and answer in clear English.",
  both: "Write each question in Hindi (Devanagari) followed by its English version on the next line. Options and answers in Hindi with the English term in brackets where useful.",
};

const DIFFICULTY_RULE: Record<PaperGenerateInput["difficulty"], string> = {
  easy: "Keep questions easy: direct recall and simple application.",
  medium: "Keep questions at a medium level: mostly application, some recall.",
  hard: "Make questions hard: multi-step application and analysis, at the level of the toughest past papers.",
  mixed: "Mix difficulty: about 30% easy, 50% medium, 20% hard, easier questions first within each section.",
};

const KIND_ORDER = ["mcq", "short", "long"] as const;

/** Keeps the requested sections in order, drops broken MCQs and empty questions. */
export function normalizePaper(out: PaperGenerateOutput): PaperGenerateOutput {
  const sections = KIND_ORDER.flatMap((kind) => {
    const questions = out.sections
      .filter((s) => s.kind === kind)
      .flatMap((s) => s.questions)
      .map((q) => ({ q: q.q.trim(), options: kind === "mcq" ? q.options.map((o) => o.trim()) : [], answer: q.answer.trim() }))
      .filter((q) => q.q && (kind !== "mcq" || (q.options.length === 4 && q.options.every(Boolean))));
    return questions.length ? [{ kind, questions }] : [];
  });
  if (!sections.length) throw new AiJobError("AI_BAD_OUTPUT", false, "no usable questions");
  return { title: out.title.trim(), sections };
}

export const paperGenerate: JobDefinition<PaperGenerateInput, PaperGenerateOutput> = {
  type: "paper_generate",
  input: PaperGenerateInputSchema,
  output: PaperGenerateOutputSchema,
  effort: "medium",
  maxTokens: 32000,
  system: [
    "You write test papers with answer keys for teachers at Indian coaching institutes and schools (competitive exams such as MPPSC, SSC, Vyapam, TET, and school boards).",
    "Rules:",
    "1. Cover the given topics only, spread across them, in the order a teacher would test them. Never repeat a question or test the same fact twice.",
    "2. Each MCQ has exactly four options without letters, exactly one correct, with plausible distractors drawn from common student mistakes. Avoid 'all of the above' and 'none of the above'.",
    "3. Short-answer questions need a 2–4 sentence answer; long-answer questions need a worked solution or a structured model answer.",
    "4. Answers are for the teacher's key: correct, concise and exam-oriented. For an MCQ, start with the letter of the correct option.",
    "5. Be factually accurate. Never invent statistics, dates, names or data you are not sure of; prefer questions you can answer with certainty.",
    "6. Return exactly the requested number of questions of each kind, one section per kind, and no section for a kind with zero questions.",
    "The teacher will review and edit the paper before using it.",
  ].join("\n"),
  user: (input) => [
    {
      type: "text",
      text: [
        `Subject: ${input.subject}`,
        input.grade ? `Class / exam: ${input.grade}` : "",
        `Topics to cover: ${input.topics}`,
        `MCQs (${PAPER_MARKS.mcq} mark each): ${input.mcqCount}`,
        `Short-answer questions (${PAPER_MARKS.short} marks each): ${input.shortCount}`,
        `Long-answer questions (${PAPER_MARKS.long} marks each): ${input.longCount}`,
        DIFFICULTY_RULE[input.difficulty],
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  finish: normalizePaper,
  steps: () => 1,
  fixture: (input) => {
    const make = (kind: (typeof KIND_ORDER)[number], count: number) =>
      Array.from({ length: count }, (_, i) => ({
        q: `नमूना ${kind === "mcq" ? "बहुविकल्पीय" : kind === "short" ? "लघु उत्तरीय" : "दीर्घ उत्तरीय"} प्रश्न ${i + 1}: ${input.topics}`,
        options: kind === "mcq" ? ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"] : [],
        answer: kind === "mcq" ? "A) नमूना उत्तर" : "नमूना उत्तर (AI का नहीं)।",
      }));
    return {
      title: `${input.subject} · नमूना पेपर`,
      sections: [
        { kind: "mcq" as const, questions: make("mcq", input.mcqCount) },
        { kind: "short" as const, questions: make("short", input.shortCount) },
        { kind: "long" as const, questions: make("long", input.longCount) },
      ].filter((s) => s.questions.length > 0),
    };
  },
};

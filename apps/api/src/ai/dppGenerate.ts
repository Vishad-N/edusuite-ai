import {
  DppGenerateInputSchema,
  DppGenerateOutputSchema,
  type DppGenerateInput,
  type DppGenerateOutput,
  type DppGenerateResult,
} from "@edusuite/shared";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/**
 * dpp_generate (plan §08, DN-058): a daily practice sheet on one topic. The printed
 * sheet shows the questions (MCQ options on their own lines); the answer and hint
 * stay in the teacher-only hint field, which isn't printed.
 */
const LANGUAGE_RULE: Record<DppGenerateInput["language"], string> = {
  hi: "Write everything in clear Hindi (Devanagari). Keep standard technical terms, formulas and units as they are taught.",
  en: "Write everything in clear English.",
  both: "Write each question in Hindi (Devanagari) followed by its English version in brackets; options in Hindi.",
};
const STYLE_RULE: Record<DppGenerateInput["style"], string> = {
  mcq: "Every question is an MCQ with four options.",
  short: "Every question is a short-answer or numerical question (no options).",
  mixed: "About two thirds MCQs with four options, the rest short-answer or numerical.",
};
const DIFFICULTY_RULE: Record<DppGenerateInput["difficulty"], string> = {
  easy: "Keep them easy: direct application of one idea.",
  medium: "Medium level: one or two steps.",
  hard: "Hard: multi-step, at the level of the toughest past papers.",
  mixed: "Start easy and get harder towards the end.",
};

const LETTERS = ["a", "b", "c", "d"];

/** Builds the editor's shape; drops empty questions and MCQs without four options. */
export function toDppSheet(out: DppGenerateOutput): DppGenerateResult {
  const questions = out.questions.flatMap((x) => {
    const q = x.q.trim();
    const options = x.options.map((o) => o.trim()).filter(Boolean);
    if (!q || (x.options.length > 0 && options.length !== 4)) return [];
    const text = options.length ? `${q}\n${options.map((o, i) => `(${LETTERS[i]}) ${o}`).join("\n")}` : q;
    const hint = [x.answer.trim() && `उत्तर: ${x.answer.trim()}`, x.hint.trim()].filter(Boolean).join(" · ");
    return [{ q: text, hint }];
  });
  if (!questions.length) throw new AiJobError("AI_BAD_OUTPUT", false, "no usable questions");
  return { questions };
}

export const dppGenerate: JobDefinition<DppGenerateInput, DppGenerateOutput> = {
  type: "dpp_generate",
  input: DppGenerateInputSchema,
  output: DppGenerateOutputSchema,
  effort: "medium",
  maxTokens: 24000,
  system: [
    "You write daily practice problem sheets (DPPs) for students at Indian coaching institutes (MPPSC, SSC, Vyapam, TET and school boards).",
    "A DPP drills one topic: every question practises that topic, from different angles, with no two questions testing the same fact or the same calculation pattern.",
    "MCQ options are plausible (common student mistakes), exactly one correct, no 'all/none of the above'. Numerical answers must be worked out and correct.",
    "The answer and a one-line hint are for the teacher's key only.",
    "Be factually accurate; never invent data you are not sure of. The teacher reviews the sheet before printing.",
  ].join("\n"),
  user: (input) => [
    {
      type: "text",
      text: [
        `Subject: ${input.subject}`,
        `Topic: ${input.topic}`,
        input.targetBatch ? `Batch / exam: ${input.targetBatch}` : "",
        `Number of questions: ${input.count}`,
        STYLE_RULE[input.style],
        DIFFICULTY_RULE[input.difficulty],
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  finish: toDppSheet,
  steps: () => 1,
  fixture: (input) => ({
    questions: Array.from({ length: input.count }, (_, i) => {
      const mcq = input.style === "mcq" || (input.style === "mixed" && i % 3 !== 2);
      return {
        q: `नमूना प्रश्न ${i + 1}: ${input.topic}`,
        options: mcq ? ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"] : [],
        answer: mcq ? "(a) विकल्प 1" : "नमूना उत्तर",
        hint: "नमूना संकेत (AI का नहीं)",
      };
    }),
  }),
};

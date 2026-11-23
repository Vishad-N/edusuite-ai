import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { deckQuiz } from "./deckQuiz";
import { paperGenerate } from "./paperGenerate";
import { mcqExtract } from "./mcqExtract";
import { dppGenerate } from "./dppGenerate";
import { lessonPlan } from "./lessonPlan";
import { PptOutlineInputSchema, PptOutlineOutputSchema, type AiJobType, type PptOutlineInput, type PptOutlineOutput } from "@edusuite/shared";

/** What a job's prompt may use besides its input: the signed-in institute (DN-052) and its files. */
export type JobContext = {
  instituteId: string;
  instituteName: string;
  /** An uploaded, verified file of this institute with one of these types (DN-040); throws AI_INPUT_FILE_INVALID otherwise. */
  readFile: (fileId: string, mimes: readonly string[]) => Promise<{ bytes: Uint8Array; mime: string }>;
};

/** Checks done before credits are taken (the user is told at once, not after a failed job). */
export type JobPrecheck = { instituteId: string; findFile: (fileId: string) => Promise<{ mime: string; bytes: number; uploaded: boolean } | null> };

/**
 * One AI job type (plan §08): its input and output schemas, the prompt, how hard
 * Claude should think, and a predictable answer for fixture mode (DN-012).
 */
export type JobDefinition<I = unknown, O = unknown> = {
  type: AiJobType;
  input: z.ZodType<I>;
  output: z.ZodType<O>;
  /** Claude's effort for this job (output_config.effort). */
  effort: "low" | "medium" | "high";
  maxTokens: number;
  /** Stable across requests, so it is prompt-cached. Nothing per-request goes here. */
  system: string;
  user: (input: I, ctx: JobContext) => Anthropic.Messages.ContentBlockParam[] | Promise<Anthropic.Messages.ContentBlockParam[]>;
  /** Optional check of the input before the job is charged and queued; throws an ApiHttpException. */
  precheck?: (input: I, ctx: JobPrecheck) => Promise<void>;
  /** Optional last step on the validated output (e.g. dropping unusable items); returns the stored result. */
  finish?: (output: O, input: I) => unknown;
  /** How many progress steps the job reports. */
  steps: (input: I) => number;
  /** Fixture mode: a deterministic answer built from the input (used when no recording exists). */
  fixture: (input: I, ctx: JobContext) => O;
};

const LANGUAGE_RULE: Record<PptOutlineInput["language"], string> = {
  hi: "Write everything in clear, simple Hindi (Devanagari). Keep standard technical terms and formulas as they are commonly taught (English terms may follow in brackets).",
  en: "Write everything in clear, simple English.",
  both: "Write each title and point in Hindi (Devanagari) followed by its English version in brackets.",
};

export const pptOutline: JobDefinition<PptOutlineInput, PptOutlineOutput> = {
  type: "ppt_outline",
  input: PptOutlineInputSchema,
  output: PptOutlineOutputSchema,
  effort: "medium",
  maxTokens: 16000,
  system: [
    "You write lecture slide decks for teachers at Indian coaching institutes and schools (competitive exams such as MPPSC, SSC, Vyapam, and school boards).",
    "A deck is projected on a classroom smartboard and the teacher speaks over it, so each slide holds a short title and 3 to 5 crisp points, not paragraphs.",
    "Structure: start with an introduction slide, cover the topic in a logical teaching order, include at least one slide of examples or exam-style questions, and end with a summary slide.",
    "Each slide's tag is a 1 to 3 word section label. The takeaway is one exam tip or memory aid when there is a useful one; otherwise leave it empty.",
    "Be factually accurate. If the topic is ambiguous, choose the meaning a teacher of the given class and subject would most likely intend. Never invent statistics, dates or names you are not sure of.",
    "The teacher will review and edit the deck before using it.",
  ].join("\n"),
  user: (input) => [
    {
      type: "text",
      text: [
        `Topic: ${input.topic}`,
        input.grade ? `Class / batch: ${input.grade}` : "",
        input.subject ? `Subject: ${input.subject}` : "",
        `Number of slides: ${input.slideCount}`,
        LANGUAGE_RULE[input.language],
        "The subtitle names the class and subject briefly.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  steps: () => 1,
  fixture: (input) => {
    const subtitle = [input.grade, input.subject].filter(Boolean).join(" · ");
    const slides = [
      { tag: "परिचय", title: input.topic, points: ["विषय का परिचय", "मुख्य परिभाषाएँ", "परीक्षा में महत्व"], takeaway: "" },
      { tag: "मुख्य अवधारणा", title: "मुख्य बिंदु", points: ["बिंदु 1", "बिंदु 2", "बिंदु 3"], takeaway: "" },
      { tag: "उदाहरण", title: "उदाहरण और प्रश्न", points: ["उदाहरण 1", "परीक्षा जैसा प्रश्न"], takeaway: "" },
      { tag: "सारांश", title: "सारांश", points: ["याद रखने योग्य बातें"], takeaway: "" },
    ];
    while (slides.length < input.slideCount) {
      const n = slides.length - 2;
      slides.splice(slides.length - 1, 0, { tag: "विस्तार", title: `उप-विषय ${n}`, points: ["बिंदु 1", "बिंदु 2", "बिंदु 3"], takeaway: "" });
    }
    return { title: input.topic, subtitle, slides: slides.slice(0, input.slideCount) };
  },
};

/** Every job type the worker can run (shared IMPLEMENTED_AI_JOBS must match; a test checks it). */
export const JOB_DEFINITIONS: Partial<Record<AiJobType, JobDefinition<never, unknown>>> = {
  ppt_outline: pptOutline as unknown as JobDefinition<never, unknown>,
  paper_generate: paperGenerate as unknown as JobDefinition<never, unknown>,
  mcq_extract: mcqExtract as unknown as JobDefinition<never, unknown>,
  dpp_generate: dppGenerate as unknown as JobDefinition<never, unknown>,
  lesson_plan: lessonPlan as unknown as JobDefinition<never, unknown>,
  deck_quiz: deckQuiz as unknown as JobDefinition<never, unknown>,
};

import { z } from "zod";
import type { AiJobType } from "./permissions.ts";
import { DeckQuizInputSchema } from "./deckQuiz.ts";

/**
 * AI jobs (plan §08, Phase 4; DN-054). The desktop app starts a job, the API
 * takes its credits (DN-053) and queues it, a worker runs it against Claude
 * (or a fixture), and the screen follows its progress over SSE.
 */

export const AI_JOB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];
export const TERMINAL_JOB_STATUSES: readonly AiJobStatus[] = ["succeeded", "failed", "cancelled"];

export const AI_LANGUAGES = ["hi", "en", "both"] as const;

// ---------- Job types: input and output schemas ----------

/** ppt_outline: an editable lecture deck from a topic (PptMaker). */
export const PptOutlineInputSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  grade: z.string().trim().max(100).optional(),
  subject: z.string().trim().max(100).optional(),
  slideCount: z.number().int().min(3).max(15).default(6),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type PptOutlineInput = z.infer<typeof PptOutlineInputSchema>;

/** The shape Claude must return (structured outputs); it fills PptMaker's editor. */
export const PptOutlineOutputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  slides: z.array(
    z.object({
      tag: z.string().describe("A 1–3 word section label, e.g. परिचय"),
      title: z.string(),
      points: z.array(z.string()).describe("3 to 5 short teaching points"),
      takeaway: z.string().describe("One exam tip or memory aid; empty if none"),
    }),
  ),
});
export type PptOutlineOutput = z.infer<typeof PptOutlineOutputSchema>;

/** paper_generate: a sectioned test paper with an answer key (QuestionPaperMaker, DN-056). */
export const PAPER_DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
/** Marks per question in each section; the teacher can rename sections and change marks after. */
export const PAPER_MARKS = { mcq: 1, short: 3, long: 5 } as const;
export const PAPER_MAX_QUESTIONS = 60;

export const PaperGenerateInputSchema = z
  .object({
    subject: z.string().trim().min(2).max(100),
    grade: z.string().trim().max(100).optional(),
    /** Chapters or topics the paper must cover. */
    topics: z.string().trim().min(2).max(1000),
    mcqCount: z.number().int().min(0).max(50).default(10),
    shortCount: z.number().int().min(0).max(30).default(5),
    longCount: z.number().int().min(0).max(10).default(2),
    difficulty: z.enum(PAPER_DIFFICULTIES).default("mixed"),
    language: z.enum(AI_LANGUAGES).default("hi"),
  })
  .refine((p) => p.mcqCount + p.shortCount + p.longCount >= 1, { message: "at least one question", path: ["mcqCount"] })
  .refine((p) => p.mcqCount + p.shortCount + p.longCount <= PAPER_MAX_QUESTIONS, { message: `at most ${PAPER_MAX_QUESTIONS} questions`, path: ["mcqCount"] });
export type PaperGenerateInput = z.infer<typeof PaperGenerateInputSchema>;

export const PaperGenerateOutputSchema = z.object({
  title: z.string().describe("A short paper title, e.g. the subject and the topics"),
  sections: z.array(
    z.object({
      kind: z.enum(["mcq", "short", "long"]),
      questions: z.array(
        z.object({
          q: z.string(),
          options: z.array(z.string()).describe("Exactly four option texts for mcq, without letters; empty for short and long"),
          answer: z
            .string()
            .describe("mcq: the correct letter and a one-line reason, e.g. 'B) because …'; short: a model answer in 2–4 sentences; long: a step-by-step solution or model answer"),
        }),
      ),
    }),
  ),
});
export type PaperGenerateOutput = z.infer<typeof PaperGenerateOutputSchema>;

/** mcq_extract: read MCQs from uploaded screenshots (ScreenshotToPpt, DN-057). Priced per screenshot. */
export const MCQ_EXTRACT_MAX_IMAGES = 20;
export const MCQ_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
/** Claude's per-image limit over the API. */
export const MCQ_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const LETTER = z.enum(["A", "B", "C", "D"]);
const OPTIONS4 = z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() });

export const McqExtractInputSchema = z.object({
  fileIds: z
    .array(z.uuid())
    .min(1)
    .max(MCQ_EXTRACT_MAX_IMAGES)
    .refine((ids) => new Set(ids).size === ids.length, "duplicate screenshot"),
  subject: z.string().trim().max(160).optional(),
});
export type McqExtractInput = z.infer<typeof McqExtractInputSchema>;

const McqReadFields = {
  found: z.boolean().describe("false if the screenshot holds no readable multiple-choice question"),
  question: z.string().describe("The question text exactly as shown, in its own language; empty if not found"),
  options: OPTIONS4.describe("The four options exactly as shown, without their letters or numbers"),
  correct: LETTER.describe("The correct option"),
  answerFromImage: z.boolean().describe("true only if the screenshot itself marks or states the answer; false if you worked it out"),
  trick: z.string().describe("One short exam tip or reason for the answer, in the question's language; empty if none"),
  note: z.string().describe("A problem: unreadable text, missing options, more than one question, a doubtful answer; in English; empty if none"),
};

export const McqExtractOutputSchema = z.object({
  items: z.array(z.object({ screenshot: z.number().int().describe("The screenshot's number, starting at 1"), ...McqReadFields })),
});
export type McqExtractOutput = z.infer<typeof McqExtractOutputSchema>;

/** The stored result: one entry per screenshot, in input order. */
export const McqExtractResultSchema = z.object({
  items: z.array(z.object({ fileId: z.uuid(), ...McqReadFields })),
});
export type McqExtractResult = z.infer<typeof McqExtractResultSchema>;

/** dpp_generate: a daily practice sheet for NotebookDppMaker (DN-058). */
export const DPP_STYLES = ["mcq", "short", "mixed"] as const;

export const DppGenerateInputSchema = z.object({
  subject: z.string().trim().min(2).max(100),
  topic: z.string().trim().min(2).max(200),
  targetBatch: z.string().trim().max(160).optional(),
  count: z.number().int().min(3).max(50).default(10),
  style: z.enum(DPP_STYLES).default("mcq"),
  difficulty: z.enum(PAPER_DIFFICULTIES).default("mixed"),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type DppGenerateInput = z.infer<typeof DppGenerateInputSchema>;

export const DppGenerateOutputSchema = z.object({
  questions: z.array(
    z.object({
      q: z.string(),
      options: z.array(z.string()).describe("Four option texts without letters for an MCQ; empty for a short-answer question"),
      answer: z.string().describe("MCQ: the correct letter (a, b, c or d) and the option; short: the final answer in a few words"),
      hint: z.string().describe("One line: the method, formula or shortcut that solves it"),
    }),
  ),
});
export type DppGenerateOutput = z.infer<typeof DppGenerateOutputSchema>;

/** The stored result, in the DPP editor's shape: printed question text, and the teacher-only hint with the answer. */
export const DppGenerateResultSchema = z.object({ questions: z.array(z.object({ q: z.string(), hint: z.string() })).min(1) });
export type DppGenerateResult = z.infer<typeof DppGenerateResultSchema>;

/** lesson_plan: learning objectives and a day-by-day plan for LessonPlanner (DN-059). */
export const LessonPlanInputSchema = z.object({
  chapter: z.string().trim().min(2).max(200),
  subject: z.string().trim().min(2).max(160),
  grade: z.string().trim().max(100).optional(),
  days: z.number().int().min(1).max(30),
  /** Anything the teacher wants stressed: exam focus, lab work, weak areas. */
  focus: z.string().trim().max(500).optional(),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type LessonPlanInput = z.infer<typeof LessonPlanInputSchema>;

export const LessonPlanOutputSchema = z.object({
  objectives: z.array(z.string()).describe("3 to 6 measurable learning objectives, each one sentence"),
  days: z.array(
    z.object({
      topic: z.string().describe("What this day covers, a short phrase"),
      activities: z.string().describe("How the class runs: explanation, examples, board work, a quick check; 2 to 4 short sentences"),
      homework: z.string().describe("Specific homework for the day; empty only on a test or revision day"),
    }),
  ),
});
export type LessonPlanOutput = z.infer<typeof LessonPlanOutputSchema>;

/** Job types the worker can run today; the others arrive one at a time (plan §08 order). */
export const AiJobCreateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ppt_outline"), input: PptOutlineInputSchema }),
  z.object({ type: z.literal("paper_generate"), input: PaperGenerateInputSchema }),
  z.object({ type: z.literal("mcq_extract"), input: McqExtractInputSchema }),
  z.object({ type: z.literal("dpp_generate"), input: DppGenerateInputSchema }),
  z.object({ type: z.literal("lesson_plan"), input: LessonPlanInputSchema }),
  z.object({ type: z.literal("deck_quiz"), input: DeckQuizInputSchema }),
]);
export type AiJobCreate = z.infer<typeof AiJobCreateSchema>;
export const IMPLEMENTED_AI_JOBS = AiJobCreateSchema.options.map((o) => o.shape.type.value) as AiJobType[];

/** How many items a per-item price counts (DN-053); 1 for every job priced per run. */
export function jobItemCount(job: AiJobCreate): number {
  switch (job.type) {
    case "ppt_outline":
    case "paper_generate":
    case "deck_quiz":
    case "dpp_generate":
    case "lesson_plan":
      return 1;
    case "mcq_extract":
      return job.input.fileIds.length;
  }
}

// ---------- What the API returns ----------

export const AiJobSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  status: z.enum(AI_JOB_STATUSES),
  progress: z.object({ done: z.number().int().min(0), total: z.number().int().min(0) }),
  /** Set when the job failed: a code from the API's error list and its message. */
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  /** The job's output (its type's output schema) once it succeeded. */
  result: z.unknown().nullable(),
  /** True when the output came from fixture mode, not Claude (DN-012). */
  fixture: z.boolean(),
  creditsCharged: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
});
export type AiJob = z.infer<typeof AiJobSchema>;

/** Header the desktop app sends so a double click or a network retry never pays twice. */
export const IDEMPOTENCY_HEADER = "idempotency-key";
export const IdempotencyKeySchema = z.string().trim().min(8).max(100);

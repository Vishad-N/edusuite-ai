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

/** doubt_solve: a student's doubt, typed or as a photo, solved step by step (DoubtSolver, DN-060). */
export const DOUBT_IMAGE_MIMES = MCQ_IMAGE_MIMES;
export const DoubtSolveInputSchema = z
  .object({
    question: z.string().trim().max(4000).default(""),
    subject: z.string().trim().max(160).optional(),
    /** An uploaded photo of the question (PNG, JPEG or WebP up to 5 MB). */
    imageFileId: z.uuid().optional(),
    language: z.enum(AI_LANGUAGES).default("hi"),
  })
  .refine((d) => d.question.length >= 2 || d.imageFileId, { message: "type the question or add a photo", path: ["question"] });
export type DoubtSolveInput = z.infer<typeof DoubtSolveInputSchema>;

export const DoubtSolveOutputSchema = z.object({
  question: z.string().describe("The question as asked (transcribed from the photo if there is one)"),
  answer: z.string().describe("The final answer in one line"),
  steps: z.array(z.string()).describe("The solution, one short step per item"),
  shortcutTrick: z.string().describe("An exam shortcut if there is a genuine one; empty otherwise"),
  commonMistake: z.string().describe("The mistake students most often make here; empty if none"),
  similarQuestions: z.array(z.string()).describe("2 or 3 similar practice questions"),
});
export type DoubtSolveOutput = z.infer<typeof DoubtSolveOutputSchema>;

/** youtube_meta: video title, description and tags (YouTubeStudio, DN-060). */
export const YOUTUBE_TITLE_MAX = 100;
export const YoutubeMetaInputSchema = z.object({
  headline: z.string().trim().min(2).max(200),
  punchline: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(160).optional(),
  facultyName: z.string().trim().max(160).optional(),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type YoutubeMetaInput = z.infer<typeof YoutubeMetaInputSchema>;

export const YoutubeMetaOutputSchema = z.object({
  title: z.string().describe(`The video title, at most ${YOUTUBE_TITLE_MAX} characters`),
  description: z.string().describe("The video description: what the class covers, who it is for, 4 to 8 short lines"),
  tags: z.array(z.string()).describe("10 to 20 search tags, each a few words"),
});
export type YoutubeMetaOutput = z.infer<typeof YoutubeMetaOutputSchema>;

/** notice_draft: a notice as a WhatsApp message and a formal circular (NoticeHub, DN-060). */
export const NoticeDraftInputSchema = z.object({
  category: z.string().trim().max(100).optional(),
  /** What the notice must say: the facts, dates, amounts and who it is for. */
  details: z.string().trim().min(5).max(2000),
  date: z.string().trim().max(60).optional(),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type NoticeDraftInput = z.infer<typeof NoticeDraftInputSchema>;

export const NoticeDraftOutputSchema = z.object({
  title: z.string().describe("A short notice title"),
  whatsappText: z.string().describe("A friendly WhatsApp message to students or parents, with *bold* for key facts, under 120 words"),
  formalText: z.string().describe("The body of a formal printed circular, 2 to 4 short paragraphs, without letterhead, date or signature"),
});
export type NoticeDraftOutput = z.infer<typeof NoticeDraftOutputSchema>;

/** book_chapter: one study-book chapter (BookCreator, DN-060). Priced 2 (DN-053). */
export const BookChapterInputSchema = z.object({
  chapterTitle: z.string().trim().min(2).max(200),
  bookTitle: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(160).optional(),
  targetExam: z.string().trim().max(160).optional(),
  questionCount: z.number().int().min(0).max(20).default(5),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type BookChapterInput = z.infer<typeof BookChapterInputSchema>;

export const BookChapterOutputSchema = z.object({
  subtitle: z.string().describe("A one-line chapter subtitle"),
  theory: z.array(z.string()).describe("4 to 10 theory paragraphs in teaching order"),
  highlights: z.array(z.string()).describe("3 to 8 one-line exam points"),
  practiceQuestions: z.array(
    z.object({
      q: z.string(),
      options: z.array(z.string()).describe("Exactly four option texts without letters"),
      answer: z.string().describe("The correct letter and option, e.g. '(b) …'"),
    }),
  ),
});
export type BookChapterOutput = z.infer<typeof BookChapterOutputSchema>;

/** poster_copy: headline, subheading and tagline for a poster (ImageStudio, DN-060). */
export const PosterCopyInputSchema = z.object({
  category: z.string().trim().max(60),
  /** What the poster announces, with the real facts (course, dates, results, contact line). */
  brief: z.string().trim().min(5).max(800),
  language: z.enum(AI_LANGUAGES).default("hi"),
});
export type PosterCopyInput = z.infer<typeof PosterCopyInputSchema>;

export const PosterCopyOutputSchema = z.object({
  headline: z.string().describe("A punchy headline, at most 8 words"),
  subheading: z.string().describe("One supporting line, at most 15 words"),
  tagline: z.string().describe("A short call to action, at most 10 words"),
});
export type PosterCopyOutput = z.infer<typeof PosterCopyOutputSchema>;

/** Job types the worker can run today; the others arrive one at a time (plan §08 order). */
export const AiJobCreateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ppt_outline"), input: PptOutlineInputSchema }),
  z.object({ type: z.literal("paper_generate"), input: PaperGenerateInputSchema }),
  z.object({ type: z.literal("mcq_extract"), input: McqExtractInputSchema }),
  z.object({ type: z.literal("dpp_generate"), input: DppGenerateInputSchema }),
  z.object({ type: z.literal("lesson_plan"), input: LessonPlanInputSchema }),
  z.object({ type: z.literal("doubt_solve"), input: DoubtSolveInputSchema }),
  z.object({ type: z.literal("youtube_meta"), input: YoutubeMetaInputSchema }),
  z.object({ type: z.literal("notice_draft"), input: NoticeDraftInputSchema }),
  z.object({ type: z.literal("book_chapter"), input: BookChapterInputSchema }),
  z.object({ type: z.literal("poster_copy"), input: PosterCopyInputSchema }),
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
    case "doubt_solve":
    case "youtube_meta":
    case "notice_draft":
    case "book_chapter":
    case "poster_copy":
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

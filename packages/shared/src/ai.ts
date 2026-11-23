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

/** Job types the worker can run today; the others arrive one at a time (plan §08 order). */
export const AiJobCreateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ppt_outline"), input: PptOutlineInputSchema }),
  z.object({ type: z.literal("deck_quiz"), input: DeckQuizInputSchema }),
]);
export type AiJobCreate = z.infer<typeof AiJobCreateSchema>;
export const IMPLEMENTED_AI_JOBS = AiJobCreateSchema.options.map((o) => o.shape.type.value) as AiJobType[];

/** How many items a per-item price counts (DN-053); 1 for every job priced per run. */
export function jobItemCount(job: AiJobCreate): number {
  switch (job.type) {
    case "ppt_outline":
    case "deck_quiz":
      return 1;
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

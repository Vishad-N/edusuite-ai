import { z } from "zod";
import { PageQuerySchema } from "./pagination.ts";

/**
 * The institute's question bank (plan §06 `question`; DN-074). Four-option MCQs that
 * teachers collect from AI papers and screenshot sets and reuse in new papers.
 * Shared across the institute: questions are teaching material, not branch data.
 */

export const QUESTION_LETTERS = ["A", "B", "C", "D"] as const;
export type QuestionLetter = (typeof QUESTION_LETTERS)[number];

/** Same text with spaces tidied, so near-identical copies are spotted as duplicates. */
export function normalizeQuestionText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const body = (max: number) => z.string().transform(normalizeQuestionText).pipe(z.string().min(1).max(max));
const optionalBody = (max: number) =>
  z
    .string()
    .transform(normalizeQuestionText)
    .pipe(z.string().max(max))
    .optional()
    .transform((v) => (v ? v : undefined));

export const QuestionInputSchema = z.object({
  subject: body(100),
  topic: optionalBody(150),
  bodyHi: body(4000),
  bodyEn: optionalBody(4000),
  options: z.object({ A: body(1000), B: body(1000), C: body(1000), D: body(1000) }),
  answer: z.enum(QUESTION_LETTERS),
  trick: optionalBody(2000),
});
export type QuestionInput = z.input<typeof QuestionInputSchema>;

/** POST /questions/bulk: up to 200 at a time; exact repeats in the same subject are skipped. */
export const QuestionBulkCreateSchema = z.object({ questions: z.array(QuestionInputSchema).min(1).max(200) });
export type QuestionBulkCreate = z.input<typeof QuestionBulkCreateSchema>;
export type QuestionBulkResult = { added: number; skipped: number };

export const QuestionListQuerySchema = PageQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(100).optional(),
  topic: z.string().trim().max(150).optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type QuestionListQuery = z.infer<typeof QuestionListQuerySchema>;

export type BankQuestion = {
  id: string;
  subject: string;
  topic: string | null;
  bodyHi: string;
  bodyEn: string | null;
  options: Record<QuestionLetter, string>;
  answer: QuestionLetter;
  trick: string | null;
  createdAt: string;
  createdBy: { id: string; displayName: string };
};

/** Distinct subjects in the bank, with counts, for the filter. */
export type QuestionSubjects = Array<{ subject: string; count: number }>;

/**
 * A paper MCQ ({ q, options: ["A) …", …], ans: "B) …" or "B" }) as a bank question, or null
 * when it isn't a clean four-option MCQ with a recognisable answer letter.
 */
export function paperMcqToBank(q: { q: string; options?: string[] | undefined; ans?: string | undefined }, subject: string, topic?: string): QuestionInput | null {
  const opts = (q.options ?? []).map((o) => o.replace(/^\s*\(?[A-Da-d][).:-]\s*/, "").trim());
  if (opts.length !== 4 || opts.some((o) => !o) || !normalizeQuestionText(q.q)) return null;
  const letter = /^\s*\(?([A-Da-d])\b/.exec(q.ans ?? "")?.[1]?.toUpperCase() as QuestionLetter | undefined;
  if (!letter || !subject.trim()) return null;
  return {
    subject,
    ...(topic?.trim() && { topic }),
    bodyHi: q.q,
    options: { A: opts[0]!, B: opts[1]!, C: opts[2]!, D: opts[3]! },
    answer: letter,
  };
}

/** A bank question in the paper editor's shape. */
export function bankToPaperMcq(b: Pick<BankQuestion, "bodyHi" | "options" | "answer">): { q: string; options: string[]; ans: string } {
  return {
    q: b.bodyHi,
    options: QUESTION_LETTERS.map((l) => `${l}) ${b.options[l]}`),
    ans: `${b.answer}) ${b.options[b.answer]}`,
  };
}

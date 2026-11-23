import { z } from "zod";
import { AI_JOB_PERMISSIONS, can, type AiJobType, type Role } from "./permissions.ts";

/**
 * AI credits (DN-053). Each institute has a balance that the EduSuite operator
 * tops up. Every AI job costs credits by type; the API takes them when the job
 * is created and gives them back if it fails. The balance can never go below zero.
 */

export const AI_JOB_TYPES = Object.keys(AI_JOB_PERMISSIONS) as AiJobType[];

/** `job`: a flat price per run. `item`: per input item (a screenshot, for example). */
export const CREDIT_UNITS = ["job", "item"] as const;
export type CreditUnit = (typeof CREDIT_UNITS)[number];

export const CreditPriceSchema = z.object({
  jobType: z.enum(AI_JOB_TYPES as [AiJobType, ...AiJobType[]]),
  credits: z.number().int().min(0).max(1000),
  unit: z.enum(CREDIT_UNITS),
});
export type CreditPrice = z.infer<typeof CreditPriceSchema>;

/**
 * Starting prices, used until the operator changes one (DN-053). Rough guide:
 * 1 credit ≈ one short generation; per-item jobs scale with the input.
 */
export const DEFAULT_CREDIT_PRICES: Record<AiJobType, { credits: number; unit: CreditUnit }> = {
  ppt_outline: { credits: 1, unit: "job" },
  paper_generate: { credits: 2, unit: "job" },
  mcq_extract: { credits: 1, unit: "item" },
  dpp_generate: { credits: 1, unit: "job" },
  lesson_plan: { credits: 1, unit: "job" },
  doubt_solve: { credits: 1, unit: "job" },
  youtube_meta: { credits: 1, unit: "job" },
  notice_draft: { credits: 1, unit: "job" },
  book_chapter: { credits: 2, unit: "job" },
  poster_copy: { credits: 1, unit: "job" },
  deck_quiz: { credits: 10, unit: "job" },
};

/** What one run costs; `items` is the input count for per-item prices (at least 1). */
export function creditCost(price: { credits: number; unit: CreditUnit }, items = 1): number {
  return price.unit === "item" ? price.credits * Math.max(1, Math.floor(items)) : price.credits;
}

/** Job types a role may start (so the app shows only those prices). */
export function jobTypesFor(role: Role): AiJobType[] {
  return AI_JOB_TYPES.filter((t) => can(role, AI_JOB_PERMISSIONS[t]));
}

export const CREDIT_KINDS = ["grant", "adjust", "job_charge", "job_refund"] as const;
export type CreditKind = (typeof CREDIT_KINDS)[number];

export const CreditEntrySchema = z.object({
  id: z.uuid(),
  kind: z.enum(CREDIT_KINDS),
  delta: z.number().int(),
  balanceAfter: z.number().int().min(0),
  note: z.string().nullable(),
  aiJobId: z.uuid().nullable(),
  actor: z.object({ id: z.uuid(), displayName: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
});
export type CreditEntry = z.infer<typeof CreditEntrySchema>;

/** GET /credits: the caller's own institute. */
export const CreditBalanceSchema = z.object({
  balance: z.number().int().min(0),
  /** Prices of the job types the caller may start. */
  prices: z.array(CreditPriceSchema),
});
export type CreditBalance = z.infer<typeof CreditBalanceSchema>;

/** POST /platform/institutes/:id/credits. A positive amount adds, a negative one takes away. */
export const CreditGrantSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((n) => n !== 0, "zero"),
  /** Why (payment reference, correction…); kept in the ledger and audit log. */
  note: z.string().trim().min(3).max(300),
});
export type CreditGrant = z.infer<typeof CreditGrantSchema>;

/** PUT /platform/credit-prices/:jobType */
export const CreditPriceUpdateSchema = CreditPriceSchema.omit({ jobType: true });
export type CreditPriceUpdate = z.infer<typeof CreditPriceUpdateSchema>;

/** One row of GET /platform/institutes. */
export const PlatformInstituteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  balance: z.number().int().min(0),
  /** Credits spent by jobs in the last 30 days (charges minus refunds). */
  used30Days: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});
export type PlatformInstitute = z.infer<typeof PlatformInstituteSchema>;

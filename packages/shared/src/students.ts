import { z } from "zod";
import { PageQuerySchema } from "./pagination.ts";
import { PhoneSchema } from "./users.ts";

/**
 * Students, fees and receipts (plan §06–07, Phase 5; DN-013, DN-061).
 * - Receipt numbers: <INST>-<BRANCH>/<FY>/<6-digit seq>, per branch per financial
 *   year (1 April), never repeated, never deleted; only admins cancel, with a reason.
 * - A receipt can't be more than the balance due, and can be dated up to 7 days back.
 * - After enrolment, only admins change a student's total fee, never below what's paid.
 */

/** Rupees with at most 2 decimals (stored as numeric(12,2)). */
export const RupeesSchema = z
  .number()
  .finite()
  .min(0)
  .max(10_000_000)
  .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(6)), "at most 2 decimals");
export const MAX_RECEIPT_BACKDATE_DAYS = 7;
export const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "cheque"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "नकद",
  upi: "UPI",
  card: "कार्ड",
  bank_transfer: "बैंक ट्रांसफ़र",
  cheque: "चेक",
};
export const STUDENT_STATUSES = ["active", "left"] as const;

/** Letters, digits, "-" and "/"; unique per institute. */
export const RollNoSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9/-]*$/, "letters, digits, - and / only")
  .transform((s) => s.toUpperCase());

/** Today's date in India (YYYY-MM-DD); receipts and financial years follow IST. */
export function istDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** The Indian financial year a date falls in, e.g. "2026-27" for 2026-11-23 (DN-013). */
export function financialYear(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number) as [number, number];
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional();

export const StudentCreateSchema = z.object({
  /** Leave out to get the next number (e.g. DEMO-MAIN-2026-0001). */
  rollNo: RollNoSchema.optional(),
  fullName: z.string().trim().min(2).max(120),
  guardianName: optText(120),
  phone: PhoneSchema.nullable().optional(),
  course: z.string().trim().min(2).max(160),
  batch: optText(120),
  totalFee: RupeesSchema,
  photoFileId: z.uuid().nullable().optional(),
});
export type StudentCreate = z.infer<typeof StudentCreateSchema>;

export const StudentUpdateSchema = z
  .object({
    rollNo: RollNoSchema,
    fullName: z.string().trim().min(2).max(120),
    guardianName: optText(120),
    phone: PhoneSchema.nullable(),
    course: z.string().trim().min(2).max(160),
    batch: optText(120),
    /** Admins only once the student exists (DN-061). */
    totalFee: RupeesSchema,
    photoFileId: z.uuid().nullable(),
    status: z.enum(STUDENT_STATUSES),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, "nothing to change");
export type StudentUpdate = z.infer<typeof StudentUpdateSchema>;

export const StudentListQuerySchema = PageQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
});
export type StudentListQuery = z.infer<typeof StudentListQuerySchema>;

export const StudentSchema = z.object({
  id: z.uuid(),
  branchId: z.uuid(),
  rollNo: z.string(),
  fullName: z.string(),
  guardianName: z.string().nullable(),
  phone: z.string().nullable(),
  course: z.string(),
  batch: z.string().nullable(),
  photoFileId: z.uuid().nullable(),
  totalFee: z.number(),
  /** Sum of issued (not cancelled) receipts. */
  paid: z.number(),
  due: z.number(),
  status: z.enum(STUDENT_STATUSES),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Student = z.infer<typeof StudentSchema>;

export const FeeReceiptCreateSchema = z.object({
  studentId: z.uuid(),
  amount: RupeesSchema.refine((n) => n > 0, "must be more than 0"),
  mode: z.enum(PAYMENT_MODES),
  /** YYYY-MM-DD in IST; today or up to 7 days back. Defaults to today. */
  paidOn: z.iso.date().optional(),
});
export type FeeReceiptCreate = z.infer<typeof FeeReceiptCreateSchema>;

export const FeeReceiptCancelSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export type FeeReceiptCancel = z.infer<typeof FeeReceiptCancelSchema>;

export const FeeReceiptListQuerySchema = PageQuerySchema.extend({ studentId: z.uuid().optional() });
export type FeeReceiptListQuery = z.infer<typeof FeeReceiptListQuerySchema>;

export const FeeReceiptSchema = z.object({
  id: z.uuid(),
  receiptNo: z.string(),
  studentId: z.uuid(),
  student: z.object({ rollNo: z.string(), fullName: z.string(), course: z.string(), batch: z.string().nullable() }),
  amount: z.number(),
  mode: z.enum(PAYMENT_MODES),
  paidOn: z.iso.date(),
  status: z.enum(["issued", "cancelled"]),
  issuedBy: z.object({ id: z.uuid(), displayName: z.string() }),
  cancelReason: z.string().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  /** The student's balance right after this receipt was issued (for printing). */
  dueAfter: z.number().nullable(),
});
export type FeeReceipt = z.infer<typeof FeeReceiptSchema>;

/** "₹12,500" / "₹12,500.50" in Indian grouping. */
export function formatRupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

import { z } from "zod";
import { DOCUMENT_TYPES, DocumentSummarySchema, type DocumentType } from "./documents.ts";
import type { ScreenId } from "./permissions.ts";

/**
 * GET /stats/dashboard (plan §07 ADMIN; DN-021, DN-051): counts of saved work the
 * caller can see, using the same type permissions and branch scope as /documents.
 * Types the caller's role can't use are left out entirely.
 */
export const TypeCountSchema = z.object({ total: z.number().int().min(0), mine: z.number().int().min(0) });

export const DashboardStatsSchema = z.object({
  /** Visible documents of each type the caller may use. */
  byType: z.partialRecord(z.enum(DOCUMENT_TYPES), TypeCountSchema),
  totals: z.object({
    total: z.number().int().min(0),
    mine: z.number().int().min(0),
    /** Visible documents created or changed in the last 7 days. */
    last7Days: z.number().int().min(0),
  }),
  /** The latest visible documents (anyone's), newest first. */
  recent: z.array(DocumentSummarySchema),
  /** The caller's own latest documents, newest first. */
  recentMine: z.array(DocumentSummarySchema),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const DASHBOARD_RECENT_LIMIT = 6;

/** The tool screen that makes and reopens each document type. */
export const DOCUMENT_SCREENS = {
  ppt: "ppt",
  mcq_set: "ocr_ppt",
  paper: "test",
  dpp: "dpp",
  lesson: "lesson",
  book: "book",
  doubt: "doubt",
  youtube: "youtube",
  notice: "notice",
  poster: "image",
} as const satisfies Record<DocumentType, ScreenId>;

/** Hindi names for each document type, for lists and counts. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ppt: "लेक्चर PPT",
  mcq_set: "स्क्रीनशॉट MCQ सेट",
  paper: "टेस्ट पेपर",
  dpp: "DPP / OMR शीट",
  lesson: "लेसन प्लान",
  book: "किताब / मॉड्यूल",
  doubt: "डाउट हल",
  youtube: "YouTube थंबनेल",
  notice: "नोटिस",
  poster: "पोस्टर",
};

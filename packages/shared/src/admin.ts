import { z } from "zod";
import { PageQuerySchema } from "./pagination.ts";

/**
 * Admin views (plan §07 ADMIN: GET /audit-logs, GET /usage; DN-066). Both need
 * `audit.view`: a super admin sees the whole institute, a branch admin sees
 * what staff of their own branch did.
 */

/** Groups the audit actions the API writes, for the filter. */
export const AUDIT_ACTION_GROUPS = ["auth", "user", "document", "receipt", "student", "ai", "credits", "institute", "branch"] as const;
export type AuditActionGroup = (typeof AUDIT_ACTION_GROUPS)[number];

export const AuditLogQuerySchema = PageQuerySchema.extend({
  group: z.enum(AUDIT_ACTION_GROUPS).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const AuditLogEntrySchema = z.object({
  id: z.uuid(),
  action: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  /** Field names, ids and amounts only; never passwords, tokens or full student records. */
  meta: z.record(z.string(), z.unknown()),
  ip: z.string().nullable(),
  createdAt: z.iso.datetime(),
  actor: z.object({ id: z.uuid(), displayName: z.string(), employeeCode: z.string() }).nullable(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const UsageQuerySchema = z.object({
  /** YYYY-MM in IST; defaults to the current month. */
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});
export type UsageQuery = z.infer<typeof UsageQuerySchema>;

export const UsageRowSchema = z.object({
  jobType: z.string(),
  jobs: z.number().int(),
  succeeded: z.number().int(),
  failed: z.number().int(),
  cancelled: z.number().int(),
  /** Credits kept: charged minus refunded. */
  credits: z.number().int(),
});
export const UsageReportSchema = z.object({
  month: z.string(),
  scope: z.enum(["institute", "branch"]),
  rows: z.array(UsageRowSchema),
  totals: UsageRowSchema.omit({ jobType: true }),
});
export type UsageReport = z.infer<typeof UsageReportSchema>;

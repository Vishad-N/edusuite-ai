import { Controller, Get, Query } from "@nestjs/common";
import {
  AuditLogQuerySchema,
  UsageQuerySchema,
  decodeCursor,
  encodeCursor,
  istDate,
  scopeFor,
  type AuditLogEntry,
  type AuditLogQuery,
  type Page,
  type UsageQuery,
  type UsageReport,
} from "@edusuite/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ZodBody } from "../common/zodBody";
import { ApiHttpException } from "../common/errors";
import { CurrentUser, RequirePermission, type AuthUser } from "../auth/authUser";

const IST_OFFSET_MS = 330 * 60_000;
/** Start of a YYYY-MM-DD day in IST, as a UTC instant. */
const istDayStart = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - IST_OFFSET_MS);

/**
 * Plan §07 ADMIN (DN-066): the audit log and monthly AI usage. `audit.view`:
 * super admins see the institute, branch admins see staff of their own branch.
 */
@Controller()
@RequirePermission("audit.view")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private branchOnly(actor: AuthUser): boolean {
    return scopeFor(actor.role, "audit.view") === "branch";
  }

  @Get("audit-logs")
  async auditLogs(@CurrentUser() actor: AuthUser, @Query(new ZodBody(AuditLogQuerySchema)) q: AuditLogQuery): Promise<Page<AuditLogEntry>> {
    const cursor = q.cursor ? decodeCursor(q.cursor) : undefined;
    if (cursor === null) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "cursor", rule: "invalid" }] });
    const and: Prisma.AuditLogWhereInput[] = [{ instituteId: actor.instituteId }];
    if (this.branchOnly(actor)) and.push({ actor: { branchId: actor.branchId } });
    if (q.group) and.push({ action: { startsWith: `${q.group}.` } });
    if (q.from) and.push({ createdAt: { gte: istDayStart(q.from) } });
    if (q.to) and.push({ createdAt: { lt: new Date(istDayStart(q.to).getTime() + 86_400_000) } });
    if (cursor) and.push({ OR: [{ createdAt: { lt: cursor.updatedAt } }, { createdAt: cursor.updatedAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.db.auditLog.findMany({
      where: { AND: and },
      include: { actor: { select: { id: true, displayName: true, employeeCode: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: q.limit + 1,
    });
    const page = rows.slice(0, q.limit);
    const last = page.at(-1);
    return {
      items: page.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        meta: (r.meta ?? {}) as Record<string, unknown>,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
        actor: r.actor,
      })),
      nextCursor: rows.length > q.limit && last ? encodeCursor({ updatedAt: last.createdAt, id: last.id }) : null,
    };
  }

  /** Jobs started in the month (IST) by type and outcome, and credits kept (charged − refunded). */
  @Get("usage")
  async usage(@CurrentUser() actor: AuthUser, @Query(new ZodBody(UsageQuerySchema)) q: UsageQuery): Promise<UsageReport> {
    const month = q.month ?? istDate().slice(0, 7);
    const [y, m] = month.split("-").map(Number) as [number, number];
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const branchOnly = this.branchOnly(actor);
    const jobs = await this.prisma.db.aiJob.findMany({
      where: {
        instituteId: actor.instituteId,
        createdAt: { gte: istDayStart(`${month}-01`), lt: istDayStart(`${next}-01`) },
        ...(branchOnly && { user: { branchId: actor.branchId } }),
      },
      select: { type: true, status: true, creditsCharged: true, creditEntries: { select: { kind: true, delta: true } } },
    });
    const by = new Map<string, UsageReport["rows"][number]>();
    for (const j of jobs) {
      const row = by.get(j.type) ?? { jobType: j.type, jobs: 0, succeeded: 0, failed: 0, cancelled: 0, credits: 0 };
      row.jobs += 1;
      if (j.status === "succeeded") row.succeeded += 1;
      if (j.status === "failed") row.failed += 1;
      if (j.status === "cancelled") row.cancelled += 1;
      // Ledger deltas are negative for a charge and positive for a refund.
      row.credits += -j.creditEntries.reduce((s, e) => s + e.delta, 0);
      by.set(j.type, row);
    }
    const rows = [...by.values()].sort((a, b) => b.credits - a.credits || a.jobType.localeCompare(b.jobType));
    const sum = (k: "jobs" | "succeeded" | "failed" | "cancelled" | "credits") => rows.reduce((s, r) => s + r[k], 0);
    return {
      month,
      scope: branchOnly ? "branch" : "institute",
      rows,
      totals: { jobs: sum("jobs"), succeeded: sum("succeeded"), failed: sum("failed"), cancelled: sum("cancelled"), credits: sum("credits") },
    };
  }
}

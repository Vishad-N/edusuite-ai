import { Injectable } from "@nestjs/common";
import {
  DASHBOARD_RECENT_LIMIT,
  DOCUMENT_PERMISSIONS,
  DOCUMENT_TYPES,
  can,
  type DashboardStats,
  type DocumentType,
} from "@edusuite/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/authUser";
import { scopeWhere } from "../auth/scope";
import { summarySelect, toSummary, type SummaryRow } from "../documents/documents.service";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Dashboard and TeacherDesk numbers (plan §07 ADMIN `GET /stats/dashboard`, DN-021).
 * Everything is counted with the same rules as GET /documents: a type counts only if
 * the caller's role may use it, and only inside the scope that permission gives them
 * (the whole institute for a super admin, the current branch for everyone else).
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(actor: AuthUser, now = new Date()): Promise<DashboardStats> {
    const types = DOCUMENT_TYPES.filter((type) => can(actor.role, DOCUMENT_PERMISSIONS[type]));
    const empty: DashboardStats = { byType: {}, totals: { total: 0, mine: 0, last7Days: 0 }, recent: [], recentMine: [] };
    if (types.length === 0) return empty;

    // One clause per allowed type, each with its own scope.
    const visible: Prisma.DocumentWhereInput = {
      deletedAt: null,
      OR: types.map((type) => ({ type, ...scopeWhere(actor, DOCUMENT_PERMISSIONS[type]) })),
    };
    const mine: Prisma.DocumentWhereInput = { AND: [visible, { createdById: actor.userId }] };
    const db = this.prisma.db;
    const newest = [{ updatedAt: "desc" as const }, { id: "desc" as const }];

    const [allByType, mineByType, last7Days, recent, recentMine] = await Promise.all([
      db.document.groupBy({ by: ["type"], where: visible, _count: { _all: true } }),
      db.document.groupBy({ by: ["type"], where: mine, _count: { _all: true } }),
      db.document.count({ where: { AND: [visible, { updatedAt: { gte: new Date(now.getTime() - WEEK_MS) } }] } }),
      db.document.findMany({ where: visible, select: summarySelect, orderBy: newest, take: DASHBOARD_RECENT_LIMIT }),
      db.document.findMany({ where: mine, select: summarySelect, orderBy: newest, take: DASHBOARD_RECENT_LIMIT }),
    ]);

    const byType: DashboardStats["byType"] = {};
    for (const type of types) byType[type] = { total: 0, mine: 0 };
    for (const row of allByType) byType[row.type as DocumentType]!.total = row._count._all;
    for (const row of mineByType) byType[row.type as DocumentType]!.mine = row._count._all;

    const counts = Object.values(byType);
    return {
      byType,
      totals: {
        total: counts.reduce((n, c) => n + c.total, 0),
        mine: counts.reduce((n, c) => n + c.mine, 0),
        last7Days,
      },
      recent: recent.map((r) => toSummary(r as SummaryRow)),
      recentMine: recentMine.map((r) => toSummary(r as SummaryRow)),
    };
  }
}

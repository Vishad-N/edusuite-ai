import { Injectable } from "@nestjs/common";
import {
  AI_JOB_TYPES,
  DEFAULT_CREDIT_PRICES,
  decodeCursor,
  encodeCursor,
  jobTypesFor,
  type AiJobType,
  type CreditBalance,
  type CreditEntry,
  type CreditGrant,
  type CreditPrice,
  type CreditPriceUpdate,
  type Page,
  type PlatformInstitute,
} from "@edusuite/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "../auth/authUser";

type Ctx = { ip?: string | undefined };
type Tx = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

const entrySelect = {
  id: true,
  kind: true,
  delta: true,
  balanceAfter: true,
  note: true,
  aiJobId: true,
  createdAt: true,
  actor: { select: { id: true, displayName: true } },
} as const;

/**
 * AI credits (DN-053). The balance on `institutes` changes only together with a
 * `credit_ledger` row, in one transaction, through a conditional update, so two
 * requests can never spend the same credits and the balance never goes below zero
 * (the database also refuses it with a CHECK constraint).
 */
@Injectable()
export class CreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Every job type's price: the operator's override if any, else the default. */
  async prices(): Promise<CreditPrice[]> {
    const overrides = await this.prisma.db.aiCreditPrice.findMany();
    const byType = new Map(overrides.map((p) => [p.jobType as AiJobType, p]));
    return AI_JOB_TYPES.map((jobType) => {
      const o = byType.get(jobType);
      return o ? { jobType, credits: o.credits, unit: o.unit } : { jobType, ...DEFAULT_CREDIT_PRICES[jobType] };
    });
  }

  async priceFor(jobType: AiJobType): Promise<CreditPrice> {
    const o = await this.prisma.db.aiCreditPrice.findUnique({ where: { jobType } });
    return o ? { jobType, credits: o.credits, unit: o.unit } : { jobType, ...DEFAULT_CREDIT_PRICES[jobType] };
  }

  /** GET /credits: the caller's institute balance and the prices of jobs they may start. */
  async balanceFor(actor: AuthUser): Promise<CreditBalance> {
    const inst = await this.prisma.db.institute.findUniqueOrThrow({ where: { id: actor.instituteId }, select: { creditBalance: true } });
    const allowed = new Set(jobTypesFor(actor.role));
    return { balance: inst.creditBalance, prices: (await this.prices()).filter((p) => allowed.has(p.jobType)) };
  }

  /** Ledger of one institute, newest first. The caller decides whose (own institute or, for the operator, any). */
  async ledger(instituteId: string, cursor: string | undefined, limit: number): Promise<Page<CreditEntry>> {
    const at = cursor ? decodeCursor(cursor) : undefined;
    if (at === null) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "cursor", rule: "invalid" }] });
    const rows = await this.prisma.db.creditLedger.findMany({
      where: {
        instituteId,
        ...(at && { OR: [{ createdAt: { lt: at.updatedAt } }, { createdAt: at.updatedAt, id: { lt: at.id } }] }),
      },
      select: entrySelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      nextCursor: rows.length > limit && last ? encodeCursor({ updatedAt: last.createdAt, id: last.id }) : null,
    };
  }

  /** The operator adds (or, with a negative amount, takes away) credits. */
  async grant(actor: AuthUser, instituteId: string, input: CreditGrant, ctx: Ctx): Promise<CreditEntry> {
    await this.assertTenantInstitute(instituteId);
    const entry = await this.prisma.db.$transaction(async (tx) => {
      const balanceAfter = await this.move(tx, instituteId, input.delta);
      if (balanceAfter === null) throw new ApiHttpException(409, "CREDITS_ADJUST_TOO_LARGE");
      return tx.creditLedger.create({
        data: { instituteId, kind: input.delta > 0 ? "grant" : "adjust", delta: input.delta, balanceAfter, note: input.note, actorId: actor.userId },
        select: entrySelect,
      });
    });
    await this.audit.log({
      instituteId,
      actorId: actor.userId,
      action: input.delta > 0 ? "credits.grant" : "credits.adjust",
      entityType: "institute",
      entityId: instituteId,
      meta: { delta: input.delta, balanceAfter: entry.balanceAfter },
      ip: ctx.ip,
    });
    return { ...entry, createdAt: entry.createdAt.toISOString() };
  }

  /**
   * Takes a job's credits inside the caller's transaction (Phase 4 jobs API).
   * Throws 402 CREDITS_EXHAUSTED if the balance is too low; nothing is written then.
   */
  async chargeJob(tx: Tx, args: { instituteId: string; aiJobId: string; amount: number }): Promise<void> {
    if (args.amount <= 0) return;
    const balanceAfter = await this.move(tx, args.instituteId, -args.amount);
    if (balanceAfter === null) throw new ApiHttpException(402, "CREDITS_EXHAUSTED", { needed: args.amount });
    await tx.creditLedger.create({
      data: { instituteId: args.instituteId, kind: "job_charge", delta: -args.amount, balanceAfter, aiJobId: args.aiJobId },
    });
  }

  /** Gives a failed job's credits back, once (the ledger's unique (job, kind) makes a second refund a no-op). */
  async refundJob(aiJobId: string): Promise<boolean> {
    return this.prisma.db.$transaction(async (tx) => {
      const charge = await tx.creditLedger.findUnique({ where: { aiJobId_kind: { aiJobId, kind: "job_charge" } } });
      if (!charge) return false;
      const already = await tx.creditLedger.findUnique({ where: { aiJobId_kind: { aiJobId, kind: "job_refund" } } });
      if (already) return false;
      const amount = -charge.delta;
      const balanceAfter = await this.move(tx, charge.instituteId, amount);
      if (balanceAfter === null) return false; // can't happen for a positive amount
      await tx.creditLedger.create({
        data: { instituteId: charge.instituteId, kind: "job_refund", delta: amount, balanceAfter, aiJobId },
      });
      return true;
    });
  }

  /** GET /platform/institutes: every customer institute with its balance and recent use. */
  async listInstitutes(now = new Date()): Promise<PlatformInstitute[]> {
    const db = this.prisma.db;
    const [institutes, usage] = await Promise.all([
      // The operator's own institute only holds platform admins; it isn't a customer.
      db.institute.findMany({
        where: { users: { none: { role: "platform_admin" } } },
        select: { id: true, name: true, code: true, creditBalance: true, createdAt: true },
        orderBy: { name: "asc" },
      }),
      db.creditLedger.groupBy({
        by: ["instituteId"],
        where: { kind: { in: ["job_charge", "job_refund"] }, createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
        _sum: { delta: true },
      }),
    ]);
    const used = new Map(usage.map((u) => [u.instituteId, Math.max(0, -(u._sum.delta ?? 0))]));
    return institutes.map((i) => ({
      id: i.id,
      name: i.name,
      code: i.code,
      balance: i.creditBalance,
      used30Days: used.get(i.id) ?? 0,
      createdAt: i.createdAt.toISOString(),
    }));
  }

  /** The operator changes one job type's price. */
  async setPrice(actor: AuthUser, jobType: AiJobType, input: CreditPriceUpdate, ctx: Ctx): Promise<CreditPrice> {
    await this.prisma.db.aiCreditPrice.upsert({
      where: { jobType },
      create: { jobType, credits: input.credits, unit: input.unit, updatedById: actor.userId },
      update: { credits: input.credits, unit: input.unit, updatedById: actor.userId },
    });
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "credits.price",
      entityType: "ai_credit_price",
      meta: { jobType, credits: input.credits, unit: input.unit },
      ip: ctx.ip,
    });
    return { jobType, ...input };
  }

  /** 404 unless the id is a customer institute (not the operator's own). */
  async assertTenantInstitute(instituteId: string): Promise<void> {
    const found = await this.prisma.db.institute.findFirst({
      where: { id: instituteId, users: { none: { role: "platform_admin" } } },
      select: { id: true },
    });
    if (!found) throw new ApiHttpException(404, "NOT_FOUND");
  }

  /**
   * Moves the balance by `delta` only if it stays at or above zero.
   * Returns the new balance, or null if the move was refused.
   */
  private async move(tx: Tx, instituteId: string, delta: number): Promise<number | null> {
    const { count } = await tx.institute.updateMany({
      where: { id: instituteId, creditBalance: { gte: Math.max(0, -delta) } },
      data: { creditBalance: { increment: delta } },
    });
    if (count !== 1) return null;
    const after = await tx.institute.findUniqueOrThrow({ where: { id: instituteId }, select: { creditBalance: true } });
    return after.creditBalance;
  }
}

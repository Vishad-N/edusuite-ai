import { Inject, Injectable } from "@nestjs/common";
import {
  AI_JOB_PERMISSIONS,
  can,
  creditCost,
  jobItemCount,
  pickLanguage,
  type AiJob,
  type AiJobCreate,
  type AiJobStatus,
} from "@edusuite/shared";
import type { AiJob as AiJobRow, Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreditsService } from "../credits/credits.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException, ERROR_MESSAGES, type ErrorCode } from "../common/errors";
import type { AuthUser } from "../auth/authUser";
import { JOB_DEFINITIONS } from "./definitions";
import { AI_QUEUE, type AiQueue } from "./queue";

type Ctx = { ip?: string | undefined; acceptLanguage?: string | undefined };

export function toJobDto(row: AiJobRow, acceptLanguage?: string): AiJob {
  const lang = pickLanguage(acceptLanguage);
  const code = row.errorCode as ErrorCode | null;
  return {
    id: row.id,
    type: row.type,
    status: row.status as AiJobStatus,
    progress: { done: row.progressDone, total: row.progressTotal },
    error:
      row.status === "failed" && code
        ? { code, message: (ERROR_MESSAGES[code] ?? ERROR_MESSAGES.AI_UNAVAILABLE)[lang] }
        : null,
    result: row.status === "succeeded" ? (row.result ?? null) : null,
    fixture: row.fixture,
    creditsCharged: row.creditsCharged,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

/**
 * Starts and reads AI jobs (plan §07 AI, §08). Creating a job checks the role's
 * permission for that type, takes its credits in the same transaction (DN-053),
 * then queues it. The same Idempotency-Key never creates or charges twice.
 */
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly audit: AuditService,
    @Inject(AI_QUEUE) private readonly queue: AiQueue,
  ) {}

  async create(actor: AuthUser, body: AiJobCreate, idempotencyKey: string, ctx: Ctx): Promise<{ job: AiJob; created: boolean }> {
    if (!can(actor.role, AI_JOB_PERMISSIONS[body.type])) throw new ApiHttpException(403, "FORBIDDEN");
    const def = JOB_DEFINITIONS[body.type];
    if (!def) throw new ApiHttpException(400, "AI_JOB_TYPE_UNAVAILABLE");
    const db = this.prisma.db;

    const existing = await db.aiJob.findUnique({ where: { instituteId_idempotencyKey: { instituteId: actor.instituteId, idempotencyKey } } });
    if (existing) {
      // Same key from someone else, or for different work, is a client bug: refuse rather than leak.
      if (existing.userId !== actor.userId || existing.type !== body.type) throw new ApiHttpException(409, "CONFLICT");
      return { job: toJobDto(existing, ctx.acceptLanguage), created: false };
    }

    await def.precheck?.(body.input as never, {
      instituteId: actor.instituteId,
      findFile: async (fileId) => {
        const f = await db.file.findFirst({ where: { id: fileId, instituteId: actor.instituteId } });
        return f && { mime: f.mime, bytes: f.bytes, uploaded: f.uploadedAt !== null };
      },
    });

    const cost = creditCost(await this.credits.priceFor(body.type), jobItemCount(body));
    const row = await db.$transaction(async (tx) => {
      const created = await tx.aiJob.create({
        data: {
          instituteId: actor.instituteId,
          userId: actor.userId,
          type: body.type,
          input: body.input as Prisma.InputJsonValue,
          idempotencyKey,
          creditsCharged: cost,
        },
      });
      await this.credits.chargeJob(tx, { instituteId: actor.instituteId, aiJobId: created.id, amount: cost });
      return created;
    });

    try {
      await this.queue.add(row.id);
    } catch (err) {
      // Couldn't queue: don't keep the credits for work that will never run.
      await db.aiJob.update({ where: { id: row.id }, data: { status: "failed", errorCode: "AI_UNAVAILABLE", finishedAt: new Date() } });
      await this.credits.refundJob(row.id);
      throw err instanceof ApiHttpException ? err : new ApiHttpException(503, "SERVICE_UNAVAILABLE");
    }

    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "ai.job.create",
      entityType: "ai_job",
      entityId: row.id,
      meta: { type: body.type, credits: cost },
      ip: ctx.ip,
    });
    return { job: toJobDto(row, ctx.acceptLanguage), created: true };
  }

  /** A job its starter, or an admin of the same institute, may read; anything else is 404. */
  async get(actor: AuthUser, id: string, acceptLanguage?: string): Promise<AiJob> {
    const row = await this.prisma.db.aiJob.findFirst({ where: { id, instituteId: actor.instituteId } });
    const admin = actor.role === "superadmin" || actor.role === "branch_admin";
    if (!row || (!admin && row.userId !== actor.userId)) throw new ApiHttpException(404, "NOT_FOUND");
    return toJobDto(row, acceptLanguage);
  }
}

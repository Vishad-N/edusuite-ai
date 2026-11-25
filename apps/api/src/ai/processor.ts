import { TERMINAL_JOB_STATUSES, type AiJobStatus, type AiJobType } from "@edusuite/shared";
import type { Prisma } from "../generated/prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { CreditsService } from "../credits/credits.service";
import type { Storage } from "../files/storage";
import { JOB_DEFINITIONS, type JobContext } from "./definitions";
import { AiJobError, toJobError, type AiRunner } from "./runner";
import { captureError } from "../common/telemetry";

export type Attempt = { attemptsMade: number; maxAttempts: number };
export type ProcessOutcome = "succeeded" | "failed" | "retry" | "skipped";
type Log = { info: (msg: string) => void; warn: (msg: string) => void };

/**
 * Runs one queued AI job (plan §08). Used by the worker process and by tests.
 * - Success: result and usage are saved together.
 * - A failure that a retry may fix is thrown back to BullMQ while attempts remain.
 * - A final failure marks the job failed and refunds its credits (DN-053), once.
 */
export class AiProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly runner: AiRunner,
    private readonly storage: Storage,
    private readonly log: Log = { info: () => undefined, warn: () => undefined },
  ) {}

  async process(aiJobId: string, attempt: Attempt): Promise<ProcessOutcome> {
    const db = this.prisma.db;
    const job = await db.aiJob.findUnique({ where: { id: aiJobId }, include: { institute: { select: { name: true } } } });
    if (!job || TERMINAL_JOB_STATUSES.includes(job.status as AiJobStatus)) return "skipped";

    const def = JOB_DEFINITIONS[job.type as AiJobType];
    if (!def) {
      await this.fail(aiJobId, new AiJobError("AI_JOB_TYPE_UNAVAILABLE", false));
      return "failed";
    }
    const input = def.input.parse(job.input) as never;
    // Conditional: a job cancelled after it was read stays cancelled (DN-065).
    const started = await db.aiJob.updateMany({
      where: { id: aiJobId, status: { in: ["queued", "running"] } },
      data: { status: "running", startedAt: job.startedAt ?? new Date(), progressTotal: def.steps(input), progressDone: 0 },
    });
    if (started.count === 0) return "skipped";

    try {
      const result = await this.runner.run(def, input, this.context(job.instituteId, job.institute.name));
      const output = def.finish ? def.finish(result.output as never, input) : result.output;
      let cancelled = false;
      await db.$transaction(async (tx) => {
        // Only a still-running job takes the result; a cancelled one keeps its status.
        const saved = await tx.aiJob.updateMany({
          where: { id: aiJobId, status: "running" },
          data: {
            status: "succeeded",
            result: output as Prisma.InputJsonValue,
            fixture: result.fixture,
            progressDone: def.steps(input),
            finishedAt: new Date(),
            error: null,
            errorCode: null,
          },
        });
        cancelled = saved.count === 0;
        // Usage is recorded either way: Claude was called and paid for.
        for (const u of result.usage) {
          await tx.aiUsage.create({
            data: {
              instituteId: job.instituteId,
              aiJobId,
              model: u.model,
              inputTokens: u.inputTokens,
              outputTokens: u.outputTokens,
              cacheReadTokens: u.cacheReadTokens,
              cacheWriteTokens: u.cacheWriteTokens,
              costUsd: u.costUsd,
            },
          });
        }
      });
      if (cancelled) {
        this.log.info(`ai job ${aiJobId} (${job.type}) finished after it was cancelled; result discarded`);
        return "skipped";
      }
      this.log.info(`ai job ${aiJobId} (${job.type}) succeeded${result.fixture ? " [fixture]" : ""}`);
      return "succeeded";
    } catch (err) {
      const e = toJobError(err);
      const final = !e.retryable || attempt.attemptsMade + 1 >= attempt.maxAttempts;
      this.log.warn(`ai job ${aiJobId} (${job.type}) attempt ${attempt.attemptsMade + 1}/${attempt.maxAttempts}: ${e.message}${final ? " (final)" : ""}`);
      if (!final) {
        const requeued = await db.aiJob.updateMany({ where: { id: aiJobId, status: "running" }, data: { status: "queued", errorCode: e.code } });
        if (requeued.count === 0) return "skipped"; // cancelled meanwhile: no retry
        throw e;
      }
      await this.fail(aiJobId, e);
      // Refusals and bad input files are the user's input, not our fault; everything else is worth a report.
      if (e.code !== "AI_REFUSED" && e.code !== "AI_INPUT_FILE_INVALID") captureError(err, { job_type: job.type, code: e.code });
      return "failed";
    }
  }

  /** What a job may read: only this institute's verified uploads. */
  private context(instituteId: string, instituteName: string): JobContext {
    return {
      instituteId,
      instituteName,
      readFile: async (fileId, mimes) => {
        const file = await this.prisma.db.file.findFirst({ where: { id: fileId, instituteId, mime: { in: [...mimes] }, uploadedAt: { not: null } } });
        if (!file) throw new AiJobError("AI_INPUT_FILE_INVALID", false);
        return { bytes: await this.storage.read(file.bucketKey), mime: file.mime };
      },
    };
  }

  private async fail(aiJobId: string, e: AiJobError): Promise<void> {
    // A cancelled job is already refunded and stays cancelled.
    const res = await this.prisma.db.aiJob.updateMany({
      where: { id: aiJobId, status: { not: "cancelled" } },
      data: { status: "failed", errorCode: e.code, error: e.message.slice(0, 500), finishedAt: new Date() },
    });
    if (res.count > 0) await this.credits.refundJob(aiJobId);
  }
}

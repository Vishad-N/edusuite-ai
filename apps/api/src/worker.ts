import { UnrecoverableError, Worker } from "bullmq";
import { loadEnv } from "./config/env";
import { PrismaService } from "./prisma/prisma.service";
import { AuditService } from "./audit/audit.service";
import { CreditsService } from "./credits/credits.service";
import { AiRunner } from "./ai/runner";
import { S3Storage } from "./files/storage";
import { AiProcessor } from "./ai/processor";
import { AI_JOB_ATTEMPTS, AI_QUEUE_NAME, redisConnection } from "./ai/queue";
import { captureError, flushTelemetry, initTelemetry } from "./common/telemetry";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- version for the error-report release tag
const { version } = require("../../package.json") as { version: string };

/** One JSON line per event, like the API's pino logs (no extra dependency). */
function makeLog(level: string) {
  const order = ["trace", "debug", "info", "warn", "error", "fatal"];
  const min = order.indexOf(level);
  const write = (lvl: string) => (fields: Record<string, unknown> | string, msg?: string) => {
    if (order.indexOf(lvl) < min) return;
    const extra = typeof fields === "string" ? { msg: fields } : { ...fields, msg };
    process.stdout.write(`${JSON.stringify({ level: lvl, time: new Date().toISOString(), service: "worker", ...extra })}\n`);
  };
  return { info: write("info"), warn: write("warn"), error: write("error") };
}

/**
 * The AI worker (plan §04, ADR-2): a second process from the same image that
 * takes jobs off the BullMQ queue and runs them. Start: node dist/src/worker.js
 */
async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.REDIS_URL || !env.DATABASE_URL) throw new Error("The worker needs REDIS_URL and DATABASE_URL.");
  if (env.AI_MODE !== "fixture" && !env.ANTHROPIC_API_KEY) throw new Error(`AI_MODE=${env.AI_MODE} needs ANTHROPIC_API_KEY.`);
  const log = makeLog(env.LOG_LEVEL);
  if (initTelemetry({ dsn: env.SENTRY_DSN, environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV, service: "worker", release: `edusuite-api@${version}` })) {
    log.info("error reporting on");
  }

  const prisma = new PrismaService(env);
  const credits = new CreditsService(prisma, new AuditService(prisma));
  const storage = new S3Storage(env);
  if (!storage.configured) log.warn("storage is not configured; jobs that read uploaded files will fail");
  const processor = new AiProcessor(prisma, credits, new AiRunner(env), storage, {
    info: (m) => log.info(m),
    warn: (m) => log.warn(m),
  });

  const worker = new Worker(
    AI_QUEUE_NAME,
    async (job) => {
      const outcome = await processor.process(String(job.data.aiJobId), {
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? AI_JOB_ATTEMPTS,
      });
      // A final failure is already recorded and refunded; stop BullMQ from retrying it.
      if (outcome === "failed") throw new UnrecoverableError("job failed");
      return outcome;
    },
    { connection: redisConnection(env.REDIS_URL), concurrency: env.AI_CONCURRENCY },
  );
  worker.on("error", (err) => {
    log.error({ err: err.message }, "worker error");
    captureError(err, { where: "queue" });
  });
  log.info({ mode: env.AI_MODE, model: env.AI_MODEL, concurrency: env.AI_CONCURRENCY }, "AI worker started");

  const stop = async () => {
    log.info("stopping AI worker");
    await worker.close();
    await prisma.onModuleDestroy();
    await flushTelemetry();
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop());
  process.on("SIGINT", () => void stop());
}

main().catch(async (err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  captureError(err, { where: "startup" });
  await flushTelemetry();
  process.exit(1);
});

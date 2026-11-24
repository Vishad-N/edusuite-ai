import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { Env } from "../config/env";
import { ApiHttpException } from "../common/errors";

export const AI_QUEUE_NAME = "ai-jobs";
export const AI_QUEUE = Symbol("AI_QUEUE");
/** Retries for rate limits and server errors (plan §08: 3 with backoff). */
export const AI_JOB_ATTEMPTS = 3;

/** What the API needs from the queue: hand over a job id. Tests swap in a fake. */
export type AiQueue = {
  add: (aiJobId: string) => Promise<void>;
  /** Best effort: drop a job that hasn't started; the worker skips cancelled jobs anyway. */
  remove?: (aiJobId: string) => Promise<void>;
  close: () => Promise<void>;
};

/** BullMQ needs `maxRetriesPerRequest: null` on its connections. */
export function redisConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}

export class BullMqAiQueue implements AiQueue {
  private queue: Queue | undefined;

  constructor(private readonly env: Env) {}

  async add(aiJobId: string): Promise<void> {
    if (!this.env.REDIS_URL) throw new ApiHttpException(503, "SERVICE_UNAVAILABLE");
    this.queue ??= new Queue(AI_QUEUE_NAME, { connection: redisConnection(this.env.REDIS_URL) });
    await this.queue.add(
      "run",
      { aiJobId },
      {
        // The job id doubles as BullMQ's id, so a job can't be queued twice.
        jobId: aiJobId,
        attempts: AI_JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  async remove(aiJobId: string): Promise<void> {
    try {
      await this.queue?.remove(aiJobId);
    } catch {
      // Already running (locked) or gone: the worker sees the cancelled status.
    }
  }

  async close(): Promise<void> {
    await this.queue?.close();
  }
}

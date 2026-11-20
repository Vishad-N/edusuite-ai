import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

export type CheckStatus = "up" | "down" | "not_configured";
export type ReadinessReport = {
  ready: boolean;
  checks: Record<"database" | "redis" | "storage", CheckStatus>;
};

const TIMEOUT_MS = 2000;

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async check(): Promise<ReadinessReport> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);
    const checks = { database, redis, storage };
    return { ready: Object.values(checks).every((s) => s === "up"), checks };
  }

  /** Runs SELECT 1 through Prisma, with a time limit. */
  private async checkDatabase(): Promise<CheckStatus> {
    if (!this.prisma.configured) return "not_configured";
    try {
      await withTimeout(this.prisma.db.$queryRaw`SELECT 1`, TIMEOUT_MS);
      return "up";
    } catch {
      return "down";
    }
  }

  private async checkRedis(): Promise<CheckStatus> {
    if (!this.env.REDIS_URL) return "not_configured";
    const client = new Redis(this.env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: TIMEOUT_MS,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
    });
    try {
      await client.connect();
      return (await client.ping()) === "PONG" ? "up" : "down";
    } catch {
      return "down";
    } finally {
      client.disconnect();
    }
  }

  /** Any HTTP answer from the S3-compatible endpoint means the storage service is reachable. */
  private async checkStorage(): Promise<CheckStatus> {
    if (!this.env.S3_ENDPOINT) return "not_configured";
    try {
      const res = await fetch(this.env.S3_ENDPOINT, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      return res.status < 500 ? "up" : "down";
    } catch {
      return "down";
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e: unknown) => { clearTimeout(timer); reject(e); },
    );
  });
}

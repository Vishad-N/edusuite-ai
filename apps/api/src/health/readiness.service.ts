import { Inject, Injectable } from "@nestjs/common";
import { connect } from "node:net";
import { Redis } from "ioredis";
import { ENV, type Env } from "../config/env";

export type CheckStatus = "up" | "down" | "not_configured";
export type ReadinessReport = {
  ready: boolean;
  checks: Record<"database" | "redis" | "storage", CheckStatus>;
};

const TIMEOUT_MS = 2000;

@Injectable()
export class ReadinessService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async check(): Promise<ReadinessReport> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);
    const checks = { database, redis, storage };
    return { ready: Object.values(checks).every((s) => s === "up"), checks };
  }

  /** Phase 1: confirms Postgres accepts TCP connections. Replaced by a `SELECT 1` once Prisma is wired in. */
  private checkDatabase(): Promise<CheckStatus> {
    if (!this.env.DATABASE_URL) return Promise.resolve("not_configured");
    const url = new URL(this.env.DATABASE_URL);
    return tcpReachable(url.hostname, Number(url.port || 5432));
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

function tcpReachable(host: string, port: number): Promise<CheckStatus> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: TIMEOUT_MS });
    const done = (status: CheckStatus) => {
      socket.destroy();
      resolve(status);
    };
    socket.once("connect", () => done("up"));
    socket.once("timeout", () => done("down"));
    socket.once("error", () => done("down"));
  });
}

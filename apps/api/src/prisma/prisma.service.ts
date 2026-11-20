import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { ENV, type Env } from "../config/env";
import { ApiHttpException } from "../common/errors";

/**
 * One Prisma client per process, created on first use. If DATABASE_URL is not
 * set, the API still starts (health checks work) and any database call fails
 * with 503 SERVICE_UNAVAILABLE.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private client: PrismaClient | undefined;

  constructor(@Inject(ENV) private readonly env: Env) {}

  get configured(): boolean {
    return Boolean(this.env.DATABASE_URL);
  }

  get db(): PrismaClient {
    if (!this.env.DATABASE_URL) throw new ApiHttpException(503, "SERVICE_UNAVAILABLE");
    this.client ??= new PrismaClient({
      adapter: new PrismaPg({ connectionString: this.env.DATABASE_URL, connectionTimeoutMillis: 2000 }),
    });
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }
}

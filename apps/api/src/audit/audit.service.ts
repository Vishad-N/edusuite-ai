import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AuditEntry = {
  instituteId?: string | null;
  actorId?: string | null;
  /** e.g. "auth.login", "auth.login_failed", "auth.refresh_reuse", "auth.logout" */
  action: string;
  entityType?: string;
  entityId?: string;
  /** Never put passwords, tokens or full student records here (AGENT_README §8). */
  meta?: Record<string, string | number | boolean | null>;
  ip?: string | undefined;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger("AuditService");

  constructor(private readonly prisma: PrismaService) {}

  /** Writes one audit row. A failure is logged but never breaks the user's request. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.db.auditLog.create({
        data: {
          instituteId: entry.instituteId ?? null,
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          meta: entry.meta ?? {},
          ip: entry.ip ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`audit write failed for ${entry.action}: ${err instanceof Error ? err.name : "unknown"}`);
    }
  }
}

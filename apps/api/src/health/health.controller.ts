import { Controller, Get, HttpCode, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ReadinessService, type ReadinessReport } from "./readiness.service";
import { Public } from "../auth/authUser";

/**
 * Liveness and readiness probes (plan §07 SYSTEM). They sit outside /api/v1 so
 * Docker, Caddy and Uptime Kuma can call them without auth.
 */
@Controller()
@Public()
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get("health")
  @HttpCode(200)
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(@Res({ passthrough: true }) reply: FastifyReply): Promise<ReadinessReport> {
    const report = await this.readiness.check();
    reply.status(report.ready ? 200 : 503);
    return report;
  }
}

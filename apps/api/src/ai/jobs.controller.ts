import { Body, Controller, Get, Headers, Inject, Param, ParseUUIDPipe, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  AiJobCreateSchema,
  IDEMPOTENCY_HEADER,
  IdempotencyKeySchema,
  TERMINAL_JOB_STATUSES,
  type AiJob,
  type AiJobCreate,
} from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { ApiHttpException } from "../common/errors";
import { AnySignedIn, CurrentUser, type AuthUser } from "../auth/authUser";
import { JobsService } from "./jobs.service";
import { AiRateLimited } from "../auth/guards";
import { ENV, type Env } from "../config/env";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** How often the event stream re-reads the job, and how long it stays open. */
export const SSE_POLL_MS = 1000;
const SSE_HEARTBEAT_MS = 15_000;
const SSE_MAX_MS = 15 * 60_000;

/**
 * Plan §07 AI: start a job, read it, follow it over SSE. The permission depends
 * on the job type, so the route needs any signed-in user and JobsService checks
 * the type's permission (AI_JOB_PERMISSIONS).
 */
@Controller("ai")
@AnySignedIn()
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Whether AI answers are real or fixtures, so the app can show a badge (DN-012). */
  @Get("mode")
  mode(): { mode: Env["AI_MODE"] } {
    return { mode: this.env.AI_MODE };
  }

  @Post("jobs")
  @AiRateLimited()
  async create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodBody(AiJobCreateSchema)) body: AiJobCreate,
    @Headers(IDEMPOTENCY_HEADER) key: string | undefined,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AiJob> {
    const parsed = IdempotencyKeySchema.safeParse(key);
    if (!parsed.success) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: IDEMPOTENCY_HEADER, rule: "required" }] });
    const { job, created } = await this.jobs.create(actor, body, parsed.data, { ip: req.ip, acceptLanguage: req.headers["accept-language"] });
    reply.status(created ? 202 : 200);
    return job;
  }

  /** Stops a queued or running job and returns its credits (DN-065). */
  @Post("jobs/:id/cancel")
  cancel(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest): Promise<AiJob> {
    return this.jobs.cancel(actor, id, { ip: req.ip, acceptLanguage: req.headers["accept-language"] });
  }

  @Get("jobs/:id")
  get(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest): Promise<AiJob> {
    return this.jobs.get(actor, id, req.headers["accept-language"]);
  }

  /**
   * Server-sent events: `data: <AiJob JSON>` whenever the job changes, ending after
   * a terminal status. Reads the job row once a second (DN-054; move to Redis
   * pub/sub if many streams are open at once).
   */
  @Get("jobs/:id/events")
  async events(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const lang = req.headers["accept-language"];
    let job = await this.jobs.get(actor, id, lang); // 404 before any stream starts

    reply.hijack();
    const raw = reply.raw;
    // Keep headers already set by hooks (CORS, request id) when writing the stream ourselves.
    raw.writeHead(200, {
      ...(reply.getHeaders() as Record<string, string | number | string[]>),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });

    let closed = false;
    req.raw.on("close", () => {
      closed = true;
    });
    const send = (data: AiJob) => raw.write(`data: ${JSON.stringify(data)}\n\n`);
    const started = Date.now();
    let lastSent = "";
    let lastBeat = Date.now();

    try {
      while (!closed) {
        const snapshot = JSON.stringify(job);
        if (snapshot !== lastSent) {
          send(job);
          lastSent = snapshot;
        }
        if (TERMINAL_JOB_STATUSES.includes(job.status) || Date.now() - started > SSE_MAX_MS) break;
        if (Date.now() - lastBeat > SSE_HEARTBEAT_MS) {
          raw.write(": keep-alive\n\n");
          lastBeat = Date.now();
        }
        await new Promise((r) => setTimeout(r, SSE_POLL_MS));
        if (closed) break;
        job = await this.jobs.get(actor, id, lang);
      }
    } finally {
      raw.end();
    }
  }
}

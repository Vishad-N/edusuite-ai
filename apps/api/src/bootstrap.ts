import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { RequestMethod, type LoggerService, type Provider, type Type } from "@nestjs/common";
import type { FastifyBaseLogger } from "fastify";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/apiExceptionFilter";
import type { Env } from "./config/env";

/** Routes Nest's own log calls into Fastify's pino logger, so every line is JSON. */
class PinoNestLogger implements LoggerService {
  constructor(private readonly pino: FastifyBaseLogger) {}
  log(message: unknown, context?: string) { this.pino.info({ context }, String(message)); }
  error(message: unknown, _trace?: string, context?: string) { this.pino.error({ context }, String(message)); }
  warn(message: unknown, context?: string) { this.pino.warn({ context }, String(message)); }
  debug(message: unknown, context?: string) { this.pino.debug({ context }, String(message)); }
  verbose(message: unknown, context?: string) { this.pino.trace({ context }, String(message)); }
}

export async function createApp(env: Env, extraControllers: Type[] = [], overrides: Provider[] = []): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: env.LOG_LEVEL,
            // Never log credentials (AGENT_README §8).
            redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
          },
    requestIdHeader: "x-request-id",
    genReqId: () => randomUUID(),
    // Saved documents may be up to 2 MB of JSON (MAX_DOCUMENT_BYTES); leave headroom.
    bodyLimit: 3 * 1024 * 1024,
    // Behind Caddy, use X-Forwarded-For so rate limits and audit IPs are the real client's.
    trustProxy: env.TRUST_PROXY,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(env, extraControllers, overrides), adapter, {
    bufferLogs: true,
    // We register the JSON parser ourselves below (empty bodies allowed).
    bodyParser: false,
  });
  const fastify = app.getHttpAdapter().getInstance();
  if (env.NODE_ENV !== "test") app.useLogger(new PinoNestLogger(fastify.log));

  // Action routes such as POST /users/:id/block have no body, but HTTP clients
  // often still send "content-type: application/json". Fastify rejects that
  // with 400 by default; treat an empty JSON body as no body instead.
  fastify.removeContentTypeParser("application/json");
  fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    const text = typeof body === "string" ? body : body.toString("utf8");
    if (text.trim() === "") return done(null, undefined);
    try {
      done(null, JSON.parse(text));
    } catch {
      const err = new Error("Invalid JSON body") as Error & { statusCode: number };
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // The desktop app (file://, "Origin: null") and, locally, the Vite dev server call
  // the API from a page. Auth is a Bearer token, never a cookie, so no credentials mode.
  app.enableCors({
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["authorization", "content-type", "accept-language", "accept", "idempotency-key", "x-request-id"],
    credentials: false,
    maxAge: 600,
  });

  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "health", method: RequestMethod.GET },
      { path: "ready", method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  return app;
}

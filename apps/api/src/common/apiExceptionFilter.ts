import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { pickLanguage, type ApiError } from "@edusuite/shared";
import { ApiHttpException, ERROR_MESSAGES, type ErrorCode } from "./errors";

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST: return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED: return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN: return "FORBIDDEN";
    case HttpStatus.NOT_FOUND: return "NOT_FOUND";
    case HttpStatus.CONFLICT: return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS: return "TOO_MANY_REQUESTS";
    case HttpStatus.SERVICE_UNAVAILABLE: return "SERVICE_UNAVAILABLE";
    case HttpStatus.PAYLOAD_TOO_LARGE: return "DOCUMENT_TOO_LARGE";
    default: return status >= 500 ? "INTERNAL" : "BAD_REQUEST";
  }
}

/** Turns every thrown error into the shared `{ code, message, details }` shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ApiExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();
    const lang = pickLanguage(req.headers["accept-language"]);

    // Fastify's own client errors (bad JSON, body too large) carry a 4xx statusCode.
    const fastifyStatus = (exception as { statusCode?: unknown } | null)?.statusCode;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : typeof fastifyStatus === "number" && fastifyStatus >= 400 && fastifyStatus < 500
          ? fastifyStatus
          : 500;
    const code: ErrorCode = exception instanceof ApiHttpException ? exception.code : codeForStatus(status);
    const body: ApiError = { code, message: ERROR_MESSAGES[code][lang] };
    if (exception instanceof ApiHttpException && exception.details !== undefined) body.details = exception.details;

    if (status >= 500 && code !== "SERVICE_UNAVAILABLE") {
      // Log the error type and request id only; messages may contain user data.
      const name = exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(`unhandled ${name} on ${req.method} ${req.routeOptions?.url ?? "unknown"} (req ${req.id})`);
    }

    void reply.status(status).send(body);
  }
}

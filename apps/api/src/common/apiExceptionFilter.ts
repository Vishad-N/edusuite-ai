import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { pickLanguage, type ApiError, type Language } from "@edusuite/shared";

const MESSAGES: Record<string, Record<Language, string>> = {
  BAD_REQUEST: { hi: "अनुरोध सही नहीं है।", en: "The request is not valid." },
  UNAUTHORIZED: { hi: "कृपया दोबारा लॉगिन करें।", en: "Please log in again." },
  FORBIDDEN: { hi: "आपको यह करने की अनुमति नहीं है।", en: "You don't have permission to do this." },
  NOT_FOUND: { hi: "यह चीज़ नहीं मिली।", en: "Not found." },
  CONFLICT: { hi: "यह पहले से मौजूद है या बदल चुका है।", en: "This already exists or has changed." },
  TOO_MANY_REQUESTS: { hi: "बहुत ज़्यादा प्रयास। थोड़ी देर बाद कोशिश करें।", en: "Too many attempts. Try again shortly." },
  INTERNAL: { hi: "सर्वर में समस्या आई। कृपया फिर से कोशिश करें।", en: "Something went wrong on the server. Please try again." },
};

function codeFor(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST: return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED: return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN: return "FORBIDDEN";
    case HttpStatus.NOT_FOUND: return "NOT_FOUND";
    case HttpStatus.CONFLICT: return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS: return "TOO_MANY_REQUESTS";
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

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const code = codeFor(status);
    const body: ApiError = { code, message: (MESSAGES[code] ?? MESSAGES.INTERNAL!)[lang] };

    if (status >= 500) {
      // Log the error type and request id only; messages may contain user data.
      const name = exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(`unhandled ${name} on ${req.method} ${req.routeOptions?.url ?? "unknown"} (req ${req.id})`);
    }

    void reply.status(status).send(body);
  }
}

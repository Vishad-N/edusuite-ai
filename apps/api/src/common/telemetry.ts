import * as Sentry from "@sentry/node";
import type { ErrorEvent } from "@sentry/node";

/**
 * Error reporting (master prompt §4 "Sentry hooks"; DN-068). Off unless SENTRY_DSN is set.
 * What leaves the server is deliberately small (AGENT_README §8: no secrets or student PII):
 * - no request data, headers, cookies, IPs or user details, and no breadcrumbs;
 * - error messages are scrubbed of quoted values, emails and long numbers, which is where
 *   database and validation errors carry user data;
 * - context is tags only: our error code, route pattern, job type, request id.
 */
let enabled = false;

const QUOTED = /(["'`])(?:(?!\1).){1,500}\1/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const NUMBER_RUN = /\d{6,}/g;

/** Keeps the shape of a message but not the values in it. */
export function scrubMessage(message: string): string {
  return message.replace(QUOTED, "$1…$1").replace(EMAIL, "[email]").replace(NUMBER_RUN, "[number]").slice(0, 300);
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  if (event.message) event.message = scrubMessage(event.message);
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubMessage(ex.value);
  return event;
}

export function initTelemetry(opts: { dsn: string | undefined; environment: string; service: "api" | "worker"; release?: string }): boolean {
  if (!opts.dsn || enabled) return enabled;
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment,
    ...(opts.release && { release: opts.release }),
    serverName: opts.service,
    // Sentry collects all of these by default; none of it may leave the server.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
    },
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    // Only error capture: no HTTP/database instrumentation, which would attach request data.
    defaultIntegrations: false,
    integrations: [
      Sentry.dedupeIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    beforeSend: (event) => scrubEvent(event),
  });
  Sentry.setTag("service", opts.service);
  enabled = true;
  return true;
}

/** Reports an unexpected error with safe tags; does nothing when reporting is off. */
export function captureError(err: unknown, tags: Record<string, string | undefined> = {}): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    for (const [k, v] of Object.entries(tags)) if (v) scope.setTag(k, v.slice(0, 200));
    Sentry.captureException(err);
  });
}

/** Sends queued events before the process exits (tests, worker shutdown). */
export async function flushTelemetry(timeoutMs = 2000): Promise<void> {
  if (enabled) await Sentry.flush(timeoutMs);
}

// Error reporting for the desktop app (master prompt §4 "Sentry hooks"; DN-068).
// Off unless the build was given a DSN (dist/app-config.json, EDUSUITE_SENTRY_DSN).
// Runs only in the main process. The page reports screen crashes through the named
// `telemetry.report` bridge function, so there is no Sentry code or preload in the page and
// no change to the CSP. What is sent is kept small (AGENT_README §8):
// - no crash dumps, screenshots, breadcrumbs, user, device names or request data;
// - messages are scrubbed of quoted values, emails and long numbers;
// - file paths lose the Windows/macOS user folder.

const QUOTED = /(["'`])(?:(?!\1).){1,500}\1/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const NUMBER_RUN = /\d{6,}/g;
const USER_DIR = /([\\/](?:Users|home|Documents and Settings))[\\/][^\\/]+/gi;
const MAX_REPORTS_PER_RUN = 20;

function scrubMessage(message) {
  return String(message).replace(QUOTED, "$1…$1").replace(EMAIL, "[email]").replace(NUMBER_RUN, "[number]").slice(0, 300);
}

function scrubPath(p) {
  return typeof p === "string" ? p.replace(USER_DIR, "$1/~") : p;
}

function scrubEvent(event) {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.server_name;
  if (event.message) event.message = scrubMessage(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubMessage(ex.value);
    for (const frame of ex.stacktrace?.frames ?? []) {
      frame.filename = scrubPath(frame.filename);
      frame.abs_path = scrubPath(frame.abs_path);
      delete frame.vars;
      delete frame.pre_context;
      delete frame.context_line;
      delete frame.post_context;
    }
  }
  return event;
}

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

/**
 * @param {{ dsn?: string, release: string, environment: string, loadSentry?: () => any }} opts
 * loadSentry is for tests; the real SDK is only loaded when a DSN is set.
 */
function createTelemetry({ dsn, release, environment, loadSentry = () => require("@sentry/electron/main") }) {
  if (!dsn) return { enabled: false, report: () => false, captureError: () => {}, flush: async () => {} };

  const Sentry = loadSentry();
  Sentry.init({
    dsn,
    release,
    environment,
    // Plain error capture only. The SDK's defaults would also upload native crash dumps
    // (process memory), take screenshots and inject a preload into every session.
    defaultIntegrations: false,
    integrations: [
      Sentry.dedupeIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.normalizePathsIntegration(),
    ],
    // Classic IPC only: no privileged sentry-ipc:// scheme. Our preload never exposes those
    // channels, so the page can't reach them either.
    ipcMode: 1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
    },
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
  Sentry.setTag("service", "desktop");

  let sent = 0;
  const captureError = (err, tags = {}) => {
    Sentry.withScope((scope) => {
      for (const [k, v] of Object.entries(tags)) if (v) scope.setTag(k, String(v).slice(0, 200));
      Sentry.captureException(err);
    });
  };

  /** A crash reported by the page: { name, message, stack, screen }. Returns whether it was sent. */
  const report = (payload) => {
    if (!payload || typeof payload !== "object" || sent >= MAX_REPORTS_PER_RUN) return false;
    const err = new Error(clip(payload.message, 1000) || "renderer error");
    err.name = clip(payload.name, 100) || "Error";
    err.stack = clip(payload.stack, 8000) || `${err.name}: ${err.message}`;
    const screen = /^[a-z_]{1,40}$/.test(String(payload.screen)) ? payload.screen : undefined;
    sent += 1;
    captureError(err, { source: "renderer", screen });
    return true;
  };

  return { enabled: true, report, captureError, flush: (ms = 2000) => Sentry.flush(ms) };
}

module.exports = { createTelemetry, scrubEvent, scrubMessage, scrubPath, MAX_REPORTS_PER_RUN };

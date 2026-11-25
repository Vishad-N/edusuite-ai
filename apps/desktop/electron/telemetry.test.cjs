// node --test electron/telemetry.test.cjs (DN-068)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTelemetry, scrubEvent, MAX_REPORTS_PER_RUN } = require("./telemetry.cjs");

function fakeSentry() {
  const calls = { init: null, captured: [], tags: {} };
  const integration = (name) => () => ({ name });
  const scope = { tags: {}, setTag(k, v) { this.tags[k] = v; } };
  return {
    calls,
    init: (o) => (calls.init = o),
    setTag: (k, v) => (calls.tags[k] = v),
    withScope: (fn) => {
      scope.tags = {};
      fn(scope);
    },
    captureException: (err) => calls.captured.push({ err, tags: { ...scope.tags } }),
    flush: async () => true,
    dedupeIntegration: integration("Dedupe"),
    linkedErrorsIntegration: integration("LinkedErrors"),
    onUncaughtExceptionIntegration: integration("OnUncaughtException"),
    onUnhandledRejectionIntegration: integration("OnUnhandledRejection"),
    normalizePathsIntegration: integration("NormalizePaths"),
  };
}

test("no DSN: the SDK is never loaded and reports do nothing", () => {
  let loaded = false;
  const t = createTelemetry({ dsn: undefined, release: "r", environment: "e", loadSentry: () => (loaded = true) });
  assert.equal(t.enabled, false);
  assert.equal(t.report({ name: "Error", message: "x", stack: "" }), false);
  assert.equal(loaded, false);
});

test("with a DSN: only plain error capture, no crash dumps, screenshots or injected preload", () => {
  const S = fakeSentry();
  const t = createTelemetry({ dsn: "https://k@example.invalid/1", release: "edusuite-desktop@1.0.0", environment: "production", loadSentry: () => S });
  assert.equal(t.enabled, true);
  const o = S.calls.init;
  assert.equal(o.defaultIntegrations, false);
  assert.deepEqual(o.integrations.map((i) => i.name), ["Dedupe", "LinkedErrors", "OnUncaughtException", "OnUnhandledRejection", "NormalizePaths"]);
  assert.equal(o.ipcMode, 1, "classic IPC only, no privileged scheme");
  assert.equal(o.dataCollection.userInfo, false);
  assert.equal(o.maxBreadcrumbs, 0);
  assert.equal(S.calls.tags.service, "desktop");
});

test("renderer reports: clipped, tagged by screen, capped per run", () => {
  const S = fakeSentry();
  const t = createTelemetry({ dsn: "https://k@example.invalid/1", release: "r", environment: "e", loadSentry: () => S });
  assert.equal(t.report({ name: "TypeError", message: "x is undefined", stack: "TypeError: x is undefined\n    at a (app:///dist/assets/index.js:1:2)", screen: "ppt" }), true);
  const first = S.calls.captured[0];
  assert.equal(first.err.name, "TypeError");
  assert.deepEqual(first.tags, { source: "renderer", screen: "ppt" });
  t.report({ name: "E", message: "m", stack: "s", screen: "../etc" });
  assert.equal(S.calls.captured[1].tags.screen, undefined, "odd screen names are dropped");
  assert.equal(t.report(null), false);
  assert.equal(t.report("text"), false);
  while (t.report({ message: "again" }));
  assert.equal(S.calls.captured.length, MAX_REPORTS_PER_RUN);
});

test("scrubEvent drops personal data and the user folder from paths", () => {
  const ev = scrubEvent({
    request: { url: "x" },
    user: { id: "1" },
    breadcrumbs: [{}],
    extra: { a: 1 },
    server_name: "OFFICE-PC-RAMESH",
    exception: {
      values: [
        {
          value: 'Cannot save "Ramesh Kumar" (ramesh@example.com) 9876543210',
          stacktrace: {
            frames: [{ filename: "C:\\Users\\ramesh\\AppData\\Local\\Programs\\EduSuite AI\\resources\\app.asar\\electron\\main.cjs", abs_path: "/Users/ramesh/app/main.cjs", vars: { password: "x" }, context_line: "secret" }],
          },
        },
      ],
    },
  });
  const raw = JSON.stringify(ev);
  for (const s of ["Ramesh Kumar", "ramesh@example.com", "9876543210", "OFFICE-PC", "ramesh", "password", "secret"]) assert.ok(!raw.includes(s), `leaked ${s}`);
  assert.equal(ev.exception.values[0].value, 'Cannot save "…" ([email]) [number]');
  assert.match(ev.exception.values[0].stacktrace.frames[0].filename, /\\Users\/~\\AppData/);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createUpdater } = require("./updates.cjs");

function fakeUpdater() {
  const u = new EventEmitter();
  u.checks = 0;
  u.installed = null;
  u.checkForUpdates = async () => {
    u.checks++;
  };
  u.quitAndInstall = (silent, run) => {
    u.installed = { silent, run };
  };
  return u;
}
const quietLog = { info() {}, warn() {} };
const fakeTimers = () => {
  const t = { fn: null, ms: null, cleared: false };
  return { t, timers: { setInterval: (fn, ms) => ((t.fn = fn), (t.ms = ms), 1), clearInterval: () => (t.cleared = true) } };
};

test("disabled in development: nothing is checked and install does nothing", () => {
  const u = fakeUpdater();
  const up = createUpdater({ autoUpdater: u, enabled: false, onChange() {}, log: quietLog });
  up.start();
  assert.equal(u.checks, 0);
  assert.deepEqual(up.status(), { state: "not-configured" });
  assert.equal(up.install(), false);
});

test("checks at start and every 4 hours; download progress then ready; install restarts", async () => {
  const u = fakeUpdater();
  const seen = [];
  const { t, timers } = fakeTimers();
  const up = createUpdater({ autoUpdater: u, enabled: true, onChange: (s) => seen.push(s.state), log: quietLog, timers });
  up.start();
  up.start();
  assert.equal(u.checks, 1, "one check at start, not two");
  assert.equal(t.ms, 4 * 60 * 60 * 1000);
  assert.equal(u.autoDownload, true);
  assert.equal(u.autoInstallOnAppQuit, true);

  u.emit("checking-for-update");
  u.emit("update-available", { version: "1.1.0" });
  u.emit("download-progress", { percent: 42.6 });
  assert.deepEqual(up.status(), { state: "downloading", version: "1.1.0", percent: 43 });
  assert.equal(up.install(), false, "not before the download finishes");
  u.emit("update-downloaded", { version: "1.1.0" });
  assert.deepEqual(up.status(), { state: "ready", version: "1.1.0" });

  // Later checks and errors don't hide a ready update.
  t.fn();
  u.emit("checking-for-update");
  u.emit("error", new Error("offline"));
  u.emit("update-not-available");
  assert.equal(up.status().state, "ready");
  assert.deepEqual(seen, ["checking", "downloading", "downloading", "ready"]);

  assert.equal(up.install(), true);
  assert.deepEqual(u.installed, { silent: true, run: true });
  up.stop();
  assert.equal(t.cleared, true);
});

test("offline or a broken feed only logs and shows an error state", () => {
  const u = fakeUpdater();
  const warnings = [];
  const up = createUpdater({ autoUpdater: u, enabled: true, onChange() {}, log: { info() {}, warn: (m) => warnings.push(m) }, timers: fakeTimers().timers });
  u.emit("error", new Error("net::ERR_INTERNET_DISCONNECTED"));
  assert.equal(up.status().state, "error");
  assert.match(warnings[0], /ERR_INTERNET_DISCONNECTED/);
  u.emit("update-not-available");
  assert.equal(up.status().state, "up-to-date");
});

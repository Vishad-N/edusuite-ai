// Auto-update (plan §10, Phase 6; DN-062). electron-updater checks the update feed
// at start and every 4 hours, downloads in the background, and the app offers
// "restart to update". Kept free of Electron imports so it can be unit-tested.

const FOUR_HOURS = 4 * 60 * 60 * 1000;

/**
 * @param {object} o
 * @param {import("node:events").EventEmitter & { checkForUpdates(): Promise<unknown>, quitAndInstall(silent?: boolean, forceRunAfter?: boolean): void, autoDownload: boolean, autoInstallOnAppQuit: boolean, logger?: unknown }} o.autoUpdater
 * @param {boolean} o.enabled  false in development, smoke runs and unsupported platforms
 * @param {(status: object) => void} o.onChange  pushes the status to the window
 * @param {{ info(msg: string): void, warn(msg: string): void }} [o.log]
 * @param {number} [o.intervalMs]
 * @param {{ setInterval: typeof setInterval, clearInterval: typeof clearInterval }} [o.timers]
 */
function createUpdater({ autoUpdater, enabled, onChange, log = console, intervalMs = FOUR_HOURS, timers = { setInterval, clearInterval } }) {
  let status = enabled ? { state: "idle" } : { state: "not-configured" };
  let timer = null;
  const set = (next) => {
    status = next;
    onChange(status);
  };

  if (enabled) {
    autoUpdater.autoDownload = true;
    // A downloaded update also installs when staff close the app normally.
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("checking-for-update", () => {
      if (status.state !== "ready" && status.state !== "downloading") set({ state: "checking" });
    });
    autoUpdater.on("update-not-available", () => {
      if (status.state !== "ready") set({ state: "up-to-date", checkedAt: new Date().toISOString() });
    });
    autoUpdater.on("update-available", (info) => set({ state: "downloading", version: info?.version ?? null, percent: 0 }));
    autoUpdater.on("download-progress", (p) => {
      if (status.state === "downloading") set({ ...status, percent: Math.max(0, Math.min(100, Math.round(p?.percent ?? 0))) });
    });
    autoUpdater.on("update-downloaded", (info) => set({ state: "ready", version: info?.version ?? null }));
    autoUpdater.on("error", (err) => {
      // A failed check (offline, feed down) is not the staff's problem: log it and try again later.
      log.warn(`update check failed: ${err && err.message ? err.message : String(err)}`);
      if (status.state !== "ready") set({ state: "error" });
    });
  }

  const check = () => {
    if (!enabled) return;
    autoUpdater.checkForUpdates().catch((err) => log.warn(`update check failed: ${err && err.message ? err.message : String(err)}`));
  };

  return {
    status: () => status,
    start() {
      if (!enabled || timer) return;
      check();
      timer = timers.setInterval(check, intervalMs);
    },
    stop() {
      if (timer) timers.clearInterval(timer);
      timer = null;
    },
    /** Only when an update is downloaded; restarts into the new version. */
    install() {
      if (status.state !== "ready") return false;
      autoUpdater.quitAndInstall(true, true);
      return true;
    },
  };
}

module.exports = { createUpdater, FOUR_HOURS };

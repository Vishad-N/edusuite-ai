// Electron main process, hardened per plan §10 and AGENT_README §7 (DN-036).
const { app, BrowserWindow, dialog, ipcMain, protocol, safeStorage, session } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  MOTION_ORIGIN,
  MOTION_SCHEME,
  buildMotionCsp,
  isAllowedNavigation,
  isAllowedPermission,
  resolveApiOrigin,
} = require("./security.cjs");
const { createTokenVault } = require("./tokenVault.cjs");
const { createUpdater } = require("./updates.cjs");

const DIST_INDEX = path.join(__dirname, "../dist/index.html");
// Development only: load Vite's dev server instead of the built files.
const DEV_SERVER_URL = !app.isPackaged ? process.env.ELECTRON_DEV_SERVER_URL : undefined;
// The API address is fixed at build time (dist/app-config.json, written by vite.config.js from
// EDUSUITE_API_URL; DN-062). An env override is honoured only when not packaged.
const API_ORIGIN = resolveApiOrigin((!app.isPackaged && process.env.EDUSUITE_API_URL) || readBuildConfig().apiOrigin, "http://localhost:3000");

function readBuildConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "../dist/app-config.json"), "utf8"));
  } catch {
    return {};
  }
}

// The motion player gets its own origin (DN-036). Registered before app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: MOTION_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false } },
]);

// One running copy only: a second double-click focuses the open window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
const motionDocs = new Map();
/** @type {ReturnType<typeof createUpdater> | null} */
let updater = null;

function appUrl() {
  return DEV_SERVER_URL ?? `file://${DIST_INDEX.replace(/\\/g, "/")}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#0f172a", symbolColor: "#94a3b8", height: 40 },
    icon: path.join(__dirname, "../public/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
      spellcheck: false,
    },
  });

  const contents = mainWindow.webContents;
  const navOptions = { appUrl: appUrl(), dev: Boolean(DEV_SERVER_URL), devServerOrigin: DEV_SERVER_URL };

  // No navigating away from the app, no new windows, no webviews.
  contents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url, navOptions)) event.preventDefault();
  });
  contents.on("will-redirect", (event, url) => {
    if (!isAllowedNavigation(url, navOptions)) event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-attach-webview", (event) => event.preventDefault());

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else if (fs.existsSync(DIST_INDEX)) {
    mainWindow.loadFile(DIST_INDEX);
  } else {
    dialog.showErrorBox("EduSuite", "The app files are missing. Please reinstall EduSuite.");
    app.quit();
  }

  if (process.env.EDUSUITE_SMOKE === "1") runSmokeCheck(contents);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpc() {
  const vault = createTokenVault({ safeStorage, dir: app.getPath("userData") });
  const fromMainWindow = (event) => mainWindow && event.sender === mainWindow.webContents;
  const handle = (channel, fn) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (!fromMainWindow(event)) throw new Error("not allowed");
      return fn(event, ...args);
    });

  handle("app:version", () => app.getVersion());
  handle("app:config", () => ({ apiBaseUrl: `${API_ORIGIN}/api/v1`, platform: process.platform }));
  handle("update:status", () => (updater ? updater.status() : { state: "not-configured" }));
  handle("update:install", () => (updater ? updater.install() : false));

  handle("auth:getToken", () => vault.get());
  handle("auth:setToken", (_e, token) => vault.set(token));
  handle("auth:clearToken", () => vault.clear());

  // Prints the current page to PDF (uses the app's print CSS) and asks where to save it.
  handle("print:toPdf", async (_e, suggestedName) => {
    const pdf = await mainWindow.webContents.printToPDF({ printBackground: true, pageSize: "A4" });
    return saveWithDialog(pdf, safeName(suggestedName, "document"), [{ name: "PDF", extensions: ["pdf"] }]);
  });

  // Saves bytes produced in the page (PPTX, motion HTML, PNG) through a native dialog.
  handle("file:saveAs", async (_e, { suggestedName, data }) => {
    if (!(data instanceof Uint8Array) || data.byteLength > 200 * 1024 * 1024) throw new Error("invalid file");
    const ext = path.extname(String(suggestedName)).slice(1).toLowerCase();
    const allowed = ["pptx", "pdf", "html", "png", "jpg", "txt", "csv"];
    if (!allowed.includes(ext)) throw new Error("file type not allowed");
    return saveWithDialog(Buffer.from(data), safeName(suggestedName, "file"), [{ name: ext.toUpperCase(), extensions: [ext] }]);
  });

  // Motion player: keep the generated HTML in memory and serve it from the isolated origin.
  handle("motion:open", (_e, html) => {
    if (typeof html !== "string" || html.length > 60 * 1024 * 1024) throw new Error("invalid document");
    const id = crypto.randomUUID();
    motionDocs.set(id, html);
    while (motionDocs.size > 3) motionDocs.delete(motionDocs.keys().next().value);
    return `${MOTION_ORIGIN}/${id}`;
  });
}

async function saveWithDialog(buffer, defaultPath, filters) {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath, filters });
  if (canceled || !filePath) return { saved: false };
  await fs.promises.writeFile(filePath, buffer);
  return { saved: true, fileName: path.basename(filePath) };
}

/** Keeps only safe characters (Devanagari included) and drops any folder part. */
function safeName(name, fallback) {
  const base = path.basename(String(name || fallback));
  return base.replace(/[^\p{L}\p{N}\p{M} ._()-]/gu, "_").slice(0, 120) || fallback;
}

function hardenSession() {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(isAllowedPermission(permission)),
  );
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => isAllowedPermission(permission));

  protocol.handle(MOTION_SCHEME, (request) => {
    const id = new URL(request.url).pathname.slice(1);
    const html = motionDocs.get(id);
    if (!html) return new Response("Not found", { status: 404 });
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": buildMotionCsp() },
    });
  });
}

/** EDUSUITE_SMOKE=1: print the security state of the loaded page as JSON, then quit. */
function runSmokeCheck(contents) {
  contents.once("did-finish-load", async () => {
    try {
      const page = await contents.executeJavaScript(`({
        bridge: typeof window.edusuite === "object" && Object.keys(window.edusuite).sort(),
        requireAvailable: typeof require !== "undefined",
        processAvailable: typeof process !== "undefined",
        csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? null,
        lang: document.documentElement.lang,
      })`);
      const prefs = contents.getLastWebPreferences();
      const evil = await contents
        .executeJavaScript(`fetch("https://example.com/").then(() => "reached", () => "blocked")`)
        .catch(() => "blocked");
      // Token vault round trip through the preload bridge.
      const vault = await contents.executeJavaScript(`(async () => {
        const t = "smoke-test-token-" + "x".repeat(20);
        await window.edusuite.auth.setToken(t);
        const back = await window.edusuite.auth.getToken();
        await window.edusuite.auth.clearToken();
        return { roundTrip: back === t, clearedTo: await window.edusuite.auth.getToken() };
      })()`);
      const loginHeading = await contents.executeJavaScript(`document.querySelector("h1")?.textContent ?? null`);
      // Motion player on its isolated origin: scripts run, network doesn't.
      const motionUrl = await contents.executeJavaScript(`(async () => {
        const url = await window.edusuite.motion.open('<!doctype html><title>t</title><script>document.title = "ran"; fetch("https://example.com/").then(() => { document.title = "net-reached" }, () => { document.title = "net-blocked" });<\\/script>');
        const f = document.createElement("iframe");
        f.sandbox = "allow-scripts";
        f.src = url;
        document.body.appendChild(f);
        return url;
      })()`);
      await new Promise((r) => setTimeout(r, 1500));
      const frame = contents.mainFrame.frames.find((f) => f.url.startsWith(MOTION_ORIGIN));
      const motionTitle = frame ? await frame.executeJavaScript("document.title") : "frame-missing";
      console.log(
        JSON.stringify({
          ...page,
          sandbox: prefs.sandbox,
          contextIsolation: prefs.contextIsolation,
          nodeIntegration: prefs.nodeIntegration,
          webSecurity: prefs.webSecurity,
          externalFetch: evil,
          vault,
          vaultEncrypted: safeStorage.isEncryptionAvailable(),
          loginHeading,
          motionOrigin: motionUrl.startsWith(MOTION_ORIGIN),
          motionPlayer: motionTitle,
          packaged: app.isPackaged,
        }),
      );
    } finally {
      app.quit();
    }
  });
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  hardenSession();
  registerIpc();
  createWindow();
  startUpdates();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** Auto-update only in the installed app (DN-062); never in development or smoke runs. */
function startUpdates() {
  const enabled = app.isPackaged && process.env.EDUSUITE_SMOKE !== "1" && (process.platform === "win32" || process.platform === "darwin");
  let autoUpdater = null;
  if (enabled) {
    try {
      ({ autoUpdater } = require("electron-updater"));
    } catch (err) {
      console.warn("electron-updater unavailable", err);
    }
  }
  updater = createUpdater({
    autoUpdater,
    enabled: enabled && autoUpdater !== null,
    onChange: (status) => mainWindow?.webContents.send("update:changed", status),
  });
  updater.start();
}

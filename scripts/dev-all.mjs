// npm run dev:all (master prompt §4): one command for local development on Windows (DN-065).
// 1. starts the Docker stack (Postgres, Redis, Garage, API, AI worker) and waits for /ready,
// 2. starts the Vite dev server for the desktop UI,
// 3. opens Electron on it (hot reload), pointed at http://localhost:3000.
// Ctrl+C stops Vite and Electron; the stack keeps running (npm run stack:down stops it).
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const API = process.env.EDUSUITE_API_URL ?? "http://localhost:3000";
const VITE = "http://localhost:5173";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(url, label, ms) {
  for (let t = 0; t < ms; t += 1000) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await wait(1000);
  }
  throw new Error(`${label} didn't come up at ${url} within ${ms / 1000} s`);
}

if (!existsSync(join(root, "infra", ".env.local"))) {
  console.error("infra/.env.local is missing. Run `npm run stack:env` and `npm run stack:init` first (docs/runbooks/local-testing.md).");
  process.exit(1);
}

console.log("1/3 Starting the Docker stack…");
const up = spawnSync(npm, ["run", "stack:up"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (up.status !== 0) {
  console.error("The stack didn't start. Is Docker Desktop running?");
  process.exit(up.status ?? 1);
}
await until(`${API}/ready`, "The API", 120_000);
console.log("    API ready.");

console.log("2/3 Starting the Vite dev server…");
const children = [];
const vite = spawn(npm, ["run", "dev"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
children.push(vite);
await until(VITE, "Vite", 60_000);

console.log("3/3 Opening Electron (hot reload)…");
const electron = spawn(join(root, "node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron"), ["."], {
  cwd: join(root, "apps", "desktop"),
  stdio: "inherit",
  env: { ...process.env, ELECTRON_DEV_SERVER_URL: VITE, EDUSUITE_API_URL: API },
});
children.push(electron);

const stop = () => {
  for (const c of children) c.kill();
  process.exit(0);
};
electron.on("exit", stop);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

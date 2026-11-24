// npm run dist:nsis:local (master prompt §4): an unsigned test installer for this PC (DN-065).
// Points at the local API (http://localhost:3000) unless EDUSUITE_API_URL says otherwise, and
// never publishes. Output: apps/desktop/release-local/EduSuite-AI-Setup-<version>.exe
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const shell = process.platform === "win32";
const env = { ...process.env, EDUSUITE_API_URL: process.env.EDUSUITE_API_URL ?? "http://localhost:3000" };
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build", "-w", "@edusuite/desktop"], root);
// Updates are off for a local test build: the feed URL is a placeholder that never answers.
run("npx", ["electron-builder", "--win", "nsis", "--publish", "never", "-c.directories.output=release-local"], join(root, "apps", "desktop"));
console.log(`\nInstaller: ${join(root, "apps", "desktop", "release-local")} (unsigned; for testing on this PC only)`);

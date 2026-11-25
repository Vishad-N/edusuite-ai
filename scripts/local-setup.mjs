// npm run local:setup: first-time local setup in one go (LOCAL_TESTING.md).
// 1. infra/.env.local with random secrets (kept if it exists)
// 2. builds and starts the Docker stack
// 3. sets up Garage storage (layout, key, bucket)
// 4. waits for /ready
// 5. loads the demo data (institute, branches, one user per role, credits)
// 6. builds the desktop app
// Safe to run again: every step leaves existing data in place.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const API = process.env.EDUSUITE_API_URL ?? "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function step(n, label, script) {
  console.log(`\n[${n}/6] ${label}`);
  const r = spawnSync(`npm run ${script}`, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\nStep ${n} failed. Run "npm run local:check" to see what's wrong (LOCAL_TESTING.md, "When something goes wrong").`);
    process.exit(r.status ?? 1);
  }
}

step(1, "Local config (infra/.env.local)", "stack:env");
step(2, "Docker stack: Postgres, Redis, Garage, migrations, API, AI worker (first time: several minutes)", "stack:up");
step(3, "Storage setup", "stack:init");

console.log("\n[4/6] Waiting for the API…");
let ready = false;
for (let t = 0; t < 180 && !ready; t += 2) {
  try {
    ready = (await fetch(`${API}/ready`)).ok;
  } catch {
    // not up yet
  }
  if (!ready) await wait(2000);
}
if (!ready) {
  console.error(`The API at ${API} didn't become ready in 3 minutes. Check: npm run stack:logs`);
  process.exit(1);
}
console.log("      API ready.");

step(5, "Demo data", "db:seed");
step(6, "Desktop app build", "build");
console.log("\nDone. Open the app with:  npm run electron:dev\nLogins are in apps/api/src/scripts/seed.ts (local testing only).");

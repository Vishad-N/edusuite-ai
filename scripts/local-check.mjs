// npm run local:check: is this PC ready to run EduSuite locally? (LOCAL_TESTING.md)
// Checks Node, Docker, free disk, infra/.env.local and the API's /ready. Prints no secrets.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statfsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const API = process.env.EDUSUITE_API_URL ?? "http://localhost:3000";
let problems = 0;
const ok = (msg) => console.log(`  OK    ${msg}`);
const warn = (msg) => console.log(`  WARN  ${msg}`);
const bad = (msg, fix) => {
  problems += 1;
  console.log(`  FAIL  ${msg}${fix ? `\n        → ${fix}` : ""}`);
};

console.log("EduSuite local check\n");

// Node 26 (DN-022).
const major = Number(process.versions.node.split(".")[0]);
if (major >= 26) ok(`Node ${process.versions.node}`);
else bad(`Node ${process.versions.node} (needs 26)`, "install Node.js 26 LTS");

// Docker engine.
const docker = spawnSync("docker info --format \"{{.ServerVersion}}\"", { encoding: "utf8", shell: true });
if (docker.status === 0) ok(`Docker ${docker.stdout.trim()}`);
else bad("Docker isn't running", "start Docker Desktop and wait until it says \"Engine running\"");

// Free disk: Docker's disk turns read-only when the drive fills up.
try {
  const s = statfsSync(root);
  const freeGb = (s.bavail * s.bsize) / 1024 ** 3;
  if (freeGb < 2) bad(`only ${freeGb.toFixed(1)} GB free on this drive`, "free at least 5 GB; Docker fails with \"read-only file system\" when the disk is full");
  else if (freeGb < 5) warn(`${freeGb.toFixed(1)} GB free on this drive (5 GB or more is safer)`);
  else ok(`${freeGb.toFixed(0)} GB free on this drive`);
} catch {
  warn("couldn't read free disk space");
}

// Local config.
const envPath = join(root, "infra", ".env.local");
if (!existsSync(envPath)) {
  bad("infra/.env.local is missing", "npm run stack:env (or npm run local:setup)");
} else {
  const env = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
  ok("infra/.env.local exists");
  const mode = env.AI_MODE || "fixture";
  const hasKey = Boolean(env.ANTHROPIC_API_KEY);
  if (mode === "fixture") ok(`AI_MODE=fixture (sample answers, no Claude key needed)${hasKey ? "; a key is set but unused" : ""}`);
  else if (hasKey) ok(`AI_MODE=${mode} with an Anthropic key set (real Claude calls cost money)`);
  else bad(`AI_MODE=${mode} but ANTHROPIC_API_KEY is empty`, "add your key to infra/.env.local or set AI_MODE=fixture, then npm run stack:up");
  if (!env.UPDATES_DOMAIN) bad("UPDATES_DOMAIN is missing from infra/.env.local", "add the line UPDATES_DOMAIN=updates.example.com");
  ok(`error reporting ${env.SENTRY_DSN ? "on (SENTRY_DSN set)" : "off (no SENTRY_DSN; that's fine locally)"}`);
}

// API health.
try {
  const res = await fetch(`${API}/ready`, { signal: AbortSignal.timeout(5000) });
  const body = await res.json().catch(() => ({}));
  const parts = Object.entries(body.checks ?? body).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k} ${v}`).join(", ");
  if (res.ok) ok(`API ready at ${API} (${parts})`);
  else bad(`API at ${API} answers ${res.status} (${parts})`, parts.includes("storage") ? "npm run stack:init" : "npm run stack:logs");
} catch {
  bad(`API not reachable at ${API}`, "npm run stack:up (first time: npm run local:setup)");
}

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good. Open the app with: npm run electron:dev");
process.exit(problems ? 1 : 0);

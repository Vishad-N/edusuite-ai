// One-time Garage setup for a single-node install (DN-027). Safe to run again:
// each step checks whether it is already done.
//   1. assign this node a storage role and apply the layout
//   2. import the access key from the env file
//   3. create the bucket and give the key read/write access
//
// Usage: npm run stack:init   (local)
//        ENV_FILE=infra/.env node infra/scripts/garage-init.mjs   (VPS)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFile = process.env.ENV_FILE ?? "infra/.env.local";
const composeFiles = (process.env.COMPOSE_FILES ?? "infra/docker-compose.yml,infra/docker-compose.local.yml").split(",");

const env = Object.fromEntries(
  readFileSync(join(root, envFile), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);
for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
  if (!env[key] || env[key].includes("<")) throw new Error(`${key} is missing in ${envFile}`);
}

const KEY_NAME = "edusuite-app";
const CAPACITY = process.env.GARAGE_CAPACITY ?? "10G";

/** Runs the Garage CLI inside the running container (the image has no shell). */
function garage(...args) {
  const compose = composeFiles.flatMap((f) => ["-f", f]);
  return execFileSync(
    "docker",
    ["compose", ...compose, "--env-file", envFile, "exec", "-T", "garage", "/garage", ...args],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

function succeeds(...args) {
  try {
    garage(...args);
    return true;
  } catch {
    return false;
  }
}

// 1. Layout
const nodeId = garage("node", "id", "-q").trim().split("@")[0];
if (!nodeId) throw new Error("Could not read the Garage node id; is the garage container running?");
if (garage("status").includes("NO ROLE ASSIGNED")) {
  const layout = garage("layout", "show");
  const current = Number(/Current cluster layout version:\s*(\d+)/.exec(layout)?.[1] ?? 0);
  garage("layout", "assign", "-z", "dc1", "-c", CAPACITY, nodeId);
  garage("layout", "apply", "--version", String(current + 1));
  console.log(`Layout applied (version ${current + 1}, capacity ${CAPACITY}).`);
} else {
  console.log("Layout already set.");
}

// 2. Access key (imported so it matches the env file; the secret is never printed)
if (succeeds("key", "info", env.S3_ACCESS_KEY_ID)) {
  console.log("Access key already present.");
} else {
  garage("key", "import", "--yes", "-n", KEY_NAME, env.S3_ACCESS_KEY_ID, env.S3_SECRET_ACCESS_KEY);
  console.log("Access key imported.");
}

// 3. Bucket and permissions
if (succeeds("bucket", "info", env.S3_BUCKET)) {
  console.log(`Bucket ${env.S3_BUCKET} already exists.`);
} else {
  garage("bucket", "create", env.S3_BUCKET);
  console.log(`Bucket ${env.S3_BUCKET} created.`);
}
garage("bucket", "allow", "--read", "--write", "--owner", env.S3_BUCKET, "--key", env.S3_ACCESS_KEY_ID);
console.log("Key has read/write access to the bucket. Garage is ready.");

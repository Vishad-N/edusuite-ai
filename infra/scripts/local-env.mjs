// Creates infra/.env.local from infra/.env.example with fresh random secrets.
// Usage: npm run stack:env   (refuses to overwrite an existing .env.local)
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const infra = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(infra, ".env.local");

if (existsSync(target)) {
  console.log("infra/.env.local already exists; leaving it unchanged.");
  process.exit(0);
}

const hex = (bytes) => randomBytes(bytes).toString("hex");
const values = {
  POSTGRES_PASSWORD: hex(24),
  JWT_SECRET: hex(32),
  GARAGE_RPC_SECRET: hex(32),
  GARAGE_ADMIN_TOKEN: hex(32),
  S3_ACCESS_KEY_ID: `GK${hex(12)}`,
  S3_SECRET_ACCESS_KEY: hex(32),
  RESTIC_PASSWORD: hex(32),
};

let text = readFileSync(join(infra, ".env.example"), "utf8");
for (const [key, value] of Object.entries(values)) {
  text = text.replace(`${key}=<generate>`, `${key}=${value}`);
}
text = text.replace("<POSTGRES_PASSWORD>", values.POSTGRES_PASSWORD);

if (text.includes("<generate>")) throw new Error("A <generate> placeholder was left unfilled");
writeFileSync(target, text, { mode: 0o600 });
// Print only that it worked, never the secrets.
console.log("Created infra/.env.local with new random secrets.");

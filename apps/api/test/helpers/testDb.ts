import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

/**
 * A real, disposable Postgres database for API tests (AGENT_README §7).
 *
 * - CI sets DATABASE_URL_TEST.
 * - Locally it defaults to an `edusuite_test` database on the same server as
 *   DATABASE_URL (the Docker stack), so seeded local data is never touched.
 * - If neither is set the DB tests are skipped, unless REQUIRE_DB_TESTS=1
 *   (set in CI), which turns a missing database into a failure.
 */
export function testDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  if (!process.env.DATABASE_URL) return undefined;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = "/edusuite_test";
  return url.toString();
}

export function dbTestsSkipReason(): string | false {
  if (testDatabaseUrl()) return false;
  if (process.env.REQUIRE_DB_TESTS === "1") throw new Error("REQUIRE_DB_TESTS=1 but no DATABASE_URL_TEST is set");
  return "no test database configured (start the stack with `npm run stack:up`)";
}

export function client(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/** Creates the test database if needed, applies all migrations, and empties every table. */
export async function prepareTestDatabase(url: string): Promise<PrismaClient> {
  const target = new URL(url);
  const name = target.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Unsafe test database name: ${name}`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const adminDb = client(admin.toString());
  try {
    const exists = await adminDb.$queryRaw<Array<{ one: number }>>`SELECT 1 AS one FROM pg_database WHERE datname = ${name}`;
    if (exists.length === 0) await adminDb.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await adminDb.$disconnect();
  }

  const apiDir = join(__dirname, "..", "..", "..");
  const prismaCli = require.resolve("prisma/build/index.js", { paths: [apiDir] });
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });

  const db = client(url);
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
    await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  }
  return db;
}

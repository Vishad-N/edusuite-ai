import { z } from "zod";

/**
 * Environment variables, validated once at startup.
 * In production every service URL is required; locally they may be missing,
 * and /ready then reports that dependency as "not_configured".
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("127.0.0.1"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    DATABASE_URL: z.string().url().optional(),
    REDIS_URL: z.string().url().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    /**
     * The storage address the desktop app can reach (presigned links are signed
     * for this host): http://localhost:3900 locally, https://files.<domain> on the VPS.
     */
    S3_PUBLIC_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default("garage"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    /** HS256 key for access tokens; at least 32 characters of random data. */
    JWT_SECRET: z.string().min(32).optional(),
    /** Set to "true" behind Caddy so request IPs (rate limits, audit log) are the client's. */
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    /** Login attempts allowed per IP per minute (plan §09). */
    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
    /**
     * AI (Phase 4, DN-054). `fixture` replays recorded or sample answers and never
     * calls Claude (DN-012); `record` calls Claude and saves each answer as a fixture;
     * `live` calls Claude. Production must be `live`.
     */
    AI_MODE: z.enum(["fixture", "record", "live"]).default("fixture"),
    /** The Claude API key; only the worker needs it (it checks at startup). Never sent to the desktop app. */
    ANTHROPIC_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(10).optional()),
    /** Default model for every job type (the plan's default, claude-opus-5-5). */
    AI_MODEL: z.string().default("claude-opus-5-5"),
    /** Jobs one worker runs at the same time. */
    AI_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
    /** Where recorded fixtures live: <dir>/<jobType>/<sha256 of input>.json */
    AI_FIXTURES_DIR: z.string().default("fixtures/ai"),
    /**
     * Origins allowed to call the API from a page (CORS), comma-separated.
     * The packaged desktop app loads from file:// and sends "Origin: null" (DN-037).
     */
    CORS_ORIGINS: z
      .string()
      .default("null")
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    // DN-012: fixture (and record) mode is refused in production.
    if (env.AI_MODE !== "live") ctx.addIssue({ code: "custom", path: ["AI_MODE"], message: "must be live in production" });
    for (const key of [
      "DATABASE_URL",
      "REDIS_URL",
      "S3_ENDPOINT",
      "JWT_SECRET",
      "S3_PUBLIC_ENDPOINT",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "required in production" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    // Print only the variable names that failed, never their values (they may hold secrets).
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment: ${names}`);
  }
  return parsed.data;
}

export const ENV = Symbol("ENV");

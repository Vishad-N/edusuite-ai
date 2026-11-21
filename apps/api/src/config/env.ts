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
    for (const key of ["DATABASE_URL", "REDIS_URL", "S3_ENDPOINT", "JWT_SECRET"] as const) {
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

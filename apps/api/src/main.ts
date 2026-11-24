import { createApp } from "./bootstrap";
import { loadEnv } from "./config/env";
import { initTelemetry } from "./common/telemetry";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- version for the error-report release tag
const { version } = require("../../package.json") as { version: string };

async function main(): Promise<void> {
  const env = loadEnv();
  initTelemetry({ dsn: env.SENTRY_DSN, environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV, service: "api", release: `edusuite-api@${version}` });
  const app = await createApp(env);
  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err: unknown) => {
  // Startup failures only: print the message, not the environment.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

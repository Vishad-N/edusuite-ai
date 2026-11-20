import { createApp } from "./bootstrap";
import { loadEnv } from "./config/env";

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await createApp(env);
  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err: unknown) => {
  // Startup failures only: print the message, not the environment.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

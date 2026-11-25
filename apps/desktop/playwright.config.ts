import { defineConfig } from "@playwright/test";

// End-to-end journeys in the real Electron app (master prompt §4; DN-069).
// Needs the local stack running and seeded (docs/runbooks/local-testing.md) and a built
// renderer: `npm run test:e2e` builds first. AI runs in fixture mode, so no credits are real.
export default defineConfig({
  testDir: "e2e",
  // One Electron window at a time: journeys share the seeded database.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]] : "list",
  outputDir: "e2e-results",
});

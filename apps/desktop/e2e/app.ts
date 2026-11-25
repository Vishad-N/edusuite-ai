import { _electron as electron, expect, type ElectronApplication, type Page, type TestInfo } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DESKTOP = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(DESKTOP, "..", "..");
export const API = process.env.EDUSUITE_API_URL ?? "http://localhost:3000";

/** Demo logins from the seed file (apps/api/src/scripts/seed.ts); passwords are never written anywhere else. */
export type DemoUser = "DEMO-SA" | "DEMO-BA" | "DEMO-T" | "DEMO-TY" | "DEMO-C";
export function passwordOf(code: DemoUser): string {
  const seed = readFileSync(join(REPO, "apps/api/src/scripts/seed.ts"), "utf8");
  const m = new RegExp(`code: "${code}"[^}]*password: "([^"]+)"`).exec(seed);
  if (!m) throw new Error(`${code} is not in the seed file`);
  return m[1]!;
}

export const newProfile = (): string => mkdtempSync(join(tmpdir(), "edusuite-e2e-"));
export const removeProfile = (dir: string): void => rmSync(dir, { recursive: true, force: true, maxRetries: 3 });

export type Running = { app: ElectronApplication; page: Page; profile: string; close: () => Promise<void> };

/**
 * Starts the built app with its own profile (so it never touches a copy the developer has
 * open: the single-instance lock is per profile). Pass `profile` to restart into the same one.
 */
export async function launch(opts: { profile?: string } = {}): Promise<Running> {
  const profile = opts.profile ?? newProfile();
  const app = await electron.launch({
    cwd: DESKTOP,
    args: [".", `--user-data-dir=${profile}`],
    env: { ...process.env, EDUSUITE_API_URL: API, ELECTRON_DEV_SERVER_URL: "" },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  return {
    app,
    page,
    profile,
    close: async () => {
      await app.close().catch(() => {});
      if (!opts.profile) removeProfile(profile);
    },
  };
}

const RATE_LIMITED = "बहुत ज़्यादा प्रयास";

/**
 * Fills and submits the login form, then waits for the header or a login error. Logins are
 * limited per IP per minute (DN-033); when a local run hits that, it waits the minute out once.
 */
export async function signIn(page: Page, code: DemoUser, password = passwordOf(code), retried = false): Promise<void> {
  await page.locator('input[autocomplete="username"]').fill(code);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  const outcome = await page.waitForFunction(
    () => (document.querySelector("header") ? "in" : [...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent ?? "").join(" ").trim()),
    undefined,
    { timeout: 20_000 },
  );
  const text = String(await outcome.jsonValue());
  if (text.includes(RATE_LIMITED) && !retried) {
    await page.waitForTimeout(61_000);
    return signIn(page, code, password, true);
  }
}

export async function expectSignedIn(page: Page): Promise<void> {
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator('input[autocomplete="username"]')).toHaveCount(0);
}

/** The "AI क्रेडिट: N" chip in the header. */
export async function credits(page: Page): Promise<number> {
  const chip = page.locator("header").getByText(/AI (क्रेडिट|credits)/i).first();
  await expect(chip).toBeVisible();
  return Number((await chip.innerText()).replace(/[^0-9]/g, ""));
}

export async function go(page: Page, screen: string): Promise<void> {
  await page.evaluate((s) => (location.hash = s === "dashboard" ? "#/" : `#/${s}`), screen);
}

/** Screenshot on failure, attached to the report. */
export async function attachOnFailure(page: Page | undefined, info: TestInfo): Promise<void> {
  if (!page || info.status === info.expectedStatus) return;
  const shot = await page.screenshot().catch(() => null);
  if (shot) await info.attach("screen", { body: shot, contentType: "image/png" });
}

/** Fails fast with a clear message when the stack isn't up. */
export async function requireApi(): Promise<void> {
  try {
    const res = await fetch(`${API}/ready`);
    if (res.ok) return;
  } catch {
    // fall through
  }
  throw new Error(`The API at ${API} is not ready. Start the stack and seed it first (docs/runbooks/local-testing.md).`);
}

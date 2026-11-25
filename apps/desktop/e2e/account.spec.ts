import { expect, test } from "@playwright/test";
import { API, attachOnFailure, expectSignedIn, launch, passwordOf, requireApi, signIn, type Running } from "./app";

// Journey: branch choice after login, switching in the header, and changing one's own password (DN-070).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

test("a teacher with two branches picks one at login and switches in the header", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T", undefined, { branch: "गीता भवन ब्रांच" });
  await expectSignedIn(page);
  const chip = page.locator("header").getByRole("button", { name: /गीता भवन ब्रांच/ });
  await expect(chip).toBeVisible();

  await chip.click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("button", { name: /मेन ब्रांच/ }).click();
  await expect(page.locator("header").getByRole("button", { name: /मेन ब्रांच/ })).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
});

test("staff with one branch are not asked", async () => {
  run = await launch();
  await signIn(run.page, "DEMO-SA");
  await expectSignedIn(run.page);
  await expect(run.page.locator("#branch-pick-title")).toHaveCount(0);
});

test("changing one's own password, then back", async () => {
  run = await launch();
  const { page } = run;
  const original = passwordOf("DEMO-TY");
  const temporary = `E2E-temp-${Date.now()}`;
  await signIn(page, "DEMO-TY");
  await expectSignedIn(page);

  const change = async (from: string, to: string) => {
    await page.getByRole("button", { name: "पासवर्ड बदलें" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.getByRole("textbox", { name: "मौजूदा पासवर्ड", exact: true }).fill(from);
    await dialog.getByRole("textbox", { name: "नया पासवर्ड", exact: true }).fill(to);
    await dialog.getByRole("textbox", { name: "नया पासवर्ड दोबारा", exact: true }).fill(to);
    await dialog.getByRole("button", { name: "पासवर्ड बदलें" }).click();
  };

  // A wrong current password is refused in the dialog.
  await change("not-the-password", temporary);
  await expect(page.locator("dialog[open]").getByRole("alert")).toContainText("मौजूदा पासवर्ड सही नहीं है");
  await page.locator("dialog[open]").getByRole("button", { name: "रद्द करें" }).click();

  await change(original, temporary);
  try {
    await expect(page.getByText(/पासवर्ड बदल गया/)).toBeVisible();
    // The new password signs in; the old one doesn't.
    const login = (password: string) =>
      fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: "DEMO-TY", password, deviceId: "e2e-check-device" }),
      }).then((r) => r.status);
    expect(await login(original)).toBe(401);
    expect(await login(temporary)).toBe(200);
  } finally {
    // Put the demo password back so the seed file stays right.
    await change(temporary, original);
    await expect(page.getByText(/पासवर्ड बदल गया/).first()).toBeVisible();
  }
});

import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, launch, requireApi, signIn, type Running } from "./app";

// Journey: the super admin uploads the institute's logo; it replaces the initials badge (DN-071).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

// A real 1×1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("upload a logo, see it on the dashboard, then remove it", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-SA");
  await expectSignedIn(page);
  const dashboardLogo = page.locator("main img").first();
  await expect(dashboardLogo).toHaveAttribute("src", /^data:image\/svg\+xml/);

  const openSettings = async () => {
    await page.getByRole("button", { name: "सेटिंग्स" }).click();
    await expect(page.locator("dialog[open]").getByText("संस्थान का लोगो").first()).toBeVisible();
  };
  const save = () => page.locator("dialog[open]").getByRole("button", { name: "सेव करें" }).click();

  await openSettings();
  const dialog = page.locator("dialog[open]");
  // Wrong type is refused before uploading.
  await dialog.locator('input[type="file"]').setInputFiles({ name: "logo.gif", mimeType: "image/gif", buffer: PNG });
  await expect(dialog.getByRole("alert")).toContainText("केवल PNG, JPG या WebP");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByRole("button", { name: "लोगो हटाएँ" })).toBeVisible();
  await expect(dialog.locator('img[alt="संस्थान का लोगो"]')).toHaveAttribute("src", /^data:image\/png;base64,/);
  await save();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(dashboardLogo).toHaveAttribute("src", /^data:image\/png;base64,/);

  // Put the demo institute back to its initials badge.
  await openSettings();
  await page.locator("dialog[open]").getByRole("button", { name: "लोगो हटाएँ" }).click();
  await save();
  await expect(dashboardLogo).toHaveAttribute("src", /^data:image\/svg\+xml/);
});

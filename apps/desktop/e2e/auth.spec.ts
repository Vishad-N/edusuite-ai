import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, go, launch, newProfile, removeProfile, requireApi, signIn, type Running } from "./app";

// Journey: sign in, deep link, session survives a restart, sign out (DN-037, DN-033).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
  run = undefined;
});

test("wrong password shows the server's message; a deep link returns after login", async () => {
  run = await launch();
  const { page } = run;
  // Wait for the app's own first redirect to the login screen, then open the deep link.
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  await go(page, "ppt");
  await signIn(page, "DEMO-T", "definitely-not-the-password");
  await expect(page.getByRole("alert").filter({ hasText: "ID या पासवर्ड गलत है" })).toBeVisible();
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);
  await expect(page).toHaveURL(/#\/ppt$/);
});

test("the session survives a restart and logging out clears it", async () => {
  const profile = newProfile();
  // First run: sign in, then quit.
  run = await launch({ profile });
  await signIn(run.page, "DEMO-SA");
  await expectSignedIn(run.page);
  await run.app.close();

  // Second run on the same profile: still signed in.
  run = await launch({ profile });
  await expectSignedIn(run.page);
  await run.page.getByRole("button", { name: "लॉगआउट" }).click();
  await run.page.locator("dialog[open]").getByRole("button", { name: "हाँ, लॉगआउट" }).click();
  await expect(run.page.locator('input[autocomplete="username"]')).toBeVisible();
  await run.app.close();

  // Third run: signed out for good.
  run = await launch({ profile });
  await expect(run.page.locator('input[autocomplete="username"]')).toBeVisible();
  await run.close();
  run = undefined;
  removeProfile(profile);
});

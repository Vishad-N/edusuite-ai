import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey E: the English switch reaches the tool screens and switches back (DN-064).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

test("English everywhere, then back to Hindi", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await go(page, "ppt");
  await expect(page.getByRole("button", { name: /Make slides with AI/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "History" })).toBeVisible();

  // No Devanagari in the screen's own controls (staff and institute names may still be Hindi).
  const labels = await page.locator("main button, main label").allInnerTexts();
  expect(labels.filter((t) => /[ऀ-ॿ]/.test(t))).toEqual([]);

  await page.getByRole("button", { name: "हिन्दी" }).click();
  await expect(page.getByRole("button", { name: "सेव करें" })).toBeVisible();
});

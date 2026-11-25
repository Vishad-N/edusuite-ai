import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, go, launch, newProfile, removeProfile, requireApi, RESTART_SKIP_REASON, RESTART_UNSUPPORTED, signIn, type Running } from "./app";

// Journeys: saving while offline, and unsaved work coming back after the app was closed (DN-075).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
  run = undefined;
});

const status = (r: Running) => r.page.locator('p[aria-live="polite"]').first();
const titleBox = (r: Running) => r.page.locator('input[placeholder="शीर्षक लिखें"]');

test("Save while offline waits, then saves by itself when the connection is back", async () => {
  run = await launch();
  await signIn(run.page, "DEMO-T");
  await expectSignedIn(run.page);
  await go(run.page, "ppt");
  await titleBox(run).fill(`E2E ऑफ़लाइन ${Date.now()}`);

  await run.page.context().setOffline(true);
  await expect(status(run)).toContainText("ऑफ़लाइन");
  await expect(run.page.getByText(/इंटरनेट कनेक्शन नहीं है/)).toBeVisible();
  await run.page.getByRole("button", { name: "सेव करें" }).click();
  await expect(status(run)).toContainText("इंटरनेट आते ही सेव होगा");

  await run.page.context().setOffline(false);
  await expect(status(run)).toContainText("सेव हो गया", { timeout: 20_000 });
  await expect(run.page.getByText(/इंटरनेट कनेक्शन नहीं है/)).toHaveCount(0);
});

test("unsaved work is offered back after the app was closed", async () => {
  test.skip(RESTART_UNSUPPORTED, RESTART_SKIP_REASON);
  const profile = newProfile();
  const title = `E2E ड्राफ़्ट ${Date.now()}`;
  try {
    run = await launch({ profile });
    await signIn(run.page, "DEMO-T");
    await expectSignedIn(run.page);
    await go(run.page, "ppt");
    await titleBox(run).fill(title);
    await expect(status(run)).toContainText("बिना सेव किए बदलाव");
    // The draft is written about a second after the last change.
    await run.page.waitForTimeout(1_500);
    await run.app.close();

    run = await launch({ profile });
    await expectSignedIn(run.page);
    await go(run.page, "ppt");
    const offer = run.page.getByText(/पिछली बार का बिना सेव किया काम मिला/);
    await expect(offer).toContainText(title);
    await run.page.getByRole("button", { name: "वापस लाएँ" }).click();
    await expect(titleBox(run)).toHaveValue(title);
    await expect(status(run)).toContainText("बिना सेव किए बदलाव");

    // Discarding it (New, then confirm) removes the draft for good.
    await run.page.getByRole("button", { name: "नया", exact: true }).click();
    await run.page.locator("dialog[open]").getByRole("button", { name: "हाँ, बिना सेव आगे बढ़ें" }).click();
    await expect(titleBox(run)).toHaveValue("");
    await run.page.waitForTimeout(500);
    await run.app.close();

    run = await launch({ profile });
    await expectSignedIn(run.page);
    await go(run.page, "ppt");
    await expect(run.page.locator('input[placeholder="शीर्षक लिखें"]')).toBeVisible();
    await expect(run.page.getByText(/पिछली बार का बिना सेव किया काम मिला/)).toHaveCount(0);
  } finally {
    await run?.close();
    run = undefined;
    removeProfile(profile);
  }
});

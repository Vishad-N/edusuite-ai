import { expect, test } from "@playwright/test";
import { attachOnFailure, credits, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey A: a teacher makes slides with AI, saves them and reopens them from history
// (DN-041, DN-054). The stack runs AI in fixture mode, so this costs no real money.
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

test("AI slides → one credit → save → reopen from history", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);
  const before = await credits(page);

  await go(page, "ppt");
  const generate = page.getByRole("button", { name: /AI से स्लाइड बनाएँ/ });
  await expect(generate).toBeDisabled();
  const topic = `E2E पादप कोशिका ${Date.now()}`;
  await page.locator('input[placeholder^="उदा. मध्य प्रदेश"]').fill(topic);
  await expect(generate).toBeEnabled();
  await generate.click();

  await expect(page.getByText("बिना सेव किए बदलाव").first()).toBeVisible({ timeout: 45_000 });
  await expect.poll(() => credits(page)).toBe(before - 1);
  const title = page.locator('input[placeholder="शीर्षक लिखें"]');
  await expect(title).not.toHaveValue("");
  const savedTitle = await title.inputValue();

  await page.getByRole("button", { name: "सेव करें" }).click();
  await expect(page.getByText(/^सेव हो गया/).first()).toBeVisible();

  // New clears the screen without asking, because everything is saved.
  await page.getByRole("button", { name: "नया", exact: true }).click();
  await expect(title).toHaveValue("");

  await page.getByRole("button", { name: "इतिहास" }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByPlaceholder("शीर्षक से खोजें").fill(savedTitle);
  const row = dialog.locator("li", { hasText: savedTitle }).first();
  await row.getByRole("button", { name: "खोलें" }).click();
  await expect(title).toHaveValue(savedTitle);
  await expect(page.getByText(/^सेव हो गया/).first()).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { attachOnFailure, credits, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey: deck → quiz is saved with history and reopens with the teacher's checks (DN-073).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

// The files API checks only the PDF signature; fixture mode doesn't read the deck.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test("generate, check an answer, save, start new, reopen from history", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);
  const before = await credits(page);

  await go(page, "deck_quiz");
  await page.locator('input[type="file"]').setInputFiles({ name: "deck.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByText("अपलोड हो गई")).toBeVisible();
  await page.getByLabel("परीक्षा").fill("SSC CGL");
  await page.getByLabel("विषय / यूनिट").fill("जीव विज्ञान · यूनिट-1");
  await page.getByRole("button", { name: /क्विज़ बनाएँ/ }).click();
  await expect(page.getByText("जाँचना बाकी").first()).toBeVisible({ timeout: 45_000 });
  await expect.poll(() => credits(page)).toBeLessThan(before);

  // Tick every answer the AI decided, so download is allowed.
  const checks = page.getByRole("checkbox", { name: "उत्तर सही है" });
  for (let i = 0, n = await checks.count(); i < n; i++) await checks.nth(i).check();
  await expect(page.getByText("सभी उत्तर जाँचे जा चुके हैं।")).toBeVisible();
  const questionCount = await page.locator("main ol > li").count();

  const title = page.locator('input[placeholder="शीर्षक लिखें"]');
  await expect(title).not.toHaveValue("");
  const savedTitle = `${await title.inputValue()} ${Date.now()}`;
  await title.fill(savedTitle);
  await page.getByRole("button", { name: "सेव करें" }).click();
  await expect(page.getByText(/^सेव हो गया/).first()).toBeVisible();

  await page.getByRole("button", { name: "नया", exact: true }).click();
  await expect(page.locator("main ol > li")).toHaveCount(0);

  await page.getByRole("button", { name: "इतिहास" }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByPlaceholder("शीर्षक से खोजें").fill(savedTitle);
  await dialog.locator("li", { hasText: savedTitle }).first().getByRole("button", { name: "खोलें" }).click();
  await expect(page.locator("main ol > li")).toHaveCount(questionCount);
  await expect(page.getByText("सभी उत्तर जाँचे जा चुके हैं।")).toBeVisible();
  await expect(page.getByLabel("परीक्षा")).toHaveValue("SSC CGL");
  await expect(page.getByRole("button", { name: "HTML डाउनलोड करें" })).toBeEnabled();
});

import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey: AI paper → MCQs into the question bank → browse it → reuse in a new paper (DN-074).
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

test("save a paper's MCQs to the bank, browse them, and add one to a new paper", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);

  // A unique subject keeps this run's questions apart from earlier runs.
  const subject = `E2E रसायन ${Date.now()}`;
  await go(page, "test");
  await page.getByLabel("विषय", { exact: true }).fill(subject);
  await page.getByLabel("कौन-से अध्याय / टॉपिक").fill("अम्ल, क्षार और लवण");
  await page.getByRole("button", { name: /AI से पेपर बनाएँ ·/ }).click();
  await expect(page.getByText(/यह नमूना उत्तर है/)).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: "MCQ प्रश्न बैंक में जोड़ें" }).click();
  const added = page.getByText(/प्रश्न बैंक में \d+ जुड़े, 0 पहले से थे।/);
  await expect(added).toBeVisible();
  const count = Number(/में (\d+) जुड़े/.exec(await added.innerText())![1]);
  expect(count).toBeGreaterThan(0);

  // Pressing it again adds nothing new.
  await page.getByRole("button", { name: "MCQ प्रश्न बैंक में जोड़ें" }).click();
  await expect(page.getByText(new RegExp(`प्रश्न बैंक में 0 जुड़े, ${count} पहले से थे।`))).toBeVisible();

  // The bank screen lists them under that subject.
  await go(page, "question_bank");
  await page.getByLabel("विषय", { exact: true }).selectOption(subject);
  await expect(page.locator('ol[aria-label="प्रश्न बैंक"] > li')).toHaveCount(count);

  // A new paper takes one question from the bank.
  await go(page, "test");
  await page.getByRole("button", { name: "नया", exact: true }).click();
  const dialogConfirm = page.locator("dialog[open]").getByRole("button", { name: "हाँ, बिना सेव आगे बढ़ें" });
  if (await dialogConfirm.isVisible().catch(() => false)) await dialogConfirm.click();
  await page.getByRole("button", { name: "प्रश्न बैंक से जोड़ें" }).click();
  const picker = page.locator("dialog[open]");
  await picker.getByLabel("विषय", { exact: true }).selectOption(subject);
  await picker.locator('ol[aria-label="प्रश्न बैंक"] input[type="checkbox"]').first().check();
  await picker.getByRole("button", { name: "1 प्रश्न जोड़ें" }).click();
  await expect(page.getByText("1 प्रश्न जोड़े गए")).toBeVisible();
  await expect(page.getByText("बिना सेव किए बदलाव").first()).toBeVisible();
});

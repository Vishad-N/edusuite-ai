import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey B: what each role may open (DN-008, DN-034, DN-066). The API enforces the same rules.
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

test("the super admin manages staff, with no password column and no delete", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-SA");
  await expectSignedIn(page);
  await go(page, "users");
  const table = page.locator("table").first();
  await expect(table).toContainText("DEMO-T");
  await expect(table.locator("th")).not.toContainText(["पासवर्ड"]);
  await expect(page.getByRole("button", { name: /हटाएँ|डिलीट/ })).toHaveCount(0);
  await go(page, "audit");
  await expect(page.getByRole("tab").first()).toBeVisible();
});

test("a teacher can't open staff or audit screens and has no fee receipts", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);
  for (const screen of ["users", "audit", "receipt"]) {
    await go(page, screen);
    await expect(page).toHaveURL(/#\/$/);
  }
  await expect(page.locator("aside nav")).not.toContainText("फ़ीस");
});

test("a counselor sees notices and posters but no AI slide tools", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-C");
  await expectSignedIn(page);
  await go(page, "ppt");
  await expect(page).toHaveURL(/#\/$/);
  await go(page, "notice");
  await expect(page).toHaveURL(/#\/notice$/);
});

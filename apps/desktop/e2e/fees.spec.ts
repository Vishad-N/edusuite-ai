import { expect, test } from "@playwright/test";
import { attachOnFailure, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey D: a counselor enrols a student and issues a fee receipt (DN-007, DN-061).
// Each run adds one student named "E2E छात्र …" to the local database.
test.beforeAll(requireApi);

let run: Running | undefined;
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
});

test("enrol → receipt within the balance → printed number and balance", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-C");
  await expectSignedIn(page);
  await go(page, "receipt");

  await page.getByRole("button", { name: "नया छात्र" }).click();
  const name = `E2E छात्र ${Date.now()}`;
  await expect(page.getByLabel("रोल नंबर")).toHaveAttribute("placeholder", /^DEMO-GTB-/);
  await page.getByLabel("छात्र का पूरा नाम").fill(name);
  await page.getByLabel("कोर्स").fill("SSC CGL");
  await page.getByLabel("कुल फ़ीस (₹)").fill("12000");
  await page.getByLabel("मोबाइल नंबर").fill("9826012345");
  await page.getByRole("button", { name: "छात्र जोड़ें", exact: true }).click();
  await expect(page.getByText(/छात्र जुड़ गया: DEMO-GTB-/)).toBeVisible();

  const submit = page.locator('main form button[type="submit"]');
  await page.getByLabel("राशि (₹)").fill("13000");
  await expect(submit).toBeDisabled();
  await page.getByLabel("राशि (₹)").fill("5000");
  await page.getByLabel("भुगतान का तरीका").selectOption("upi");
  await submit.click();

  const receipt = page.locator('article[aria-label^="रसीद DEMO-GTB/"]');
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveAttribute("aria-label", /^रसीद DEMO-GTB\/\d{4}-\d{2}\/\d{6}$/);
  await expect(receipt).toContainText(name);
  await expect(receipt).toContainText("7,000");
});

import { expect, test } from "@playwright/test";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { attachOnFailure, expectSignedIn, go, launch, requireApi, signIn, type Running } from "./app";

// Journey: real PNG download of a YouTube thumbnail and a poster at exact sizes (DN-072).
test.beforeAll(requireApi);

let run: Running | undefined;
let dir = "";
test.beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "edusuite-png-"));
});
test.afterEach(async ({}, info) => {
  await attachOnFailure(run?.page, info);
  await run?.close();
  rmSync(dir, { recursive: true, force: true });
});

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number; bytes: number } {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
}

/** The native save dialog can't be clicked by a test; answer it with a path instead. */
async function answerSaveDialog(r: Running, file: string): Promise<void> {
  await r.app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: target })) as typeof dialog.showSaveDialog;
  }, file);
}

test("thumbnail 1280×720 and a 9:16 poster 1080×1920", async () => {
  run = await launch();
  const { page } = run;
  await signIn(page, "DEMO-T");
  await expectSignedIn(page);

  await go(page, "youtube");
  const thumbButton = page.getByRole("button", { name: /PNG डाउनलोड करें \(1280×720\)/ });
  await expect(thumbButton).toBeDisabled();
  await page.getByLabel("मुख्य बड़ा टाइटल (Headline)").fill("कोशिका विभाजन");
  const thumb = join(dir, "thumb.png");
  await answerSaveDialog(run, thumb);
  await thumbButton.click();
  await expect(page.getByText(/PNG सेव हो गई/)).toBeVisible();
  const t = pngSize(thumb);
  expect([t.width, t.height]).toEqual([1280, 720]);
  expect(t.bytes).toBeGreaterThan(20_000);

  await go(page, "image");
  await page.getByRole("button", { name: /Story \(9:16\)/ }).click();
  await page.getByLabel("मुख्य हेडलाइन").fill("प्रवेश प्रारंभ 2026");
  const poster = join(dir, "poster.png");
  await answerSaveDialog(run, poster);
  await page.getByRole("button", { name: /PNG डाउनलोड करें \(1080×1920\)/ }).click();
  await expect.poll(() => existsSync(poster)).toBe(true);
  const p = pngSize(poster);
  expect([p.width, p.height]).toEqual([1080, 1920]);
  // Kept for a look when E2E_KEEP_PNG is set.
  if (process.env.E2E_KEEP_PNG) for (const f of [thumb, poster]) copyFileSync(f, join(process.env.E2E_KEEP_PNG, basename(f)));
});

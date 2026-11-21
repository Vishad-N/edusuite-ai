import { test } from "node:test";
import assert from "node:assert/strict";
import { FilePresignRequestSchema, cleanFileName, matchesSignature } from "./files.ts";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

test("file signatures are checked, not just the declared type", () => {
  assert.equal(matchesSignature("image/png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), true);
  assert.equal(matchesSignature("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0)), true);
  assert.equal(matchesSignature("application/pdf", bytes(0x25, 0x50, 0x44, 0x46, 0x2d)), true);
  const webp = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
  assert.equal(matchesSignature("image/webp", webp), true);
  // An HTML or script file renamed to .png is refused.
  assert.equal(matchesSignature("image/png", new TextEncoder().encode("<html><script>")), false);
  assert.equal(matchesSignature("application/pdf", bytes(0x89, 0x50)), false);
});

test("only allowed types and sizes may be presigned", () => {
  const ok = FilePresignRequestSchema.safeParse({ name: "q1.png", mime: "image/png", bytes: 1000 });
  assert.equal(ok.success, true);
  assert.equal(FilePresignRequestSchema.safeParse({ name: "x.exe", mime: "application/x-msdownload", bytes: 10 }).success, false);
  assert.equal(FilePresignRequestSchema.safeParse({ name: "x.svg", mime: "image/svg+xml", bytes: 10 }).success, false, "SVG can carry script");
  assert.equal(FilePresignRequestSchema.safeParse({ name: "big.png", mime: "image/png", bytes: 11 * 1024 * 1024 }).success, false);
  assert.equal(FilePresignRequestSchema.safeParse({ name: "a.pdf", mime: "application/pdf", bytes: 20 * 1024 * 1024 }).success, true);
});

test("file names are cleaned and never become paths", () => {
  assert.equal(cleanFileName("..\\..\\Windows\\evil.png"), "evil.png");
  assert.equal(cleanFileName("../../etc/passwd"), "passwd");
  assert.equal(cleanFileName("प्रश्न 1 (MPPSC).png"), "प्रश्न 1 (MPPSC).png");
  assert.equal(cleanFileName('a<b>"c|d?.png'), "a_b__c_d_.png");
  assert.equal(cleanFileName("..."), "file");
});

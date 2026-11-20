import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiErrorSchema, pickLanguage } from "./apiError.ts";

test("error shape requires code and message", () => {
  assert.equal(ApiErrorSchema.safeParse({ code: "AUTH_INVALID", message: "x" }).success, true);
  assert.equal(ApiErrorSchema.safeParse({ code: "AUTH_INVALID" }).success, false);
});

test("Hindi is the default language", () => {
  assert.equal(pickLanguage(undefined), "hi");
  assert.equal(pickLanguage("hi-IN,hi;q=0.9"), "hi");
  assert.equal(pickLanguage("fr"), "hi");
  assert.equal(pickLanguage("en-GB,en;q=0.8"), "en");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { EDUSUITE_MARK, initialsLogo, initialsOf, instituteLogo } from "./branding.ts";

test("initials take the first letter of the first two words, keeping Devanagari conjuncts whole", () => {
  assert.equal(initialsOf("Demo Coaching Institute"), "DC");
  assert.equal(initialsOf("डेमो कोचिंग संस्थान"), "डेको");
  assert.equal(initialsOf("  akash  "), "A");
  assert.equal(initialsOf(""), "?");
  assert.equal(initialsOf(undefined), "?");
});

test("an institute without a logo gets its own initials badge, never a built-in logo", () => {
  const url = instituteLogo({ name: "Demo Coaching" });
  assert.equal(url, initialsLogo("Demo Coaching"));
  assert.match(decodeURIComponent(url), />DC<\/text>/);
  assert.equal(instituteLogo({ name: "X", logo: "data:image/png;base64,AAA" }), "data:image/png;base64,AAA");
  assert.match(EDUSUITE_MARK, /^data:image\/svg\+xml/);
});

test("names in the initials badge are escaped", () => {
  assert.match(decodeURIComponent(initialsLogo("<b> &x")), />&#60;&#38;<\/text>/);
});

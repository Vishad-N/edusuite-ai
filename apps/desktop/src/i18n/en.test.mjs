// DN-064: every Hindi string the screens pass to tx() has English, with the same {n} placeholders.
// After adding UI text: node src/i18n/keys.mjs --missing  → add those keys to en.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { txKeys } from "./keys.mjs";
import { EN } from "./en.ts";
import { setUiLanguage, tx } from "./index.ts";

test("every tx() string has an English translation", () => {
  const missing = txKeys().filter((k) => !(k in EN));
  assert.deepEqual(missing, [], "run: node src/i18n/keys.mjs --missing");
});

test("translations keep the same placeholders", () => {
  const ph = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join(",");
  const bad = Object.entries(EN).filter(([hi, en]) => ph(hi) !== ph(en) || !en.trim());
  assert.deepEqual(bad, []);
});

test("tx follows the UI language and fills placeholders", () => {
  setUiLanguage("en");
  assert.equal(tx("रसीद {0} बन गई", ["DEMO/1"]), "Receipt DEMO/1 issued");
  assert.equal(tx("कोई अनुवाद नहीं"), "कोई अनुवाद नहीं", "unknown text falls back to Hindi");
  setUiLanguage("hi");
  assert.equal(tx("रसीद {0} बन गई", ["DEMO/1"]), "रसीद DEMO/1 बन गई");
});

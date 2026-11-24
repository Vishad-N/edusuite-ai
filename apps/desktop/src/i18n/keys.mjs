// Lists every Hindi source string passed to tx() in apps/desktop/src (DN-064).
// Used by the dictionary test and to find new strings that need English:
//   node src/i18n/keys.mjs            → JSON array of all keys
//   node src/i18n/keys.mjs --missing  → keys with no entry in en.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const CALL = /\btx\(\s*("(?:[^"\\]|\\.)*")/g;

export function txKeys(dir = SRC) {
  const keys = new Set();
  (function walk(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name) && !/[\\/]i18n[\\/](index|en)\.ts$/.test(p)) {
        for (const m of readFileSync(p, "utf8").matchAll(CALL)) keys.add(JSON.parse(m[1]));
      }
    }
  })(dir);
  return [...keys].sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let keys = txKeys();
  if (process.argv.includes("--missing")) {
    const en = readFileSync(new URL("./en.ts", import.meta.url), "utf8");
    keys = keys.filter((k) => !en.includes(JSON.stringify(k)));
  }
  console.log(JSON.stringify(keys, null, 1));
}

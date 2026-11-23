// Turns templates/deck-quiz.html (the readable source) into src/deckQuizTemplate.ts (DN-055).
// Run after editing the template:  npm run gen:quiz-template -w @edusuite/shared
// A test fails if the two are out of step.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("templates/deck-quiz.html", root), "utf8").replace(/\r\n/g, "\n");
const out = `// Generated from templates/deck-quiz.html by scripts/gen-deck-quiz-template.mjs. Do not edit by hand.\nexport const DECK_QUIZ_TEMPLATE: string = ${JSON.stringify(html)};\n`;
writeFileSync(fileURLToPath(new URL("src/deckQuizTemplate.ts", root)), out);
console.log(`deckQuizTemplate.ts written (${html.length} chars)`);

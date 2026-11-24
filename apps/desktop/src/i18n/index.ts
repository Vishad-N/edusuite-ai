import { EN } from "./en.ts";

/**
 * UI language (DN-064). Screens keep their Hindi text in the code and wrap it in
 * `tx()`; in English mode `tx` returns the translation from `en.ts`. The App sets
 * the language during render, before any screen renders, so a switch re-renders
 * every screen in the new language. Text the user typed and saved is never translated.
 */
export type UiLanguage = "hi" | "en";

const STORAGE_KEY = "edusuite_lang";

function initial(): UiLanguage {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "en" ? "en" : "hi";
  } catch {
    return "hi";
  }
}

let current: UiLanguage = initial();

export function setUiLanguage(lang: UiLanguage): void {
  current = lang;
}

export function uiLanguage(): UiLanguage {
  return current;
}

/**
 * Hindi source text → the current UI language. `{0}`, `{1}` … are filled from `vars`
 * (template literals become `tx("… {0} …", [value])`). A missing translation falls
 * back to Hindi; a test keeps `en.ts` complete.
 */
export function tx(hi: string, vars?: readonly unknown[]): string {
  let text = current === "en" ? (EN[hi] ?? hi) : hi;
  if (vars) text = text.replace(/\{(\d+)\}/g, (_m, i: string) => String(vars[Number(i)] ?? ""));
  return text;
}

/** Locale for numbers and dates: Indian grouping in both languages, month names in the UI language. */
export function uiLocale(): "hi-IN" | "en-IN" {
  return current === "en" ? "en-IN" : "hi-IN";
}

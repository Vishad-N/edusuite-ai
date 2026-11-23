/** First letter (grapheme, so Devanagari conjuncts stay whole) of the first two words (DN-052). */
export function initialsOf(name: string | null | undefined): string {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const first = (word: string) => segmenter.segment(word)[Symbol.iterator]().next().value?.segment ?? "";
  const letters = words.slice(0, 2).map(first).join("");
  return letters.toUpperCase() || "?";
}

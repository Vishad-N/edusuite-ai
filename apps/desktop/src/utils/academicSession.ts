/** The current academic session, which starts in April (e.g. "सत्र 2026-27"). */
export function academicSession(lang: "hi" | "en", today = new Date()): string {
  const start = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return `${lang === "hi" ? "सत्र" : "Session"} ${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

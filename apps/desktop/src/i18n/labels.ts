import type { DocumentType } from "@edusuite/shared";
import { tx } from "./index.ts";

/** Document type names in the UI language (the shared package keeps the Hindi list for the API). */
export function documentTypeLabel(type: DocumentType): string {
  switch (type) {
    case "ppt": return tx("लेक्चर PPT");
    case "mcq_set": return tx("स्क्रीनशॉट MCQ सेट");
    case "paper": return tx("टेस्ट पेपर");
    case "dpp": return tx("DPP / OMR शीट");
    case "lesson": return tx("लेसन प्लान");
    case "book": return tx("किताब / मॉड्यूल");
    case "doubt": return tx("डाउट हल");
    case "youtube": return tx("YouTube थंबनेल");
    case "notice": return tx("नोटिस");
    case "poster": return tx("पोस्टर");
    case "deck_quiz": return tx("डेक क्विज़");
  }
}
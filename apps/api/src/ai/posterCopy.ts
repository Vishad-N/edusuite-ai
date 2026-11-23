import { PosterCopyInputSchema, PosterCopyOutputSchema, type PosterCopyInput, type PosterCopyOutput } from "@edusuite/shared";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/** poster_copy (plan §08, DN-060): the words on a poster, never claims the institute didn't give (DN-050). */
const LANGUAGE_RULE: Record<PosterCopyInput["language"], string> = {
  hi: "Write in Hindi (Devanagari); exam names may stay in English.",
  en: "Write in English.",
  both: "Headline in Hindi, subheading and tagline may mix Hindi and English naturally.",
};

export const posterCopy: JobDefinition<PosterCopyInput, PosterCopyOutput> = {
  type: "poster_copy",
  input: PosterCopyInputSchema,
  output: PosterCopyOutputSchema,
  effort: "low",
  maxTokens: 2000,
  system: [
    "You write the words for posters of an Indian coaching institute: admissions, toppers, study material, festival wishes.",
    "Short and punchy: a headline of at most 8 words, a subheading of at most 15, a call to action of at most 10.",
    "Use only the facts in the brief. Never claim results, ranks, selections, percentages, 'best', 'No. 1', discounts, dates or faculty names that the brief doesn't state.",
  ].join("\n"),
  user: (input, ctx) => [
    { type: "text", text: [`Institute: ${ctx.instituteName}`, `Poster kind: ${input.category}`, `Brief: ${input.brief}`, LANGUAGE_RULE[input.language]].join("\n") },
  ],
  finish: (out): PosterCopyOutput => {
    const res = { headline: out.headline.trim().slice(0, 200), subheading: out.subheading.trim().slice(0, 200), tagline: out.tagline.trim().slice(0, 200) };
    if (!res.headline) throw new AiJobError("AI_BAD_OUTPUT", false, "no headline");
    return res;
  },
  steps: () => 1,
  fixture: () => ({ headline: "नमूना हेडलाइन", subheading: "नमूना उप-शीर्षक (AI का नहीं)", tagline: "नमूना टैगलाइन" }),
};

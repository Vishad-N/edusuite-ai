import {
  YOUTUBE_TITLE_MAX,
  YoutubeMetaInputSchema,
  YoutubeMetaOutputSchema,
  type YoutubeMetaInput,
  type YoutubeMetaOutput,
} from "@edusuite/shared";
import type { JobDefinition } from "./definitions";

/** youtube_meta (plan §08, DN-060): title, description and tags for a class video. */
const LANGUAGE_RULE: Record<YoutubeMetaInput["language"], string> = {
  hi: "Write the title and description in Hindi (Devanagari); exam names and common English search words may stay in English.",
  en: "Write in English.",
  both: "Write the title in Hindi with key English search words; the description in Hindi followed by a short English summary.",
};

/** Fits YouTube's limits: title ≤ 100 characters, up to 30 distinct tags. */
export function fitYoutubeMeta(out: YoutubeMetaOutput): YoutubeMetaOutput {
  const title = [...out.title.trim()].slice(0, YOUTUBE_TITLE_MAX).join("").trim();
  const seen = new Set<string>();
  const tags = out.tags
    .map((t) => t.trim().replace(/^#/, "").slice(0, 100))
    .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, 30);
  return { title, description: out.description.trim().slice(0, 5000), tags };
}

export const youtubeMeta: JobDefinition<YoutubeMetaInput, YoutubeMetaOutput> = {
  type: "youtube_meta",
  input: YoutubeMetaInputSchema,
  output: YoutubeMetaOutputSchema,
  effort: "low",
  maxTokens: 4000,
  system: [
    "You write YouTube titles, descriptions and tags for class videos of an Indian coaching institute (MPPSC, SSC, Vyapam, TET, school boards).",
    "The title says clearly what the class teaches and for which exam, in the words students search for; no clickbait, no ALL CAPS, at most two emoji.",
    "The description: what the class covers, who it is for, what to revise after; short lines. Mention the institute by the name given. Never invent links, phone numbers, dates, results or offers.",
    "Tags: 10 to 20 search phrases students actually type, a mix of Hindi and English where natural.",
  ].join("\n"),
  user: (input, ctx) => [
    {
      type: "text",
      text: [
        `Institute: ${ctx.instituteName}`,
        `Thumbnail headline: ${input.headline}`,
        input.punchline ? `Thumbnail punchline: ${input.punchline}` : "",
        input.subject ? `Subject / exam: ${input.subject}` : "",
        input.facultyName ? `Teacher: ${input.facultyName}` : "",
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  finish: fitYoutubeMeta,
  steps: () => 1,
  fixture: (input, ctx) => ({
    title: `${input.headline} | नमूना शीर्षक`,
    description: `नमूना विवरण (AI का नहीं)।\n${ctx.instituteName}`,
    tags: ["नमूना टैग", input.headline, "sample"],
  }),
};

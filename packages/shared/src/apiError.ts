import { z } from "zod";

/**
 * The one error shape every API route returns (plan §07, AGENT_README §7).
 * `message` is already in the language the client asked for via Accept-Language.
 */
export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const LANGUAGES = ["hi", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Picks hi or en from an Accept-Language header. Hindi is the default (AGENT_README §7). */
export function pickLanguage(acceptLanguage: string | undefined): Language {
  if (!acceptLanguage) return "hi";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en") ? "en" : "hi";
}

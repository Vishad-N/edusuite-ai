import { NoticeDraftInputSchema, NoticeDraftOutputSchema, type NoticeDraftInput, type NoticeDraftOutput } from "@edusuite/shared";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/** notice_draft (plan §08, DN-060): one notice as a WhatsApp message and a formal circular. */
const LANGUAGE_RULE: Record<NoticeDraftInput["language"], string> = {
  hi: "Write in polite, clear Hindi (Devanagari).",
  en: "Write in polite, clear English.",
  both: "Write the Hindi version first, then the English version below it, in both texts.",
};

export const noticeDraft: JobDefinition<NoticeDraftInput, NoticeDraftOutput> = {
  type: "notice_draft",
  input: NoticeDraftInputSchema,
  output: NoticeDraftOutputSchema,
  effort: "low",
  maxTokens: 4000,
  system: [
    "You draft notices for an Indian coaching institute to send to students and parents: fee reminders, holidays, exam schedules, meetings, admissions.",
    "Use only the facts the staff member gives. If a needed fact is missing (a date, time, amount, place, contact), write a placeholder in square brackets, e.g. [दिनांक], so staff fill it in. Never invent dates, amounts, phone numbers, links or offers.",
    "WhatsApp version: friendly and short, key facts in *bold*, one closing line with the institute's name. Formal version: the body of a printed circular in 2 to 4 short paragraphs, without letterhead, date line or signature (the app adds those).",
  ].join("\n"),
  user: (input, ctx) => [
    {
      type: "text",
      text: [
        `Institute: ${ctx.instituteName}`,
        input.category ? `Kind of notice: ${input.category}` : "",
        input.date ? `Notice date: ${input.date}` : "",
        `What the notice must say: ${input.details}`,
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  finish: (out): NoticeDraftOutput => {
    const res = { title: out.title.trim().slice(0, 200), whatsappText: out.whatsappText.trim().slice(0, 5000), formalText: out.formalText.trim().slice(0, 10000) };
    if (!res.whatsappText && !res.formalText) throw new AiJobError("AI_BAD_OUTPUT", false, "empty notice");
    return res;
  },
  steps: () => 1,
  fixture: (input, ctx) => ({
    title: "नमूना सूचना",
    whatsappText: `नमूना संदेश (AI का नहीं): ${input.details}\n— ${ctx.instituteName}`,
    formalText: `नमूना परिपत्र (AI का नहीं)।\n\n${input.details}`,
  }),
};

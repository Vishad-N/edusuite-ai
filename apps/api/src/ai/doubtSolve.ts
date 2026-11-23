import type Anthropic from "@anthropic-ai/sdk";
import {
  DOUBT_IMAGE_MIMES,
  DoubtSolveInputSchema,
  DoubtSolveOutputSchema,
  MCQ_MAX_IMAGE_BYTES,
  type DoubtSolveInput,
  type DoubtSolveOutput,
} from "@edusuite/shared";
import { ApiHttpException } from "../common/errors";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/** doubt_solve (plan §08, DN-060): a typed or photographed doubt, solved step by step. */
const LANGUAGE_RULE: Record<DoubtSolveInput["language"], string> = {
  hi: "Explain in clear, simple Hindi (Devanagari). Keep formulas, units and standard terms as they are taught.",
  en: "Explain in clear, simple English.",
  both: "Explain in Hindi (Devanagari) with key terms also in English in brackets.",
};

export const doubtSolve: JobDefinition<DoubtSolveInput, DoubtSolveOutput> = {
  type: "doubt_solve",
  input: DoubtSolveInputSchema,
  output: DoubtSolveOutputSchema,
  effort: "high",
  maxTokens: 16000,
  system: [
    "You are a patient, exact teacher at an Indian coaching institute (MPPSC, SSC, Vyapam, TET, school boards). A teacher brings you a student's doubt, typed or as a photo.",
    "Solve it correctly first, then explain so a student can follow: short numbered steps, each with one idea; show the working for calculations; state the final answer in one line.",
    "Give a shortcut only if it is genuinely faster and always correct; name the most common student mistake if there is one; add 2 or 3 similar practice questions of the same type.",
    "If the photo is unreadable or the question is incomplete or ambiguous, say exactly what is missing in the answer field and solve the most likely reading.",
    "Never invent data. The teacher checks your solution before sharing it.",
  ].join("\n"),
  user: async (input, ctx) => {
    const blocks: Anthropic.Messages.ContentBlockParam[] = [];
    if (input.imageFileId) {
      const { bytes, mime } = await ctx.readFile(input.imageFileId, DOUBT_IMAGE_MIMES);
      blocks.push({ type: "image", source: { type: "base64", media_type: mime as (typeof DOUBT_IMAGE_MIMES)[number], data: Buffer.from(bytes).toString("base64") } });
    }
    blocks.push({
      type: "text",
      text: [
        input.question ? `Doubt: ${input.question}` : "The doubt is in the photo.",
        input.subject ? `Subject: ${input.subject}` : "",
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return blocks;
  },
  precheck: async (input, ctx) => {
    if (!input.imageFileId) return;
    const f = await ctx.findFile(input.imageFileId);
    if (!f || !f.uploaded || !(DOUBT_IMAGE_MIMES as readonly string[]).includes(f.mime) || f.bytes > MCQ_MAX_IMAGE_BYTES) {
      throw new ApiHttpException(400, "AI_INPUT_FILE_INVALID");
    }
  },
  finish: (out): DoubtSolveOutput => {
    const steps = out.steps.map((s) => s.trim()).filter(Boolean).slice(0, 50);
    if (!out.answer.trim() && !steps.length) throw new AiJobError("AI_BAD_OUTPUT", false, "no solution");
    return {
      question: out.question.trim(),
      answer: out.answer.trim(),
      steps,
      shortcutTrick: out.shortcutTrick.trim(),
      commonMistake: out.commonMistake.trim(),
      similarQuestions: out.similarQuestions.map((s) => s.trim()).filter(Boolean).slice(0, 20),
    };
  },
  steps: () => 1,
  fixture: (input) => ({
    question: input.question || "फ़ोटो से पढ़ा गया नमूना प्रश्न",
    answer: "नमूना उत्तर (AI का नहीं)",
    steps: ["नमूना चरण 1", "नमूना चरण 2", "नमूना चरण 3"],
    shortcutTrick: "नमूना ट्रिक",
    commonMistake: "",
    similarQuestions: ["नमूना समान प्रश्न 1", "नमूना समान प्रश्न 2"],
  }),
};

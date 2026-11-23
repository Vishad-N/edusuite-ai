import type Anthropic from "@anthropic-ai/sdk";
import {
  MCQ_IMAGE_MIMES,
  MCQ_MAX_IMAGE_BYTES,
  McqExtractInputSchema,
  McqExtractOutputSchema,
  type McqExtractInput,
  type McqExtractOutput,
  type McqExtractResult,
} from "@edusuite/shared";
import { ApiHttpException } from "../common/errors";
import type { JobDefinition } from "./definitions";

/**
 * mcq_extract (plan §08 "Screenshot → MCQ", DN-057): Claude reads one multiple-choice
 * question from each uploaded screenshot. Hindi is read from the image itself, not
 * from OCR. The teacher checks every answer Claude worked out before using it.
 */
const SYSTEM = [
  "You read multiple-choice questions from screenshots for teachers at Indian coaching institutes (competitive exams such as MPPSC, SSC, Vyapam, TET). The questions are usually in Hindi (Devanagari), sometimes in English or both.",
  "Each screenshot normally holds one question with four options. Rules:",
  "1. Transcribe the question and the four options exactly as shown, in their own language and script. Fix nothing silently; keep numbers, units and names as printed. Drop the option letters or numbers (a, b, A), (1), क, ख …).",
  "2. Read Devanagari carefully: matras, half letters and conjuncts change meaning. If a word is unreadable, write your best reading and mention it in the note.",
  "3. If the screenshot marks or states the answer (a tick, highlight, 'Ans', 'उत्तर'), use it and set answerFromImage to true. Otherwise work out the correct answer from subject knowledge and set answerFromImage to false.",
  "4. trick: one short exam tip or the reason for the answer, in the question's language. Empty if you have nothing useful.",
  "5. If a screenshot has no readable MCQ, set found to false and leave the text fields empty. If it has more than one question, read the first and say so in the note. If options are missing, write what is there and explain in the note.",
  "6. Ignore watermarks, logos, channel names, page numbers and advertisements; never copy them into the question.",
  "Return exactly one item per screenshot, numbered as given.",
].join("\n");

const LETTERS = ["A", "B", "C", "D"] as const;

export const mcqExtract: JobDefinition<McqExtractInput, McqExtractOutput> = {
  type: "mcq_extract",
  input: McqExtractInputSchema,
  output: McqExtractOutputSchema,
  effort: "medium",
  maxTokens: 32000,
  system: SYSTEM,
  user: async (input, ctx) => {
    const blocks: Anthropic.Messages.ContentBlockParam[] = [];
    for (const [i, fileId] of input.fileIds.entries()) {
      const { bytes, mime } = await ctx.readFile(fileId, MCQ_IMAGE_MIMES);
      blocks.push({ type: "text", text: `Screenshot ${i + 1}:` });
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: mime as (typeof MCQ_IMAGE_MIMES)[number], data: Buffer.from(bytes).toString("base64") },
      });
    }
    blocks.push({
      type: "text",
      text: [`${input.fileIds.length} screenshot(s).`, input.subject ? `Subject: ${input.subject}` : "", "Read the question in each screenshot, following the rules."]
        .filter(Boolean)
        .join("\n"),
    });
    return blocks;
  },
  precheck: async (input, ctx) => {
    for (const fileId of input.fileIds) {
      const f = await ctx.findFile(fileId);
      if (!f || !f.uploaded || !(MCQ_IMAGE_MIMES as readonly string[]).includes(f.mime) || f.bytes > MCQ_MAX_IMAGE_BYTES) {
        throw new ApiHttpException(400, "AI_INPUT_FILE_INVALID");
      }
    }
  },
  // One entry per screenshot, in input order; a screenshot Claude skipped counts as not found.
  finish: (output, input): McqExtractResult => ({
    items: input.fileIds.map((fileId, i) => {
      const it = output.items.find((x) => x.screenshot === i + 1);
      if (!it || !it.found) {
        return { fileId, found: false, question: "", options: { A: "", B: "", C: "", D: "" }, correct: "A", answerFromImage: false, trick: "", note: it?.note.trim() ?? "" };
      }
      return {
        fileId,
        found: true,
        question: it.question.trim(),
        options: { A: it.options.A.trim(), B: it.options.B.trim(), C: it.options.C.trim(), D: it.options.D.trim() },
        correct: it.correct,
        answerFromImage: it.answerFromImage,
        trick: it.trick.trim(),
        note: it.note.trim(),
      };
    }),
  }),
  steps: () => 1,
  fixture: (input) => ({
    items: input.fileIds.map((_, i) => ({
      screenshot: i + 1,
      found: true,
      question: `नमूना प्रश्न ${i + 1}: यह स्क्रीनशॉट से पढ़ा गया प्रश्न है (AI का नहीं)।`,
      options: { A: "पहला विकल्प", B: "दूसरा विकल्प", C: "तीसरा विकल्प", D: "चौथा विकल्प" },
      correct: LETTERS[i % 4]!,
      answerFromImage: i % 2 === 0,
      trick: "नमूना ट्रिक",
      note: i === 1 ? "Sample note: the answer is not marked on the screenshot." : "",
    })),
  }),
};

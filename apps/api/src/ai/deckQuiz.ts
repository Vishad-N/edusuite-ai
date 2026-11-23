import {
  DECK_QUIZ_MAX_PDF_BYTES,
  DECK_QUIZ_MAX_QUESTIONS,
  DeckQuizInputSchema,
  DeckQuizOutputSchema,
  normalizeDeckQuiz,
  type DeckQuiz,
  type DeckQuizInput,
  type DeckQuizOutput,
} from "@edusuite/shared";
import { ApiHttpException } from "../common/errors";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/**
 * deck_quiz (DN-055): an MCQ deck (PDF) becomes bilingual quiz data. The rules follow
 * docs/prompts/deck-to-interactive-quiz.md, sections 2–4 (extraction, answers, visuals),
 * with the institute, exam and subject filled per job. The HTML is built from a fixed
 * template by buildDeckQuizHtml; Claude writes no code.
 */
const SYSTEM = [
  "You are a careful instructional designer for an Indian coaching institute. You turn the institute's multiple-choice question deck (a PDF) into data for a bilingual (Hindi + English) interactive quiz used by competitive-exam students (SSC, UPSC, MPPSC, TET and similar).",
  "",
  "Accuracy beats speed. Rules:",
  "1. Find every question slide. Skip title slides, banners, advertisements, contact details and closing slides; never copy any of their text into the quiz.",
  "2. Transcribe each question and its four options faithfully, in the deck's order. Hindi text extracted from PDFs is often garbled: read the rendered page to transcribe Hindi, and check that the Hindi and English say the same thing. If the deck has only one language, translate into the other accurately; keep standard technical terms, names and formulas as they are taught.",
  "3. Answers: if the deck marks or states the answer, use it and set answerInDeck to true. Otherwise work out the answer from subject knowledge and set answerInDeck to false; a teacher will confirm it. Never guess silently.",
  "4. If a question or option in the deck looks wrong (a typo that changes the meaning, two correct options, no correct option, a duplicate option), keep the deck's text, choose the best answer, and describe the problem in that question's note. Do not silently fix the deck.",
  "5. Explanation: 1 to 3 short, exam-oriented sentences in each language that say why the answer is right (and, when useful, why a tempting option is wrong).",
  "6. Visual: the concept the question tests as a short title, plus 2 to 5 short facts (each under 15 words, in both languages) that explain it. Mark as key the one or two facts the correct answer rests on. Facts must be accurate and must not simply restate the options.",
  "7. Do not invent links, phone numbers, prices or names of people or institutes. Do not mention any coaching institute by name.",
  `8. At most ${DECK_QUIZ_MAX_QUESTIONS} questions. If a page can't be read or a question is incomplete, leave it out and say so in issues.`,
].join("\n");

export const deckQuiz: JobDefinition<DeckQuizInput, DeckQuizOutput> = {
  type: "deck_quiz",
  input: DeckQuizInputSchema,
  output: DeckQuizOutputSchema,
  effort: "high",
  maxTokens: 64000,
  system: SYSTEM,
  user: async (input, ctx) => {
    const pdf = await ctx.readFile(input.fileId, "application/pdf");
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
      {
        type: "text",
        text: [
          `Institute: ${ctx.instituteName}`,
          `Exam: ${input.exam}`,
          `Subject / unit: ${input.subject}`,
          "Turn every question in this deck into quiz data, following the rules.",
        ].join("\n"),
      },
    ];
  },
  precheck: async (input, ctx) => {
    const file = await ctx.findFile(input.fileId);
    if (!file || !file.uploaded || file.mime !== "application/pdf" || file.bytes > DECK_QUIZ_MAX_PDF_BYTES) {
      throw new ApiHttpException(400, "AI_INPUT_FILE_INVALID");
    }
  },
  finish: (output): DeckQuiz => {
    const quiz = normalizeDeckQuiz(output);
    if (!quiz) throw new AiJobError("AI_BAD_OUTPUT", false, "no usable questions");
    return quiz;
  },
  steps: () => 1,
  // A predictable sample (DN-012): three questions about reading the deck, clearly not real content.
  fixture: (input) => {
    const q = (n: number, answer: number, answerInDeck: boolean) => ({
      q: { hi: `नमूना प्रश्न ${n}: ${input.subject} का कौन-सा विकल्प सही है?`, en: `Sample question ${n}: which option about ${input.subject} is correct?` },
      options: ["अ", "ब", "स", "द"].map((l, i) => ({ hi: `विकल्प ${l}`, en: `Option ${"ABCD"[i]}` })),
      answer,
      answerInDeck,
      explanation: { hi: "यह नमूना उत्तर है, AI का नहीं।", en: "This is a sample answer, not the AI's." },
      visual: {
        title: { hi: "मुख्य अवधारणा", en: "Key idea" },
        points: [
          { hi: "पहला तथ्य", en: "First fact", key: true },
          { hi: "दूसरा तथ्य", en: "Second fact", key: false },
          { hi: "तीसरा तथ्य", en: "Third fact", key: false },
        ],
      },
      note: n === 3 ? "Sample note: option C repeats option B in the deck." : "",
    });
    return {
      title: { hi: input.subject, en: "Sample quiz" },
      questions: [q(1, 0, true), q(2, 2, false), q(3, 1, false)],
      issues: ["Sample: page 4 could not be read."],
    };
  },
};

import { LessonPlanInputSchema, LessonPlanOutputSchema, type LessonPlanInput, type LessonPlanOutput } from "@edusuite/shared";
import type { JobDefinition } from "./definitions";
import { AiJobError } from "./runner";

/**
 * lesson_plan (plan §08, DN-059): objectives and exactly one plan entry per teaching
 * day, for LessonPlanner. The teacher reviews and edits before saving.
 */
const LANGUAGE_RULE: Record<LessonPlanInput["language"], string> = {
  hi: "Write everything in clear Hindi (Devanagari). Keep standard technical terms as they are taught.",
  en: "Write everything in clear English.",
  both: "Write in Hindi (Devanagari) with key technical terms also in English in brackets.",
};

/** Exactly `days` entries: extra days are dropped, missing ones become empty days to fill. */
export function fitLessonPlan(out: LessonPlanOutput, input: LessonPlanInput): LessonPlanOutput {
  const objectives = out.objectives.map((o) => o.trim()).filter(Boolean).slice(0, 50);
  const days = out.days
    .map((d) => ({ topic: d.topic.trim(), activities: d.activities.trim(), homework: d.homework.trim() }))
    .filter((d) => d.topic || d.activities)
    .slice(0, input.days);
  if (!days.length) throw new AiJobError("AI_BAD_OUTPUT", false, "no usable days");
  while (days.length < input.days) days.push({ topic: "", activities: "", homework: "" });
  return { objectives, days };
}

export const lessonPlan: JobDefinition<LessonPlanInput, LessonPlanOutput> = {
  type: "lesson_plan",
  input: LessonPlanInputSchema,
  output: LessonPlanOutputSchema,
  effort: "medium",
  maxTokens: 16000,
  system: [
    "You write lesson plans for teachers at Indian coaching institutes and schools (competitive exams such as MPPSC, SSC, Vyapam, TET, and school boards).",
    "Plan the chapter in a sensible teaching order across exactly the given number of class days: introduce, build up, practise, and end with revision or a short test when there are enough days.",
    "Objectives are measurable (what students will be able to do). Each day has a short topic, a realistic plan for one class period, and specific homework.",
    "Be accurate to the syllabus a teacher of that class and subject would follow. Never invent facts. The teacher will review and edit the plan.",
  ].join("\n"),
  user: (input) => [
    {
      type: "text",
      text: [
        `Chapter / unit: ${input.chapter}`,
        `Subject: ${input.subject}`,
        input.grade ? `Class / batch: ${input.grade}` : "",
        `Class days: ${input.days}`,
        input.focus ? `Teacher's focus: ${input.focus}` : "",
        LANGUAGE_RULE[input.language],
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ],
  finish: fitLessonPlan,
  steps: () => 1,
  fixture: (input) => ({
    objectives: [`नमूना लक्ष्य 1: ${input.chapter}`, "नमूना लक्ष्य 2", "नमूना लक्ष्य 3"],
    days: Array.from({ length: input.days }, (_, i) => ({
      topic: `नमूना विषय ${i + 1}`,
      activities: "नमूना गतिविधि (AI का नहीं)।",
      homework: i === input.days - 1 ? "" : `नमूना होमवर्क ${i + 1}`,
    })),
  }),
};

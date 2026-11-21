import { z } from "zod";
import type { Permission } from "./permissions.ts";
import { PageQuerySchema } from "./pagination.ts";

/**
 * Saved work from the tool screens (plan §06 "one documents table", ADR-3).
 * Each type's `content` is checked by its own zod schema here, used by the API
 * on save and by the desktop app when reopening. Shapes mirror the state each
 * screen already holds, so wiring a screen doesn't change its data (DN-038).
 * Bump the type's version when its shape changes, and keep reading old ones.
 */

const text = (max = 5000) => z.string().max(max);
const shortText = (max = 300) => z.string().trim().max(max);
const list = <T extends z.ZodType>(item: T, max = 500) => z.array(item).max(max);

const Option4 = z.object({ A: text(1000), B: text(1000), C: text(1000), D: text(1000) });

export const PptContentSchema = z.object({
  title: shortText(),
  subtitle: shortText().optional(),
  grade: shortText(100).optional(),
  subject: shortText(100).optional(),
  theme: shortText(40).optional(),
  slides: list(
    z.object({
      tag: shortText(100).optional(),
      title: shortText(),
      points: list(text(1000), 20),
      takeaway: text(1000).optional(),
    }),
    200,
  ),
});

export const McqSetContentSchema = z.object({
  sessionTitle: shortText(),
  facultyName: shortText(160).optional(),
  subject: shortText(160).optional(),
  examTag: shortText(160).optional(),
  theme: shortText(40).optional(),
  layoutMode: shortText(40).optional(),
  questions: list(
    z.object({
      qNum: z.number().int().min(1),
      exam: shortText(160).optional(),
      question: text(4000),
      options: Option4,
      correct: z.enum(["A", "B", "C", "D"]),
      trick: text(2000).optional(),
      /** The uploaded screenshot (files API, Phase 3). */
      screenshotFileId: z.uuid().optional(),
    }),
    300,
  ),
});

export const PaperContentSchema = z.object({
  title: shortText(),
  grade: shortText(100).optional(),
  subject: shortText(100).optional(),
  duration: shortText(60).optional(),
  totalMarks: z.number().int().min(0).max(10000).optional(),
  showAnswerKey: z.boolean().optional(),
  sections: list(
    z.object({
      name: shortText(),
      questions: list(
        z.object({ q: text(4000), options: list(text(1000), 10).optional(), ans: text(4000).optional() }),
        300,
      ),
    }),
    20,
  ),
});

export const DppContentSchema = z.object({
  templateType: z.enum(["dpp", "notebook", "omr"]),
  subject: shortText(),
  topic: shortText(),
  targetBatch: shortText(160).optional(),
  omrQuestionsCount: z.number().int().min(1).max(200).optional(),
  questions: list(z.object({ q: text(4000), hint: text(1000).optional() }), 200),
});

export const LessonContentSchema = z.object({
  chapter: shortText(),
  subject: shortText(160),
  grade: shortText(100).optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  objectives: list(text(1000), 50),
  schedule: list(
    z.object({ day: shortText(100), topic: shortText(), activities: text(4000), homework: text(4000) }),
    365,
  ),
});

export const BookContentSchema = z.object({
  title: shortText(),
  subtitle: shortText().optional(),
  targetExam: shortText().optional(),
  subject: shortText().optional(),
  author: shortText().optional(),
  edition: shortText(100).optional(),
  coverColor: shortText(120).optional(),
  chapters: list(
    z.object({
      number: z.number().int().min(1),
      title: shortText(),
      subtitle: shortText().optional(),
      theory: list(text(20000), 200),
      highlights: list(text(2000), 100),
      practiceQuestions: list(z.object({ q: text(4000), options: list(text(1000), 10), ans: text(4000) }), 500),
    }),
    100,
  ),
});

export const DoubtContentSchema = z.object({
  question: text(8000),
  subject: shortText(160).optional(),
  answer: text(2000),
  steps: list(text(4000), 50),
  shortcutTrick: text(2000).optional(),
  commonMistake: text(2000).optional(),
  similarQuestions: list(text(2000), 20),
});

export const YoutubeContentSchema = z.object({
  headline: shortText(),
  punchline: shortText().optional(),
  facultyName: shortText(160).optional(),
  liveBadge: shortText(100).optional(),
  tagline: shortText().optional(),
  bgTheme: shortText(40).optional(),
  title: shortText(200).optional(),
  description: text(5000).optional(),
  tags: list(shortText(100), 60).optional(),
});

export const NoticeContentSchema = z.object({
  category: shortText(100).optional(),
  title: shortText(),
  date: shortText(60).optional(),
  whatsappText: text(5000),
  formalText: text(10000),
});

export const PosterContentSchema = z.object({
  category: shortText(60),
  aspectRatio: shortText(20).optional(),
  headline: shortText(),
  subheading: shortText().optional(),
  tagline: shortText().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const DOCUMENT_TYPES = ["ppt", "mcq_set", "paper", "dpp", "lesson", "book", "doubt", "youtube", "notice", "poster"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_CONTENT_SCHEMAS = {
  ppt: PptContentSchema,
  mcq_set: McqSetContentSchema,
  paper: PaperContentSchema,
  dpp: DppContentSchema,
  lesson: LessonContentSchema,
  book: BookContentSchema,
  doubt: DoubtContentSchema,
  youtube: YoutubeContentSchema,
  notice: NoticeContentSchema,
  poster: PosterContentSchema,
} as const satisfies Record<DocumentType, z.ZodType>;

export type DocumentContent<T extends DocumentType> = z.infer<(typeof DOCUMENT_CONTENT_SCHEMAS)[T]>;

/** Current content version per type; stored in documents.schema_version. */
export const DOCUMENT_SCHEMA_VERSIONS: Record<DocumentType, number> = {
  ppt: 1,
  mcq_set: 1,
  paper: 1,
  dpp: 1,
  lesson: 1,
  book: 1,
  doubt: 1,
  youtube: 1,
  notice: 1,
  poster: 1,
};

/** Permission needed to create, open or list a document type (same as the screen that makes it). */
export const DOCUMENT_PERMISSIONS = {
  ppt: "ai.content",
  mcq_set: "ai.screenshot_ppt",
  paper: "ai.content",
  dpp: "ai.content",
  lesson: "ai.content",
  book: "ai.content",
  doubt: "ai.content",
  youtube: "ai.content",
  notice: "notices",
  poster: "image_studio",
} as const satisfies Record<DocumentType, Permission>;

/** Largest content accepted, as JSON (a full book is the biggest case). */
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

export const DocumentSummarySchema = z.object({
  id: z.uuid(),
  type: z.enum(DOCUMENT_TYPES),
  title: z.string(),
  branchId: z.uuid(),
  createdBy: z.object({ id: z.uuid(), displayName: z.string() }),
  schemaVersion: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

export const DocumentSchema = DocumentSummarySchema.extend({ content: z.unknown() });
export type SavedDocument<T extends DocumentType = DocumentType> = Omit<z.infer<typeof DocumentSchema>, "content"> & {
  type: T;
  content: DocumentContent<T>;
};

export const DocumentListQuerySchema = PageQuerySchema.extend({
  type: z.enum(DOCUMENT_TYPES),
  q: z.string().trim().max(100).optional(),
  /** Only documents the caller created. */
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;

export const DocumentCreateSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  title: z.string().trim().min(1).max(200),
  content: z.unknown(),
});
export type DocumentCreate = z.infer<typeof DocumentCreateSchema>;

export const DocumentUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.unknown().optional(),
    /**
     * The updatedAt the client last saw. If someone else saved in between, the
     * API answers 409 instead of silently overwriting their work.
     */
    expectedUpdatedAt: z.iso.datetime(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, { message: "nothing to update" });
export type DocumentUpdate = z.infer<typeof DocumentUpdateSchema>;

/** Validates `content` for its type; returns the parsed value or the zod error. */
export function parseDocumentContent(type: DocumentType, content: unknown) {
  return DOCUMENT_CONTENT_SCHEMAS[type].safeParse(content);
}

/**
 * The role/permission matrix from the architecture plan (§09 Security and roles),
 * with the gaps filled by DN-007, DN-008 and DN-009.
 *
 * The API's permission guard and the desktop Sidebar both read this file,
 * so the menu and the server can never disagree.
 */

/** Roles inside an institute. These are the only roles the users API can give (DN-034). */
export const ROLES = ["superadmin", "branch_admin", "teacher", "typist", "counselor"] as const;
export type InstituteRole = (typeof ROLES)[number];

/**
 * The EduSuite operator (DN-053): sits above all institutes and manages their AI
 * credits. Created only with a server command, never through the users API.
 */
export const PLATFORM_ROLE = "platform_admin" as const;
export const ALL_ROLES = [...ROLES, PLATFORM_ROLE] as const;
export type Role = (typeof ALL_ROLES)[number];

/**
 * How far a grant reaches.
 * - `institute`: every branch of the user's own institute.
 * - `branch`: only the user's own branch(es).
 * - `platform`: every institute (the EduSuite operator only; never used to scope tenant data).
 */
export type Scope = "institute" | "branch" | "platform";

export const PERMISSIONS = [
  "users.manage",
  "institute.settings",
  "ai.content",
  "ai.screenshot_ppt",
  "notices",
  "students.fees",
  "receipts.cancel",
  "image_studio",
  "image_studio.ai_copy",
  "audit.view",
  "dashboard.view",
  "teacher_desk.view",
  "platform.credits",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

type Matrix = Record<Permission, Partial<Record<Role, Scope>>>;

const I = "institute" as const;
const B = "branch" as const;
const P = "platform" as const;

export const PERMISSION_MATRIX: Matrix = {
  // Plan: Super ✓, Branch "branch". DN-009: block instead of delete.
  "users.manage": { superadmin: I, branch_admin: B },
  // Plan: Super ✓, Branch "own".
  "institute.settings": { superadmin: I, branch_admin: B },
  "ai.content": { superadmin: I, branch_admin: B, teacher: B, typist: B },
  "ai.screenshot_ppt": { superadmin: I, branch_admin: B, teacher: B, typist: B },
  "notices": { superadmin: I, branch_admin: B, teacher: B, counselor: B },
  // DN-007: typists don't handle fees.
  "students.fees": { superadmin: I, branch_admin: B, counselor: B },
  "receipts.cancel": { superadmin: I, branch_admin: B },
  // DN-008: everyone gets the templates; only AI-content roles get AI copy.
  "image_studio": { superadmin: I, branch_admin: B, teacher: B, typist: B, counselor: B },
  "image_studio.ai_copy": { superadmin: I, branch_admin: B, teacher: B, typist: B },
  "audit.view": { superadmin: I, branch_admin: B },
  // DN-008: Dashboard for everyone; TeacherDesk for Super, Branch and Teacher.
  "dashboard.view": { superadmin: I, branch_admin: B, teacher: B, typist: B, counselor: B },
  "teacher_desk.view": { superadmin: I, branch_admin: B, teacher: B },
  // DN-053: only the EduSuite operator grants credits and sets prices.
  "platform.credits": { platform_admin: P },
};

/** Returns the scope the role holds for this permission, or `null` if it has none. */
export function scopeFor(role: Role, permission: Permission): Scope | null {
  return PERMISSION_MATRIX[permission][role] ?? null;
}

export function can(role: Role, permission: Permission): boolean {
  return scopeFor(role, permission) !== null;
}

/** Desktop screen ids (the keys used by the Sidebar) mapped to the permission each needs. */
export const SCREEN_PERMISSIONS = {
  dashboard: "dashboard.view",
  users: "users.manage",
  teacher_desk: "teacher_desk.view",
  ocr_ppt: "ai.screenshot_ppt",
  deck_quiz: "ai.content",
  youtube: "ai.content",
  ppt: "ai.content",
  doubt: "ai.content",
  book: "ai.content",
  dpp: "ai.content",
  test: "ai.content",
  lesson: "ai.content",
  receipt: "students.fees",
  image: "image_studio",
  notice: "notices",
  platform: "platform.credits",
  audit: "audit.view",
} as const satisfies Record<string, Permission>;

export type ScreenId = keyof typeof SCREEN_PERMISSIONS;

export function visibleScreens(role: Role): ScreenId[] {
  return (Object.keys(SCREEN_PERMISSIONS) as ScreenId[]).filter((id) =>
    can(role, SCREEN_PERMISSIONS[id]),
  );
}

/** AI job types (plan §04/§08) mapped to the permission needed to start one. */
export const AI_JOB_PERMISSIONS = {
  ppt_outline: "ai.content",
  paper_generate: "ai.content",
  mcq_extract: "ai.screenshot_ppt",
  dpp_generate: "ai.content",
  lesson_plan: "ai.content",
  doubt_solve: "ai.content",
  youtube_meta: "ai.content",
  notice_draft: "notices",
  book_chapter: "ai.content",
  poster_copy: "image_studio.ai_copy",
  // DN-053/DN-055: a PDF deck becomes an interactive bilingual quiz.
  deck_quiz: "ai.content",
} as const satisfies Record<string, Permission>;

export type AiJobType = keyof typeof AI_JOB_PERMISSIONS;

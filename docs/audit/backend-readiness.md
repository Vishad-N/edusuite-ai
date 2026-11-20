# Backend readiness

- **Date:** 2026-11-20
- **Scope:** Step 1 of `master-build-prompt.md`. Gap analysis between the plan (`edusuite-architecture.html`, `AGENT_README.md`) and the code. No code was changed.
- **Companion report:** `docs/audit/frontend-audit.md`.

---

## 1. Where the code stands against each phase

| Phase | Plan's "done when" | Today | Gap |
|---|---|---|---|
| 1 · Foundation | Monorepo, `packages/shared`, NestJS, Prisma schema, Compose, Caddy, CI, `/health` `/ready` | Single Vite app at repo root. No TypeScript, no tests, no `typecheck`. CI only builds the macOS DMG. Git repo has no commits, and its `.git` folder sits in an empty `edusuite-ai/` subfolder, not with the code | Everything. Also needs a working git repo first (Q-01) |
| 2 · Auth, users, institutes | argon2id, JWT + refresh, permission matrix, audit log, safeStorage, Electron hardening | Fake login, plain-text passwords in localStorage, `webSecurity: false`, no sandbox, no CSP, preload exposes only `platform` and `version` | Everything |
| 3 · Save everything | Documents + files APIs; 14 screens save, reopen, list history | Nothing is saved | Everything |
| 4 · Real AI | BullMQ worker, job registry, SSE, metering, quota | 10 `setTimeout` fakes and hard-coded output | Everything |
| 5 · Students and fees | Counters with row lock, idempotent receipts, cancel only | Receipt form with a fixed number, nothing stored | Everything |
| 6 · Ship | Signed NSIS, updater, backups, restore drill, load test | Unsigned NSIS (`oneClick: false`, per-machine choice), no updater, a 1 GB `release/` folder of old builds in the source tree | Everything |

What can be reused as is: all component markup, `pptxGenerator.js` (moves to `packages/shared`), `motionHtmlGenerator.js` + `motionTemplate.js` (after escaping is fixed), print CSS, `translations.js` structure, the electron-builder config (needs changes in Phase 6).

---

## 2. Contradictions and open questions

Each item needs a decision from you. I recommend an option for each; nothing will be built on these until you answer.

| ID | Conflict | Options | Recommendation |
|---|---|---|---|
| **Q-01** | Git setup. The prompt says to commit `CLAUDE.md`, the notes and `docs/` and then create a worktree. The repo has no commits, git has no name/email, and `.git` is in the empty `edusuite-ai/` subfolder (moving it was blocked by a permission check). | A) Move `.git` up to the project root, set your git identity, make the initial commit on `main`, then work on a feature branch. B) Delete `.git` and re-init at the root. | **A.** No history is lost because there are no commits. |
| **Q-02** | Doc paths. `CLAUDE.md`, `AGENT_README.md` and the prompt say `docs/architecture/edusuite-architecture.html`; the file is at the repo root. | A) Move it to `docs/architecture/` in Phase 1. B) Change the docs to point at the root. | **A.** Matches the target layout in AGENT_README §5. |
| **Q-03** | Track A vs the plan. The plan says "keep navy/amber, keep every Tailwind class", and golden rule 2 says "don't redesign". The prompt widens that for polish. Option B in the prompt (Claude ivory/clay re-skin) contradicts the plan's constraint outright. | A) Principles only, keep the brand (slate ink + one amber accent). B) Full re-skin. | **A**, as the prompt also recommends. It keeps the brand staff already know. |
| **Q-04** | Journey D uses a typist issuing a fee receipt, but the plan's matrix gives DTP/Typist **no** access to students, fees or ID cards. | A) Keep the matrix; use a Counselor in journey D. B) Give Typist fee access. | **A.** Money stays with roles that are accountable for it. |
| **Q-05** | Matrix gaps. Image Studio is ✓ for Counselor, but Counselor has ✗ for "AI content tools", and Image Studio runs the `poster_copy` AI job. TeacherDesk and Dashboard aren't in the matrix. | A) Counselor gets Image Studio templates only; the AI copy button is disabled for them. TeacherDesk: Super, Branch, Teacher. Dashboard: everyone. B) Counselor gets `poster_copy` too. | **A.** Keeps AI spend with roles that need it. |
| **Q-06** | Branch admin and users. The plan lets a Branch admin manage users in their own branch; today `admin` can't open UserManagement. The UI also has permanent **delete**, but the API has only block/reset. | A) Follow the plan: Branch admin manages own-branch users; no delete, only block (keeps the audit trail). B) Keep delete for Super admin as a soft delete. | **A.** |
| **Q-07** | Routing. The prompt asks for deep links, return-after-login and unsaved-changes guards "from App.jsx", but there is no router, and the plan names none. Adding one is a new dependency. | A) Add `react-router` (data router, hash history, which suits `file://` in Electron). B) TanStack Router. C) A small hand-rolled hash router. | **A.** Most widely known; hash history avoids `file://` path problems. |
| **Q-08** | TypeScript. Conventions require `strict` TS for new code and a `typecheck` script; the app is JSX with no `tsconfig`. | A) Add `tsconfig` with `allowJs` in Phase 1; new files in TS, old JSX converted only when edited (as AGENT_README §7 says). B) Convert everything up front. | **A.** |
| **Q-09** | Fixture AI mode (`AI_MODE=fixture`) is beyond the plan; the prompt says to ask first. | A) Build it: the worker replays recorded Claude responses keyed by job type and an input hash; refused when `NODE_ENV=production`; UI shows a badge. B) Skip it; tests mock the SDK only. | **A.** Tests and offline demos cost nothing, and it matches "tests never call the live API". |
| **Q-10** | Fee receipt details the plan leaves open: the financial-year reset (April 1?), the branch code in `IND-BKN/2026-27/000431`, and whether receipts are GST invoices (the UI says "GST receipt"; the schema has no tax fields). | A) Numbering per branch per financial year (resets 1 April), branch code stored on `branches`; no GST until you confirm the institute is registered. B) Add GST fields now. | **A.** Tax treatment is a business/legal decision for you, not the code. |
| **Q-11** | Data model gaps. The ER diagram omits columns that rules elsewhere require: `institute_id` on `ai_job`, `ai_usage`, `question`, `file`, `fee_receipt`; `branch_id` + `student_id` + `status` + `cancel_reason` on `fee_receipt`; `created_by` and `deleted_at` on `document` (the API has `DELETE /documents/:id`, and deletions must be audited). | A) Add them in the Phase 1 schema, soft-delete documents. B) Hard-delete documents. | **A.** |
| **Q-12** | Login branch. Staff pick a branch on the login screen. The plan says never trust a client `branchId`. | A) Branch comes from the user record; staff allowed at several branches get a server-side list and pick from it. B) Remove the picker. | **A.** |
| **Q-13** | Installer. The plan wants `oneClick: true, perMachine: false` (no admin prompt); today it's `oneClick: false` with a folder chooser. Phase 6 change. | A) Follow the plan. B) Keep the chooser. | **A**, when Phase 6 starts. |
| **Q-14** | Skills named in the prompt (`claude`, `web-design-guidelines`, `ecc:nestjs-patterns`, `ecc:prisma-patterns`, `ecc:docker-patterns`, `ecc:e2e-testing`, `ecc:windows-desktop-e2e`) are not installed in this environment. `frontend-ui-engineering`, `design:accessibility-review` and `claude-api` are. | A) Install them before the tracks that need them. B) Proceed without them. | **A** if you have them; otherwise B is fine. |
| **Q-15** | Offline drafts. The plan mentions drafts kept in IndexedDB while offline, but no phase includes it. | A) Defer; show "offline, saving paused". B) Add to Phase 3. | **A.** |
| **Q-16** | The `release/` folder (1 GB of old installers) is in the source tree; AGENT_README says to move installers only after asking. It's now git-ignored. | A) Move it outside the repo. B) Leave it, ignored. | **B** for now; it's already ignored. |
| **Q-17** | The mac DMG workflow runs on every push and PR to `main`. Once you push, each push uses macOS runner minutes. | A) Change it to tags and manual runs only. B) Leave it. | **A.** |

---

## 3. Screen → API → schema → tables → AI job

Endpoint paths are under `/api/v1`. Schema names are proposed for `packages/shared`.

| Screen | Endpoints | Zod schemas | Tables | AI job |
|---|---|---|---|---|
| LoginScreen | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /me` | `LoginRequest`, `LoginResponse`, `Me` | `app_user`, `session`, `audit_log` | — |
| Header | `GET /me`, `GET /institutes`, `GET /institutes/:id/branches` | `Institute`, `Branch` | `institute`, `branch` | — |
| SettingsModal | `PATCH /institutes/:id` | `InstituteUpdate` | `institute`, `audit_log` | — (API key field removed) |
| UserManagement | `GET/POST /users`, `PATCH /users/:id`, `POST /users/:id/block`, `/reset-password` | `User`, `UserCreate`, `UserUpdate` | `app_user`, `audit_log` | — |
| Dashboard | `GET /stats/dashboard`, `GET /documents?cursor=` | `DashboardStats`, `DocumentSummary` | aggregates, `document` | — |
| TeacherDesk | `GET /stats/dashboard` (teacher scope), `GET /documents?createdBy=me` | `TeacherStats` | `document` (schedule/syllabus have no table: Q-18 below) | — |
| PptMaker | `POST /ai/jobs`, `GET /ai/jobs/:id/events`, `/documents` CRUD, `POST /documents/:id/export` | `PptOutlineInput`, `Presentation` | `ai_job`, `ai_usage`, `document`, `file` | `ppt_outline` → `pptx_build` |
| ScreenshotToPpt | `POST /files/presign`, `POST /ai/jobs`, SSE, `/documents`, export | `McqExtractInput`, `McqSet` | `file`, `ai_job`, `ai_usage`, `question`, `document` | `mcq_extract` → `pptx_build` / `html-motion` |
| QuestionPaperMaker | `/ai/jobs`, SSE, `/documents`, `GET /questions` | `PaperInput`, `QuestionPaper` | `document`, `question`, `ai_*` | `paper_generate` |
| NotebookDppMaker | `/ai/jobs`, SSE, `/documents`, `GET /questions` | `DppInput`, `Dpp` | `document`, `question`, `ai_*` | `dpp_generate` (notebook/OMR are templates, no AI) |
| LessonPlanner | `/ai/jobs`, SSE, `/documents` | `LessonInput`, `LessonPlan` | `document`, `ai_*` | `lesson_plan` |
| BookCreator | `/ai/jobs` (one per chapter, streamed), SSE, `/documents` | `BookInput`, `Book`, `BookChapter` | `document`, `ai_*` | `book_chapter` |
| DoubtSolver | `/files/presign` (photo), `/ai/jobs`, SSE, `/documents` | `DoubtInput`, `DoubtSolution` | `document`, `file`, `ai_*` | `doubt_solve` |
| YouTubeStudio | `/ai/jobs`, SSE, `/documents`; PNG export local | `YoutubeInput`, `YoutubeMeta` | `document`, `ai_*` | `youtube_meta` |
| NoticeHub | `/ai/jobs`, SSE, `/documents?type=notice` | `NoticeInput`, `Notice` | `document`, `ai_*` | `notice_draft` |
| ImageStudio | `/files/presign` (logo), `/ai/jobs`, `/documents`; PNG export local | `PosterInput`, `PosterCopy` | `file`, `document`, `ai_*` | `poster_copy` |
| IdAndFeeReceipt | `GET/POST /students`, `PATCH /students/:id`, `GET /students/:id/id-card`, `POST /fee-receipts` (Idempotency-Key), `GET /fee-receipts`, `POST /fee-receipts/:id/cancel` | `Student`, `FeeReceiptCreate`, `FeeReceipt`, `ReceiptCancel` | `student`, `fee_receipt`, `receipt_counter`, `file` (photo), `audit_log` | — |

**Q-18 · TeacherDesk data.** The plan maps TeacherDesk to stats and documents only. Its schedule, faculty list and syllabus tracker have no backing table. Recommendation: in Phase 3 show "my recent documents" and counts, and show schedule/syllabus as "coming soon" until you decide whether timetables belong in this product.

---

## 4. Risks, by severity

| # | Severity | Risk | Where | Fixed in |
|---|---|---|---|---|
| R1 | Critical | Any ID containing "super" logs in as super admin with any password; unknown IDs log in | `LoginScreen.jsx:91–105` | Phase 2 |
| R2 | Critical | Master passwords `123` / `admin123` / `admin770` open every account | `LoginScreen.jsx:84` | Phase 2 |
| R3 | Critical | Screenshot → PPT attaches unrelated sample questions to real uploads; wrong content in class | `ScreenshotToPpt.jsx:316–331` | Phase 4. Until then, I recommend disabling the upload path or labelling it "demo" (needs your OK; it's a UI change) |
| R4 | High | Plain-text passwords stored in localStorage and shown in the Users table | `employeeAccounts.js`, `UserManagement.jsx:385` | Phase 2 |
| R5 | High | `webSecurity: false`, no `sandbox`, no CSP; renderer loads `http://localhost:5173` whenever `dist/` is missing, even in a packaged build | `electron/main.cjs` | Phase 2 |
| R6 | High | Motion HTML built with unescaped string replacement and run in an iframe with `allow-scripts allow-same-origin` (the sandbox can be removed by the frame); stored XSS once content comes from the server | `motionHtmlGenerator.js`, `ScreenshotToPpt.jsx:1472` | Phase 3, before documents are shared |
| R7 | High | AI key field stored in localStorage (Gemini, unused) | `App.jsx:29`, `SettingsModal.jsx` | Phase 2 (field removed) |
| R8 | High | Fee receipt number is a constant; no record of money taken | `IdAndFeeReceipt.jsx:276` | Phase 5 |
| R9 | Medium | DoubtSolver and LessonPlanner ignore input; other tools return generic templates presented as AI output | several | Phase 4 (or "coming soon" earlier) |
| R10 | Medium | No audit trail; user delete is permanent | `UserManagement.jsx:170` | Phase 2 |
| R11 | Medium | No tests, no typecheck, no lint in CI | repo | Phase 1 |
| R12 | Medium | SettingsModal hook order bug may crash when opened | `SettingsModal.jsx:21` | First Track A/B change set touching it |
| R13 | Low | 1 GB of old installers in the source folder | `release/` | Ignored; Q-16 |
| R14 | Low | Real staff names and phone numbers in seed-like data (`employeeAccounts.js`, translations) | `src/data/*` | Replace with clearly fake seed data in Phase 2 |

---

## 5. Proposed order of change sets

Each change set is small and does one kind of thing. Nothing starts before you approve this report and answer the questions it depends on.

**Phase 1 · Foundation** (depends on Q-01, Q-02, Q-08)
1. Repo: fix git per Q-01, move the plan to `docs/architecture/`, feature branch.
2. Monorepo move: app into `apps/desktop` unchanged; npm workspaces; app still runs. One DN entry.
3. `packages/shared` with `permissions.ts` (matrix per Q-04/Q-05/Q-06) + unit tests; Vitest; `tsconfig` with `allowJs`; `typecheck` + `test` scripts.
4. `apps/api` NestJS on Fastify: `/health`, `/ready`, pino JSON logs, error shape `{code, message, details}`.
5. Prisma schema for all tables (with Q-11 columns), first migration.
6. `infra/`: `docker-compose.yml` + `docker-compose.local.yml` (Postgres 17, Redis 7, storage per ADR-5, API, worker), Caddyfile, `.env.example`.
7. CI: lint, typecheck, unit tests, API tests against a disposable Postgres, migration check. Mac workflow per Q-17.

**Track A primitives** (after Phase 1, so files move once; depends on Q-03)
8. DN entry for the Track A scope, then tokens in `src/index.css` (`@theme`), plus `lang="hi"` and a Devanagari font fallback (asks before adding a font package).
9. `src/components/ui/` primitives with states and a11y, plus tests.
10+. Migrate screens to tokens and primitives one screen per change set, starting with the four invisible headers (frontend audit §1.6).

**Phase 2 · Auth, users, institutes** (Q-06, Q-07, Q-12)
- Auth module (argon2id, lockout, JWT + rotating refresh to 23:59 IST, rate limit), audit module, users, institutes. API tests for wrong role and wrong institute on every route.
- Electron hardening: sandbox, `webSecurity: true`, CSP, preload bridge, safeStorage vault, single-instance lock, no localhost fallback in packaged builds.
- Wire LoginScreen, Header, SettingsModal and UserManagement through `src/api/` TanStack Query hooks; router per Q-07; error boundary; session expiry → login → return.
- Remove master passwords, the "super" trick, plain-text passwords, the API key field and `employeeAccounts.js`.

**Phase 3 · Save everything**: files (presign, type/size checks) and documents (cursor pagination, soft delete); fix motion HTML escaping and iframe sandbox (R6); every screen saves, reopens and lists history; Dashboard/TeacherDesk real data; remove `sampleData.js` imports as each screen is wired.

**Phase 4 · Real AI** (Q-09): worker, job registry, SSE, `JobProgress`, metering, quota, refusal and `max_tokens` messages. Jobs in the plan's order: PPT, paper, screenshot MCQ, DPP, lesson, doubt, YouTube, notice, book, poster copy. Each job removes its `setTimeout` fake in the same change set.

**Phase 5 · Students and fees** (Q-04, Q-10): students, receipt counters with `SELECT … FOR UPDATE`, idempotent receipts, cancel with reason, ID cards; concurrency test.

**Phase 6 · Ship** (Q-13): signed NSIS + electron-updater, `dist:nsis:local`, `dev:all`, restic backups + restore runbook, Playwright-Electron e2e, `docs/runbooks/local-testing.md`, load test.

**R3 is the only item I'd suggest acting on before Phase 4:** a one-line "demo data" label or disabling real uploads on Screenshot → PPT. That's a UI change, so it waits for your OK.

# Developer Notes: Decision Log

This file records every point where the AI agent (or a developer) was unsure and a decision was made. The rules for writing entries are in [`AGENT_README.md`](AGENT_README.md), section 4.

- Newest entries go at the top of the "Decision log".
- Never delete or rewrite old entries. Supersede them with a new one.
- Number entries in order: DN-001, DN-002, …

---

## Open questions

Decisions waiting for the developer. Remove a line here once its entry's status is updated.

- None.

---

## Decision log

### DN-074 · Question bank: shared per institute, filled from papers and MCQ sets, reused in papers
- **Date:** 2026-11-25
- **Phase / area:** Plan §06 `question`, DN-056 follow-up · `packages/shared/src/{questions,permissions}.ts`, `apps/api/src/questions/*`, `apps/desktop/src/{api/questions.ts,components/{QuestionBank,QuestionBankList,PaperBankTools,QuestionPaperMaker,ScreenshotToPpt,Sidebar}.*}`
- **Status:** Decided by agent (developer asked for all follow-ups; please review the sharing rule)
- **What was unclear:** The plan has a `question` table and "question bank" in the paper job's order, but no screens or routes. Who sees whose questions, how questions get in, and how duplicates are avoided.
- **Decision:**
  - **One bank per institute,** for every role with `ai.content` (super admin, branch admin, teacher, typist). Questions are teaching material rather than branch data, and the table has no branch column (no migration needed). Removal: whoever added it, or an admin. Other institutes never see it.
  - **API:**
    - `GET /questions`: search across Hindi, English and topic; filter by subject and "mine"; cursor pages, newest first
    - `GET /questions/subjects`: subjects with counts
    - `POST /questions/bulk`: up to 200 at a time
    - `DELETE /questions/:id`

    Text is tidied (spaces collapsed). An exact repeat of the same text in the same subject, whether in the batch or already in the bank, is skipped and counted, so pressing "add" twice doesn't double the bank. Bulk adds and deletes are audited.
  - **Getting questions in:**
    - **Test paper:** "MCQ प्रश्न बैंक में जोड़ें" takes every clean four-option MCQ with a recognisable answer letter, under the paper's subject and topics; it needs a subject.
    - **Screenshot MCQ set:** "प्रश्न बैंक में जोड़ें" takes every question with text and all four options, under the set's subject (or exam tag), keeping the trick.
  - **Reusing:** in the test paper, "प्रश्न बैंक से जोड़ें" opens the bank with search and filters. Checked questions are added to the current section as "A) …" options with the answer key.
  - **Screen "प्रश्न बैंक"** (study group in the sidebar): search, subject filter with counts, "केवल मेरे", the correct option highlighted, delete with confirmation (existing papers are unaffected).
- **Verified:**
  - Shared 54 tests (tidying, limits, paper ↔ bank conversion including "(c)" and "D." styles, non-MCQs skipped); the per-role screen list now includes the bank.
  - API 3 new tests:
    - batch and cross-call repeats skipped; same text in another subject kept; audit
    - search is case-insensitive; subject and "mine" filters; pages without overlap; a bad cursor gives 400; subject counts; another institute sees nothing
    - a counselor gets 403; answer "E" gives 400; deleting someone else's question is 403, another institute's is 404, your own or as an admin is 204
  - E2E: an AI paper (fixture) adds its MCQs; pressing again adds 0 and reports them as already there; the bank screen shows exactly those under the subject; a new paper takes one from the bank.
- **Revisit if:** branches want private banks, institutes want to import question sets (CSV/Excel), or short and long answers should be banked too.

### DN-073 · Deck quizzes are saved as documents with history
- **Date:** 2026-11-25
- **Phase / area:** DN-055 follow-up · `packages/shared/src/{documents,stats}.ts`, `apps/api/prisma` (migration `20261125000000_deck_quiz_documents`), `apps/desktop/src/{components/DeckQuiz.tsx,i18n/labels.ts}`
- **Status:** Decided by agent (developer asked for all follow-ups)
- **What was unclear:** DN-055 didn't save quizzes: leaving before downloading lost a 10-credit quiz. What to keep, and whether the quiz HTML or the data is stored.
- **Decision:**
  - **New document type `deck_quiz`** (`ai.content`, schema version 1): exam, subject, the uploaded deck's file id (optional), the reviewed quiz (`DeckQuizSchema`, or null before generating) and the indexes of answers the teacher checked. The data is stored, not the HTML; the file is built again on download, so it always uses the current template, name and logo.
  - **Migration:** `ALTER TYPE "DocumentType" ADD VALUE 'deck_quiz'` (the documents table uses a Postgres enum).
  - **Screen:** the shared save bar (title, New, History, Save, unsaved-change guard). The title fills from the quiz title. The screen's own "not downloaded yet, credits will be lost" guard is gone, because saving now keeps the work. Reopening restores the questions, answers and checks, so download is allowed at once if everything was checked.
  - **Dashboard:** counts and lists deck quizzes ("डेक क्विज़") like other documents and opens them on the quiz screen.
- **Verified:**
  - API: the documents test saves and reopens a quiz with its checks, saves one before generating, refuses a counselor (403), and finds it in the dashboard counts. Shared 52 tests (the type registries stay complete).
  - E2E: upload a PDF, generate (fixture), tick every flagged answer, save, New clears the screen, History → Open brings back the same questions, exam and checks, with download enabled.
- **Revisit if:** quizzes need sharing links for students (then host the HTML), or versions of the same quiz.

### DN-072 · PNG download for YouTube thumbnails and posters, at exact sizes
- **Date:** 2026-11-25
- **Phase / area:** DN-047 and DN-050 follow-up · `apps/desktop/electron/{capture,main,preload}.cjs`, `apps/desktop/src/{utils/exportPng.ts,components/{PngDownloadButton,YouTubeStudio,ImageStudio}.*}`
- **Status:** Decided by agent (DN-047 option A's follow-up; no new dependency)
- **What was unclear:** DN-047 and DN-050 removed the fake downloads and promised a real PNG later. Options were redrawing each design on a `<canvas>` (a second copy of every layout to maintain), an HTML-to-image library (a new dependency), or letting Chromium render the real design.
- **Decision:** Chromium renders the design itself, in the main process.
  - **What the page sends:** the design's HTML and the app's CSS, the export size, the on-screen width and the colour of the panel behind it (designs with see-through backgrounds rely on it). The page first waits for any size animation to finish, because a just-changed poster ratio animates.
  - **The render:** a hidden offscreen window with **JavaScript off**, its own session that may load only its own temp file and `data:` URLs (all other requests are cancelled, no permissions), and a CSP of `default-src 'none'`. The design is scaled with CSS `zoom`, so text is drawn sharp at full size rather than upscaled. The screenshot uses Chromium's DevTools protocol (`Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot`), because Windows won't lay out a window taller than the screen, which stretched the first 1080×1920 attempt.
  - **Checks in the main process:** sizes 16–4096, HTML up to 20 MB, CSS up to 5 MB, the backdrop a plain colour only, and CSS can't close its own `<style>` block. Saved through the native dialog as `.png`; the temp file is deleted.
  - **Sizes:** YouTube thumbnail 1280×720 (YouTube's recommended size). Posters: 1:1 → 1080×1080, 16:9 → 1920×1080, 9:16 → 1080×1920. Rounded corners and shadows from the on-screen card are dropped in the file.
  - **Screens:** "PNG डाउनलोड करें (W×H)" replaces "use a screenshot for now". It's disabled until there's a headline, and outside the desktop app it says it works only there. The file is named from the headline.
- **Verified:**
  - Desktop unit tests for the capture checks (4): sizes, odd requests, the backdrop colour, and the page allowing no scripts or network.
  - E2E: with the save dialog answered by the test, a 1280×720 thumbnail and a 1080×1920 poster are written with exactly those sizes. Both were looked at: sharp Devanagari, right colours, logo and institute name, nothing cut off or stretched.
- **Revisit if:** institutes need print sizes (A4 at 300 dpi), or other formats such as JPG or PDF.

### DN-071 · Institute logo upload
- **Date:** 2026-11-25
- **Phase / area:** DN-052 "revisit" · `packages/shared/src/{institutes,deckQuiz}.ts`, `packages/shared/templates/deck-quiz.html`, `apps/api/src/institutes/institutes.service.ts`, `apps/desktop/src/{api/logo.ts,App.tsx,components/{SettingsModal,DeckQuiz}.tsx}`
- **Status:** Decided by agent (developer asked for all follow-ups)
- **What was unclear:** DN-052 left logo upload for later: "store the file id in `branding`, then `instituteLogo` uses it". It didn't say the size limit or how exports get the image after the 5-minute signed link expires.
- **Decision:**
  - **Data:** `branding.logoFileId`, an uploaded file of this institute. The server accepts it only if the upload finished, it's PNG, JPEG or WebP, and it's at most 1 MB (`LOGO_MAX_BYTES`; it is embedded in every PPTX, motion file and quiz). Otherwise 400 `LOGO_INVALID`. Leaving it out of `branding` removes it. No migration (branding is JSON).
  - **App:** loads the logo once through the files API as a data URL (`useInstituteLogo`, cached for the session) and puts it on `activeInstitute.logo`. Every screen already calls `instituteLogo()`, so the dashboard, receipts, papers, PPTX and motion exports use it, and the initials badge remains the fallback.
  - **Settings** (super admin): a logo box with a preview, choose/change and remove. Type and size are checked before uploading; it takes effect on save.
  - **Deck quiz HTML:** takes the logo only as an embedded `data:image/(png|jpeg|webp);base64` URL, so the file still never loads anything from outside. Anything else falls back to initials. The template was regenerated.
- **Verified:**
  - API: institute tests 7, 1 new: a good logo is saved; PDF, over 1 MB, unfinished and another institute's file give `LOGO_INVALID`; leaving it out removes it.
  - Shared 52 tests, 1 new: the logo is embedded; an https link, SVG and a broken data URL are refused.
  - E2E: the super admin's GIF is refused in the dialog; a PNG uploads and previews; after save the dashboard shows it; removing it brings the initials back.
- **Revisit if:** institutes want separate logos per branch, or a larger print-quality logo.

### DN-070 · Branch choice after login, branch switching, own password change; a narrower token-reuse rule
- **Date:** 2026-11-25
- **Phase / area:** DN-037 (closed), DN-034 "revisit" · `packages/shared/src/auth.ts`, `apps/api/src/auth/{auth.service,auth.controller}.ts`, `apps/api/src/common/errors.ts`, `apps/desktop/src/{api/{client.ts,session.tsx},App.tsx,components/{BranchPicker,ChangePasswordModal,Header}.tsx}`
- **Status:** Branch picker approach (option A of DN-037) decided by developer ("Ask after login"); the rest decided by agent
- **What was unclear:** How multi-branch staff choose a branch when the login form doesn't know their branches (DN-037), and how staff change their own password (DN-034 "revisit"). While testing, a flaw in DN-033's theft rule showed up (below).
- **Decision:**
  - **`POST /auth/switch-branch {branchId}`** (any signed-in user): the branch must be the user's home or one of their extra branches (`AUTH_BRANCH_NOT_ALLOWED` otherwise). The current session is replaced by a new one at that branch, with the same device and end of day. The answer is a full login response, so the app gets new tokens and the new `/me` at once. The old refresh token stops working. Audited as `auth.switch_branch` with both branch ids.
  - **After login:** if the user has more than one branch, the app asks "आज किस ब्रांच में काम करेंगे?" before opening. The home branch is highlighted, and choosing it costs no extra request.
  - **In the header:** for such users the branch chip is a button. It opens a list with a warning that unsaved work may be lost. After switching, every cached query is dropped and the dashboard opens, because cached data belonged to the old branch.
  - **`POST /me/password {currentPassword, newPassword}`** (any signed-in user, rate-limited like login): a wrong current password gives 400 `PASSWORD_WRONG` (not 401, so the app doesn't treat it as an expired session), and the same password gives 400 `PASSWORD_SAME`; the new one needs at least 8 characters. Every **other** session of the user ends; this one stays signed in. Audited (`auth.password_change`, `auth.password_change_failed`), never with the password. The app opens it from a key button in the header.
  - **Token-reuse rule narrowed (supersedes part of DN-033):** a refresh token that was *rotated* (replaced), or that is presented from another device, still ends every session of the user, because that means it was copied. A token whose session simply *ended* (logout, block, password reset or change, an earlier reuse response) is now refused with `AUTH_SESSION_REVOKED` without ending the other sessions. Before this, changing your password on one PC made the other PC's next refresh sign you out on the first PC too.
- **Verified:**
  - API tests 124 (3 new):
    - switch to the second branch: `/me` shows it, the new token refreshes, the audit has both ids, and the replaced token is refused
    - another institute's branch, or a branch the typist doesn't have, gives 403; anonymous gives 401
    - password: wrong current, same, too short; success; the old password stops working and the new one works; the other PC is signed out while this session stays; the audit has no password
    - the reuse test now expects one alarm, not two
  - E2E 11 journeys, 3 new: the demo teacher picks गीता भवन at login and switches back in the header; the super admin isn't asked; the typist changes the password in the dialog (a wrong current one is refused), then changes it back.
- **Revisit if:** branch admins should see which branch each staff member is working at today, or institutes want password rules beyond 8 characters.

### DN-069 · Playwright e2e journeys in the real Electron app; one-command local setup and a health check
- **Date:** 2026-11-25
- **Phase / area:** master prompt §4 (e2e journeys), Phase 6 · `apps/desktop/{playwright.config.ts,e2e/*}`, `.github/workflows/ci.yml` (job `e2e`), `scripts/{local-setup,local-check}.mjs`, root `package.json`, `infra/docker-compose.yml` (`LOGIN_RATE_LIMIT`), `LOCAL_TESTING.md`
- **Status:** Package (`@playwright/test`, desktop dev dependency) approved by developer ("ok to all 3"); the rest decided by agent
- **What was unclear:** The prompt asks for e2e journeys but not how to drive the packaged Electron app, which data they run against, or how to live with the per-IP login limit (10 a minute, DN-033) when every journey signs in. The developer also asked for the app to be "ready for local testing", with one guide covering keys, startup and what to test.
- **Decision:**
  - **Driver:** Playwright's Electron support launches the built app (`dist/`), not a browser, so no browser download is needed. Each test uses a fresh temporary profile (`--user-data-dir`), so it never touches a copy the developer has open, because the single-instance lock is per profile. It points at `EDUSUITE_API_URL` (default `http://localhost:3000`). Passwords come from the seed file, as in the earlier scripts.
  - **Journeys:**
    - **Sign-in:** wrong password shows the server's Hindi message; a deep link returns after login; the session survives a restart; log out ends it for good.
    - **Teacher:** AI slides (fixture), exactly one credit, save, New clears, reopen from History.
    - **Roles:** the super admin's staff list has no password column or delete; teachers bounce from users, audit and receipts; counselors bounce from AI slides but open notices.
    - **Counselor fees:** enrol, over-balance blocked, a receipt numbered `DEMO-GTB/<FY>/<6 digits>` with ₹7,000 due.
    - **English:** the switch reaches the PPT screen with no Devanagari in its buttons or labels, and switches back.
  - **Data:** the journeys run against the seeded local stack. Each run adds one "E2E छात्र …" student and one saved deck. That's acceptable on demo data and keeps the journeys honest, since they use the same database the app uses.
  - **Login limit:** compose now passes `LOGIN_RATE_LIMIT` through (default still 10). CI sets 1000. A local run that hits the limit waits the minute out once and retries.
  - **CI job `e2e`:** `npm ci` with the Electron binary, `npm run local:setup` (fresh secrets, stack, storage, seed, build), then `xvfb-run npm run test:e2e`. The report, screenshots and stack logs are uploaded on failure. It also lifts Ubuntu 24.04's user-namespace restriction, which Electron's sandbox needs.
  - **`npm run local:setup`:** env, stack, storage, wait for `/ready`, seed, build, in that order. Every step is safe to rerun.
  - **`npm run local:check`:** checks Node 26, the Docker engine, free disk (fails under 2 GB, warns under 5 GB), `infra/.env.local`, whether the AI mode has the key it needs (reports only whether a key is set), error reporting on or off, and `/ready` per part. It prints a fix for each failure and never prints secrets. The disk check comes from a real failure on 2026-11-25: a full C: drive made Docker's disk read-only and crashed WSL.
  - **`LOCAL_TESTING.md`** at the repo root is the one guide for testers: keys (only Anthropic is optional for real AI; Sentry is optional; everything else is generated), setup, daily start and stop, what to test per role with the expected result, and troubleshooting. `docs/runbooks/local-testing.md` stays the operator reference (backups, load test, installer) and links to it.
- **Verified:**
  - All 8 journeys pass locally against Docker (about 10 s).
  - `local:setup` ran end to end on the existing stack (config kept, storage "already set", seed, build).
  - `local:check` is all OK on a healthy PC. Earlier the same day it would have caught the full disk.
- **Not verified:** the CI `e2e` job itself (it runs on the next push; Electron under xvfb on GitHub's Ubuntu image).
- **Revisit if:** the journeys need isolated data (then a separate seeded database per run), or the CI job is too slow (cache the API image).

### DN-068 · Error reporting with Sentry: off without a DSN, errors only, nothing personal
- **Date:** 2026-11-24
- **Phase / area:** master prompt §4 "Sentry hooks" · `apps/api/src/{common/{telemetry,apiExceptionFilter}.ts,main.ts,worker.ts,ai/processor.ts}`, `apps/desktop/{electron/{telemetry,main,preload}.cjs,vite.config.js,src/{components/ErrorBoundary.tsx,App.tsx,main.jsx,api/session.tsx}}`, `infra/{docker-compose.yml,.env.example}`, `.github/workflows/release-desktop.yml`
- **Status:** Packages (`@sentry/node`, `@sentry/electron`) approved by developer ("ok to all 3"); the rest decided by agent
- **What was unclear:** The plan names Sentry but not what is sent. The SDKs' defaults collect request bodies, headers, cookies, IPs and user details, and in Electron also native crash dumps (process memory), screenshots and a preload injected into every session. All of these can hold student data or tokens (AGENT_README §8), and the injected preload would break the hardened window (DN-036).
- **Decision:**
  - **Off unless a DSN is set:** `SENTRY_DSN` (and optional `SENTRY_ENVIRONMENT`) for the API and worker; `EDUSUITE_SENTRY_DSN` at build time for the desktop, written into `dist/app-config.json` next to the API address (release variable `EDUSUITE_SENTRY_DSN`).
  - **Errors only:** no tracing, no breadcrumbs, the SDKs' default integrations turned off. Every `dataCollection` category is off.
  - **What is reported:**
    - **API:** unexpected 5xx only (not 503 or any 4xx), tagged with our error code, the route pattern and the request id.
    - **Worker:** AI jobs that finally fail, except refusals and bad input files (those are the user's input); queue errors; startup failures.
    - **Desktop:** screen and router crashes from the error boundaries, plus uncaught errors and promise rejections in the page, except `ApiError` (server answers already shown to the user). At most 20 per run.
  - **Scrubbing before sending:** no request, user, extra data, server name, local variables or source lines. Messages keep their shape with quoted values, emails and runs of 6+ digits replaced; file paths lose the user folder.
  - **Desktop wiring:** the SDK runs only in the main process, in classic IPC mode (no privileged `sentry-ipc://` scheme). The page reports through a new named bridge function, `telemetry.report`, which the main process validates and clips. There's no Sentry code in the page and no CSP change.
- **Reason:** Error reports help find bugs at pilot institutes without moving student data, tokens or memory dumps to a third party.
- **Verified:**
  - API 121 tests, including 3 new: scrubbing; no DSN means nothing is set up; against a local fake Sentry, a forced 500 sends one event with tags and none of the email, phone, token, cookie or body, and a 401 sends nothing.
  - Desktop 46 tests, including 4 new: no DSN never loads the SDK; integrations limited, classic IPC, breadcrumbs 0; clipping, odd screen names dropped, the per-run cap; scrubbing of messages, paths and frame variables.
  - Electron smoke check passes, with the bridge now listing `telemetry`.
  - **End to end:** a build with a local fake DSN, signed in as the super admin.
    - A forced dashboard crash whose message held a name, email and phone arrived as `cannot format "…" [email] [number]`, tagged `screen: dashboard`.
    - A background `TypeError` arrived tagged `promise`.
    - An `ApiError` rejection was not sent.
    - No user, breadcrumbs or server name; no Windows user name anywhere.
    - `dist` was rebuilt without the DSN afterwards.
- **Not verified:** a real Sentry project (needs an account and DSNs; deploy checklist).
- **Revisit if:** tracing is wanted (performance), or support needs to tie a report to an institute (add the institute id as a tag, with approval).

### DN-067 · API docs at /docs, generated from the zod schemas
- **Date:** 2026-11-24
- **Phase / area:** Plan §07 · `apps/api/src/docs/openapi.ts`, `apps/api/src/{bootstrap.ts,config/env.ts,common/zodBody.ts}`, `infra/{docker-compose.yml,.env.example}`
- **Status:** Package (`@nestjs/swagger`) approved by developer ("ok to all 3"); the rest decided by agent
- **What was unclear:** The plan asks for "an OpenAPI spec generated from the zod schemas" but the routes validate with our own `ZodBody` pipe, which `@nestjs/swagger` can't read, and it didn't say whether docs are public in production.
- **Decision:**
  - **Routes** come from `SwaggerModule.createDocument`. Each operation is then filled from Nest's route metadata: the zod schema in every `ZodBody` pipe becomes the request body or the query parameters (`z.toJSONSchema`, input side, OpenAPI 3.0), and `@Headers("idempotency-key")` becomes a required header. Who may call it (public, a named permission, or any signed-in user) goes in the description and the bearer security. Validation and docs therefore can't drift.
  - **Served:** the page at `/docs`, JSON at `/docs/openapi.json` and YAML at `/docs/openapi.yaml`. The page's three files come from `swagger-ui-dist` (bundled with `@nestjs/swagger`) through a small whitelisted route, so no static-file plugin is needed and it works offline.
  - **`API_DOCS`:** on outside production; off in production unless `true`.
- **Verified:** API tests: every route is listed; fee-receipt body, required fields and idempotency header; student list query parameters; login public, `/me` secured; the page, CSS and a path-traversal attempt (404); the production default. Checked in the browser at `http://localhost:3000/docs`.
- **Revisit if:** response shapes should be documented too (add zod response schemas per route).

### DN-066 · Admin views: audit log and monthly AI usage (credits, not dollars)
- **Date:** 2026-11-24
- **Phase / area:** Checklist gap · `packages/shared/src/admin.ts`, `apps/api/src/audit/admin.controller.ts`, `apps/desktop/src/components/AuditUsage.tsx`, Sidebar, App, `permissions.ts` (screen `audit`)
- **Status:** Decided by agent
- **What was unclear:** The plan lists `GET /audit-logs` and `GET /usage?month=` under ADMIN, with "AI usage and audit log: Super ✓, Branch: branch". It doesn't say what a branch admin's slice is (audit rows have no branch column), or whether institutes see what AI costs EduSuite.
- **Decision:**
  - **Both need `audit.view`.**
    - A super admin sees the whole institute.
    - A branch admin sees audit rows whose **actor's home branch** is theirs, and AI jobs started by their branch's staff.
    - Other institutes are never visible.
  - **`GET /audit-logs`:** filter by action group (auth, user, document, receipt, student, ai, credits, institute, branch) and an IST date range, newest first, with cursor pages. Rows carry the actor's name and employee code and the stored meta (field names, ids, amounts; never secrets, AGENT_README §8).
  - **`GET /usage?month=YYYY-MM`** (IST month; current by default): per job type, jobs started, finished, failed and stopped, and **credits kept** (charged minus refunded, from the ledger). Claude's dollar cost (`ai_usage.cost_usd`) is not shown to institutes: they buy credits, and the dollar cost is EduSuite's business.
  - **Screen "AI उपयोग और ऑडिट लॉग"** (admins only):
    - **usage tab:** month picker and a table with a totals row, and a note that refunded credits don't count
    - **audit tab:** group and date filters, a table with plain-language action names (unknown actions show their code) and short details, and "show more"
- **Verified:** API 115 tests in all, including 3 new admin tests:
  - **Access:** teachers and counselors get 403; anonymous gets 401.
  - **Scope:** the super admin sees the second branch's student change, a branch admin doesn't, and the other institute sees none of ours. No "password" appears in any meta.
  - **Filters and paging:** group and date filters, no overlap between pages, a bad cursor gives 400.
  - **Usage:** a stopped job counts as stopped with its credit not kept; totals match the rows; branch scope for a branch admin; month 2026-13 gives 400.

  End-to-end in Electron as the super admin:
  - the usage row reads "लेक्चर PPT ढाँचा 3 2 0 1 2"
  - the audit log shows "AI काम रोका" (AI job stopped)
  - the receipt filter shows only receipt actions
- **Revisit if:** institutes want CSV export of the audit log, or EduSuite wants institutes to see a cost estimate.

### DN-065 · Checklist gaps: crash screen, AI job cancel, AI rate limit, per-job model, dev:all, local installer, runbook
- **Date:** 2026-11-24
- **Phase / area:** master prompt §3–4 and AGENT_README §7, §10 · `apps/desktop/src/{components/{ErrorBoundary,AiGenerate}.tsx,api/ai.ts,App.tsx,main.jsx}`, `apps/api/src/{ai/{jobs.service,jobs.controller,processor,queue,runner}.ts,config/env.ts,app.module.ts,auth/guards.ts}`, `scripts/{dev-all,dist-nsis-local}.mjs`, `infra/{docker-compose.yml,docker-compose.local.yml,.env.example}`, `docs/runbooks/local-testing.md`, `AGENT_README.md` §10
- **Status:** Decided by agent (developer asked for the gaps that need no decisions)
- **What was unclear:** A check of the plan against the code (2026-11-24) found these gaps, plus some that need the developer: Playwright e2e, Sentry, OpenAPI (new packages), and live AI or server items.
- **Decision:**
  - **Crash screen:** an error boundary per tool screen replaces only that screen with "यह स्क्रीन नहीं खुल पाई" (this screen couldn't open), "फिर से कोशिश करें" (try again) and "डैशबोर्ड पर जाएँ" (go to the dashboard). The header and sidebar keep working, and moving to another screen clears it. A whole-window fallback ("ऐप दोबारा लोड करें", reload the app) covers the router and providers. Error details go to the console only, because they may contain student data and there's no reporting service yet (Sentry needs approval).
  - **Cancelling AI jobs:**
    - `POST /ai/jobs/:id/cancel`, for the starter or an admin (others get 404). It stops a queued or running job, refunds its credits once and is audited. A finished job answers 409 `AI_JOB_FINISHED`.
    - The worker's status changes are conditional, so a cancelled job stays cancelled: a late result is dropped, a pending retry doesn't happen, and a failure doesn't overwrite it. Claude's usage is still recorded, because it was paid for.
    - The queue entry is removed when possible.
    - Every AI box's progress bar shows "रोकें" (stop) while the job runs.
  - **AI rate limit:** at most `AI_RATE_LIMIT` (default 20) job starts per minute **per signed-in session**, not per IP, because a whole office shares one IP. The throttler runs before auth, so it keys on a SHA-256 of the bearer token. Credits still cap spending.
  - **Model per job type:** `AI_MODEL_<JOB_TYPE>` (e.g. `AI_MODEL_DECK_QUIZ`) overrides `AI_MODEL` for that job; blank means no override. The worker's compose block passes all eleven through.
  - **`npm run dev:all`:** checks `.env.local`, starts the stack, waits for `/ready`, starts Vite, then opens Electron on it pointed at the local API. Ctrl+C stops Vite and Electron; the stack keeps running.
  - **`npm run dist:nsis:local`:** an unsigned one-click per-user installer pointed at the local API, never published, in `apps/desktop/release-local/` (git-ignored).
  - **Also added:** `npm run backup`, `restore:drill` and `load`.
  - **Recorded AI answers:** the local worker mounts `apps/api/fixtures` from the repo. Before this, `AI_MODE=record` wrote inside the container and the answers were lost.
  - **`docs/runbooks/local-testing.md`** rewritten for all six phases: first run, what to try per role, fixture vs live AI, backups and the restore drill, the load test, the test installer, checks and troubleshooting. `AGENT_README.md` §10 gained the new commands; nothing else in that document changed.
  - **Not built, on purpose:**
    - `POST /documents/:id/export`: PPTX and motion files are made in the app from the saved document. Server-side export would need `pptxgenjs` in the worker, with no gain while files are made on the PC.
    - `GET /students/:id/id-card`: the card prints from the student record (DN-061).
- **Verified:**
  - Tests: API 115 (cancel queued with refund once, then the worker skips it; cancel while Claude works keeps the status, drops the result, keeps the usage, refunds once; admin may cancel, others 404, finished 409; 4th job in a minute is 429 for one session while another session on the same IP is fine; per-job model). Desktop 42, shared 51; typecheck and lint pass; compose validates.
  - **Commands:** `dev:all` ran all three steps (stack ready, Vite up, Electron launched). `dist:nsis:local` produced `EduSuite-AI-Setup-1.0.0.exe` (one-click, per-user, 124 MB). The worker can write `/repo/apps/api/fixtures/ai`.
  - **End-to-end** in Electron as the super admin:
    - **Crash screen:** a forced crash on the dashboard shows the fallback with the sidebar still there, and "फिर से कोशिश करें" brings the dashboard back.
    - **Cancel:** with the worker stopped, a PPT job charges 1 credit; "रोकें" shows "रोक दिया गया" (stopped) and the chip returns to the starting balance.
- **Not verified:** `dev:all` with no other copy of the app open (a second copy closes at once by design); a live Claude run (`record` mode).
- **Revisit if:** Sentry is approved (send the boundary's errors there), or many staff share one login session (then rate-limit per user id after auth).

### DN-064 · The English switch reaches every screen: Hindi source text + `tx()` + one English dictionary
- **Date:** 2026-11-24
- **Phase / area:** UI language · `apps/desktop/src/i18n/{index.ts,en.ts,labels.ts,keys.mjs,en.test.mjs}`, every screen and shared component (33 files)
- **Status:** Decided by agent (developer reported: "even after changing to English some modules are still in Hindi")
- **What was unclear:** Only the sidebar, header and dashboard used `translations.js`. Every other screen had about 1,100 lines of Hindi written straight into the code (DN-037 left English "for later"), so English mode was mixed. What approach covers 25 screens without a risky hand edit of each, and keeps adding new text easy?
- **Options considered:** A) Keep the Hindi in the code, wrap it in `tx("…")`, and look up English in one dictionary keyed by the Hindi. B) Move every string to `translations.js` keys (`t.someKey`), threading `t` through every component. C) An i18n library (new dependency).
- **Decision:** A.
  - **`tx(hi, vars?)`:** returns the English from `en.ts` in English mode. `{0}`, `{1}` placeholders are filled from `vars`, and anything without English falls back to Hindi. `App` sets the language during render (`setUiLanguage`), so switching re-renders every screen in the new language at once, with no reload. `uiLocale()` gives `en-IN`/`hi-IN` for dates and numbers (Indian digit grouping in both).
  - **Conversion:** a one-time codemod using the JSX parser bundled with rolldown (already installed; no new dependency) did all 33 files:
    - every Hindi string, JSX text and template went into `tx()`, with templates as `tx("… {0} …", [value])`
    - `{hi, en}` pairs and `lang === …` ternaries were left as they were
    - fixed lists built at module load (dropdown options, labels) became small functions evaluated at render (`OPTIONS()`), so they follow the switch; the one exported list, `JOB_TYPE_LABELS`, got getters
    - typed constants had their annotation moved onto the function
  - **Dictionary:** `en.ts` holds 918 entries (Hindi → English), written for this UI.
    - Document type names come from `i18n/labels.ts`; the shared package keeps its Hindi list for the API.
    - Language names stay in their own script on the switch ("हिन्दी" / "English"); in dropdowns they translate.
  - **Not translated, on purpose:** what staff typed and saved (names, titles, student records); institute and branch names; the language of AI output (its own setting on each AI screen); exported PPTX and motion-file content (`utils/*`, document content rather than UI); and the dev-only UI gallery. Template text that fills a document (notice templates, poster templates) follows the UI language when applied.
  - **Keeping it complete:** `node src/i18n/keys.mjs --missing` lists new Hindi strings without English. A test fails if any `tx()` string lacks English or a translation changes the placeholders.
- **Reason:** One mechanical, reviewable change; new screens only need `tx("…")` plus a dictionary line; Hindi stays the readable source the team writes in.
- **Verified:**
  - Desktop tests 42 (3 new: every key has English; placeholders match; `tx` switches and fills values and falls back). Typecheck, lint and build pass.
  - A parser scan finds no Hindi UI text outside `tx()` in the converted files.
  - **In the real Electron app** (separate profile, against Docker), as super admin switched to English, on all 15 screens plus the history dialog: no Hindi except user data (staff names, saved titles, test students) and the institute and branch names. Dates read "23 Nov, 01:11 pm" and document types "Lecture PPT". Switching back to हिन्दी restores Hindi (the poster screen shows "पोस्टर का प्रकार").
- **Not verified:** every dialog and error toast in English (most were covered by the strings test, not clicked through); English quality reviewed by a native editor.
- **Revisit if:** institutes want exported PPTX/motion files in English too, or a third language (then `en.ts` becomes one of several dictionaries).

### DN-063 · Backups with restic (database + files), restore drill, and the 150-user load test
- **Date:** 2026-11-23
- **Phase / area:** Phase 6 · `infra/backup/*`, `infra/docker-compose.yml` (`backup` service, profile `ops`), `infra/.env.example`, `apps/api/scripts/load-test.mjs`, `docs/operations/deploy-checklist.md`
- **Status:** Off-site target (Cloudflare R2 or Backblaze B2) and load-test tool (autocannon, dev only) decided by developer; the rest decided by agent
- **What was unclear:** The plan says "nightly pg_dump + storage restic, encrypted, keep 7 days, 4 weeks, 6 months; restore within 2 h; lose at most 24 h", and "load test (150 users)". It doesn't say how storage is captured, how a restore is proven, or what the test runs.
- **Decision:**
  - **Backup tool:** one image built on `postgres:17`, with Debian's `restic` and `rclone`.
  - **`backup.sh`:** `pg_dump` (custom format) plus `rclone copy` of every object in the bucket go into one restic snapshot. Objects are copied through the S3 API rather than Garage's data folders, so a restore doesn't depend on Garage's internal format. Then `forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune` and `check --read-data-subset=1/50`. It creates the repository on first run.
  - **`restore.sh`:** a drill by default. It restores into `<db>_restore_drill` and, optionally, a separate bucket. It compares row counts of the key tables (and the receipt counters' total) with the live database and reports `restore_seconds`. It refuses to restore over the live database without `I_AM_RESTORING_LIVE=yes`. `DRILL_EXPECT_EQUAL=1` makes any difference a failure.
  - **Running it:** the `backup` service is in the `ops` profile, so it never starts with the stack. Production runs it from host cron at 02:30 IST. The repository is any S3 URL (R2 or B2) or `/backup-repo` (a local volume, for drills only). `RESTIC_PASSWORD` must also be kept in a password manager off the server. Existing local env files got the new keys without the secret being shown.
  - **Load test** (`npm run load -w @edusuite/api`): 150 connections for 30 seconds. The mix is `/me`, dashboard stats, document history, students, credits, and about one write in 14 (a notice save). It logs in four demo users once, because logins are rate-limited per IP (DN-033), with passwords read from the seed file. It refuses any host but localhost. It passes when p97.5 < 300 ms with no errors (autocannon reports p90 and p97.5, not p95).
- **Verified:**
  - **Backup:** a local backup saved the database plus 14 files, and the check found no errors.
  - **Restore drill:** it passed. Every compared table matched the live database (institutes, users, documents, files, students, receipts, counters, credits, audit), all 14 uploaded files were present, and it took 1 s. Restoring over the live database is refused (exit 2). The drill database was dropped afterwards.
  - **Load test:** 43,949 requests at about 1,465 per second; p50 94 ms, p90 137 ms, p97.5 148 ms, p99 160 ms, max 615 ms; no non-2xx responses, errors or timeouts. This ran on the developer PC under Docker Desktop, so re-run on the VPS size before the pilot. The test's 3,108 notices and their audit rows were removed from the local database afterwards.
- **Not verified:** a real R2 or B2 repository (needs the bucket and keys); uploading into a restore bucket (`RESTORE_BUCKET`); cron on the VPS.
- **Revisit if:** the database grows past what a nightly dump handles (move to WAL archiving, plan "revisit"), or less than 24 h data loss is needed.

### DN-062 · One-click per-user installer, auto-update, release and deploy workflows (pilot unsigned)
- **Date:** 2026-11-23
- **Phase / area:** Phase 6 · `apps/desktop/{package.json,vite.config.js,electron/{main,preload,updates}.cjs,src/components/{UpdateButton,Header}.tsx}`, `.github/workflows/{release-desktop,deploy-api}.yml`, `infra/{Caddyfile,docker-compose.yml,updates-site/index.html}`, `docs/operations/deploy-checklist.md`
- **Status:** Signing (unsigned for the pilot) and "build ready to deploy, touch no server" decided by developer; the rest decided by agent
- **What was unclear:** The plan names a signed NSIS installer, electron-updater (checks at start and every 4 h), a download page and `release-desktop.yml` / `deploy-api.yml`. There is no certificate, VPS or domain yet, and it wasn't said how the packaged app learns its server address.
- **Decision:**
  - **Installer** (DN-016): `oneClick: true`, `perMachine: false`, so there's no admin prompt and no folder choice. Named `EduSuite-AI-Setup-<version>.exe`. Electron is pinned to an exact version (45.3.4), which electron-builder needs and which keeps releases reproducible. Unsigned for the pilot; the download page explains the one-time Windows warning. Adding `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (or Azure Trusted Signing) later turns signing on with no code change.
  - **Server address:** fixed at build time. `vite.config.js` writes `dist/app-config.json` from `EDUSUITE_API_URL` (the same value as the CSP), and the main process reads it. The env override works only when not packaged. The release workflow refuses any address that isn't `https://`.
  - **Auto-update** (`electron-updater`, named in the plan): `electron/updates.cjs` is testable without Electron. It runs only in the packaged app (not in development or smoke runs). It checks at start and every 4 hours and downloads in the background (block map first). A downloaded update shows "अपडेट तैयार (x.y.z): दोबारा शुरू करें" in the header, and also installs when the app closes. Offline or a broken feed only logs, and a ready update stays ready. The bridge gets `update.install` and `update.onChange`.
  - **Feed and download page:** a generic provider. Caddy serves `UPDATES_DOMAIN`: `/desktop/*` from `/srv/edusuite/updates` (with `latest.yml` never cached) and `/` as a download page. The page reads `latest.yml` to link the newest installer and gives Hindi install steps. The feed URL in `package.json` is a placeholder; releases pass the real one.
  - **`release-desktop.yml`** (tag `v*`, or manual without publishing): checks the version and https variables, runs desktop tests, builds the installer and uploads it as an artifact. When the deploy secrets exist, it copies the installer and block map first and `latest.yml` last, so apps never see a feed pointing at a missing file. Then it drafts a GitHub release.
  - **`deploy-api.yml`:** manual, behind the `production` environment (add a required reviewer). It builds and pushes the image to GHCR, then over SSH runs `compose pull` and `up -d` (migrations run as the one-shot service) and checks `/ready`. App secrets stay in the VPS's own `infra/.env`.
  - `docs/operations/deploy-checklist.md` lists every step that touches the server, money or secrets.
- **Verified:**
  - Desktop tests 39 (3 new for the updater: disabled in development; start plus 4-hour checks, progress, ready, install; offline). Typecheck, lint and build pass. `app-config.json` is emitted.
  - A real `electron-builder` run produced the one-click per-user NSIS installer (`oneClick=true perMachine=false`), its block map and `latest.yml`.
  - **Local update drill:** a v1.0.1 feed was served on 127.0.0.1 and an unpacked v1.0.0 was pointed at it. It went downloading → ready (1.0.1), and the header showed "अपडेट तैयार (1.0.1): दोबारा शुरू करें". Nothing was installed; the updater cache was deleted afterwards.
  - Caddy validated the new site; compose config is valid for local and for production + ops. The download page with a fake feed links `desktop/EduSuite-AI-Setup-1.0.1.exe` and shows "संस्करण 1.0.1".
- **Not verified:** the GitHub workflows (they run only on a tag or a manual run with the variables set); installing an update end to end (restart into the new version); signing; macOS updates (the Mac workflow builds DMGs but isn't published to the feed).
- **Revisit if:** the login screen should also offer the update (today the button is in the signed-in header; closing the app installs it anyway), or a signing certificate is bought.

### DN-061 · Phase 5: students, fee receipts and ID cards
- **Date:** 2026-11-23
- **Phase / area:** Phase 5 · `packages/shared/src/students.ts`, `apps/api/src/students/*`, `apps/desktop/src/{api/students.ts,components/IdAndFeeReceipt.tsx}` (replaces the sample-data `.jsx`)
- **Status:** Money rules decided by developer (four questions, all recommended options); the rest decided by agent
- **What was unclear:** The plan fixes the receipt format, gap-free numbering, idempotency, "never deleted, only cancelled with a reason" and who may do what (DN-007, matrix). It doesn't say whether a receipt may exceed the balance, who sets roll numbers, whether receipts can be back-dated, or who may change a student's total fee.
- **Decision:**
  - **Developer's choices:**
    - A receipt can't be more than the balance due (total fee − issued receipts).
    - Roll numbers are automatic (`<INST>-<BRANCH>-<year>-<0001>`), and staff may type their own; they're unique per institute and upper-cased.
    - Receipts can be dated today or up to 7 days back (IST), never in the future.
    - Only admins (super admin, branch admin) change the total fee after enrolment, never below what's paid; counselors set it when adding a student.
  - **Numbering:** `<INST>-<BRANCH>/<FY>/<000001>` (DN-013), by the student's branch and the receipt date's financial year. One transaction: lock the student row (`FOR UPDATE`, so two desks can't overpay), create the counter row if missing, then `UPDATE … SET last_seq = last_seq + 1 RETURNING` (the row lock serialises numbering, and a rollback undoes it, so there are no gaps), insert the receipt and the audit row.
  - **Idempotency:** `POST /fee-receipts` requires an `Idempotency-Key`. A repeat returns the same receipt (200, nothing created). The same key with a different student, amount or user answers 409. Two simultaneous requests with one key: the loser returns the winner's receipt. The screen keeps one key per filled form and makes a new one after success.
  - **Cancel:** `receipts.cancel` (super admin institute-wide; branch admin own branch), reason 3–300 characters. The receipt stays, marked cancelled with the reason and who cancelled it. Its amount returns to the balance. The number is never reused. Audited in the same transaction.
  - **API:**
    - `GET /students` (search by name, roll number, phone or guardian; status filter; cursor pages)
    - `GET /students/next-roll-no`, `POST /students`, `GET /students/:id`, `PATCH /students/:id` (every change audited, with the old and new fee)
    - `GET /fee-receipts?studentId=`, `POST /fee-receipts`, `POST /fee-receipts/:id/cancel`

    Scope is `students.fees` (super admin whole institute; branch admin and counselor their branch); other branches and institutes get 404. A photo must be this institute's uploaded image. New codes: `RECEIPT_OVER_BALANCE`, `RECEIPT_DATE_INVALID`, `RECEIPT_ALREADY_CANCELLED`, `FEE_BELOW_PAID`, `FEE_CHANGE_NOT_ALLOWED`.
  - **Screen:**
    - student list with search and status; add/edit form (roll suggestion shown, fee locked for non-admins after enrolment, photo upload)
    - per student: totals (fee, paid, due), and "रसीद काटें" (amount ≤ due, mode, date within the last 7 days)
    - a printable receipt with the server's number, the due after it, and the issuer
    - "रसीदें" with reprint, and cancel with a required reason for admins only
    - "ID कार्ड" with the photo, course, batch, guardian, phone and the academic session

    Only the receipt or card prints. All sample data (and the confetti import) is gone. No GST wording (DN-013).
  - **Not built:** `GET /students/:id/id-card` from the plan (the card renders and prints in the app from the student record); receipt PDFs on the server; fee instalment plans; reports.
- **Reason:** Money stays correct under double clicks, retries and two desks at once, and every change to it is traceable.
- **Verified:**
  - Shared 51 tests (financial-year turnover on 1 April, IST date, 2-decimal rupees, roll format).
  - API 108 tests:
    - counselor adds with automatic roll numbers 0001/0002; a typed duplicate is 409; teachers and typists 403
    - branch and institute scoping
    - the receipt number format; over-balance, 8-days-back and future dates refused; 7 days back accepted with the next number
    - the same key returns the same receipt, and a different body is 409
    - **10 parallel ₹1,000 receipts on a ₹5,000 balance: exactly 5 succeed, numbers 1…n with no gaps or repeats**
    - total-fee rules and audit; cancel rules, balance restored, number not reused, audit row
  - Desktop typecheck, lint, build and 36 tests pass.
  - End-to-end in Electron against Docker:
    - counselor (Gita Bhavan branch): no sample data; roll suggestion `DEMO-GTB-2026-000n`; student added with a photo; ₹13,000 blocked; ₹5,000 UPI gives `DEMO-GTB/2026-27/00000n` printed with "बकाया ₹7,000"
    - history shows 1 row with no cancel button; the ID card shows the photo and details
    - super admin finds the student; cancel stays disabled until a reason is typed; after cancelling, the row shows "रद्द: …" and the balance is back to ₹12,000
- **Revisit if:** institutes need instalment schedules or due-date reminders, GST invoices (DN-013), or receipts emailed or sent on WhatsApp as PDFs.

### DN-060 · Phase 4 complete: doubt, YouTube, notice, book chapter and poster copy AI jobs
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `packages/shared/src/ai.ts`, `apps/api/src/ai/{doubtSolve,youtubeMeta,noticeDraft,bookChapter,posterCopy}.ts`, `apps/desktop/src/components/{DoubtSolver,YouTubeStudio,NoticeHub,BookCreator,ImageStudio}.jsx`
- **Status:** Decided by agent
- **What was unclear:** For the last five jobs in the plan's order: what each takes, how results fit the existing document shapes (no schema changes), and the guardrails each one needs.
- **Decision** (prices as DN-053; all results fill the editor unsaved; `confirmReplace` from DN-059 asks before spending whenever written text would be replaced):
  - **`doubt_solve`** (1 credit; `ai.content`): the typed doubt and/or an optional photo (PNG, JPEG or WebP up to 5 MB, this institute's, checked before charging). Claude solves first, then explains in short steps, with a shortcut only if genuine, the common mistake and 2–3 similar questions. If the photo is unclear it says what is missing. A typed question is kept; a photo-only doubt fills the question from the photo. Effort high.
  - **`youtube_meta`** (1; `ai.content`): from the thumbnail headline, punchline and teacher. Title cut to YouTube's 100 characters, tags cleaned (no `#`, no duplicates, up to 30). No clickbait, and no invented links, dates or offers. The institute's own name comes from the server.
  - **`notice_draft`** (1; `notices`, so counselors can use it): "what the notice must say" plus the category and date fields. Only the given facts are used; anything missing becomes a [bracket] placeholder. A WhatsApp version and a formal circular body (the app adds letterhead, date and signature).
  - **`book_chapter`** (2; `ai.content`): writes the chapter being edited, using its title plus the book's title, subject and exam. Output: subtitle, 4–10 theory paragraphs, exam points and 0–20 practice MCQs (options as "(a) …" lines). MCQs without four options are dropped; a chapter with no theory fails and is refunded.
  - **`poster_copy`** (1; `image_studio.ai_copy`): a brief of the real facts gives a headline (≤8 words), subheading and call to action. The prompt forbids claims the brief doesn't state (results, ranks, "No. 1", discounts), following DN-050. Counselors don't see the box (DN-008).
  - The "AI comes in the next phase" notes on these screens are removed. A shared test now checks that every job type in `AI_JOB_PERMISSIONS` is implemented.
- **Reason:** Completes the plan's Phase 4 job list with the same review-first pattern, and no migration.
- **Verified:**
  - Shared 47 tests and API 101 tests: YouTube limits; broken book MCQs dropped; all five run in fixture mode at their prices; a counselor can draft notices but gets 403 for poster copy and doubts; a PDF as a doubt photo is refused.
  - Desktop 36 tests; typecheck, lint and build pass.
  - End-to-end in Electron against Docker (fixture mode), as a teacher:
    - **doubt:** answer and 3 steps filled, 1 credit; pressing again asks first and cancelling is free
    - **YouTube:** title and tags filled, 1 credit
    - **notice:** title filled and the WhatsApp text carries "डेमो कोचिंग संस्थान", 1 credit
    - **book chapter:** 2 theory paragraphs and 3 practice MCQs, 2 credits
    - **poster:** headline filled, 1 credit
  - As a counselor: the notice AI box shows; the poster AI box is hidden.
- **Not verified:** live Claude runs for any Phase 4 job (no key yet). Before Phase 6, run each once with `AI_MODE=record` to judge quality and save fixtures.
- **Revisit if:** counselors need AI poster copy (DN-008), or doubts need several photos.

### DN-059 · AI lesson plans (`lesson_plan`); the AI button can ask before spending credits
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `packages/shared/src/ai.ts`, `apps/api/src/ai/lessonPlan.ts`, `apps/desktop/src/components/{AiGenerate.tsx,LessonPlanner.jsx}`
- **Status:** Decided by agent
- **What was unclear:** A lesson plan replaces the whole plan, unlike the DPP (DN-058), where AI questions could be added after the teacher's own. Asking "replace?" after the job runs would waste the credit if the teacher says no.
- **Options considered / Decision:**
  - **`AiGenerate` gets `confirmReplace`** (title and message, or null). When set, the button first shows a ConfirmDialog that also states the credit cost. Nothing is charged unless the teacher confirms. Screens whose result would overwrite written work use it.
  - **Input:** chapter, subject, class (existing fields), the screen's teaching days (1–30; AI plans at most 30, though saved plans allow 365), an optional focus (500 characters) and language. Price 1 credit.
  - **Output:** 3–6 measurable objectives and one entry per day (topic, class activities, homework). `finish` makes the day count exact: extra days are dropped and missing ones become empty days to fill. A plan with no usable day fails and is refunded. The screen labels days "दिन 1…".
  - **Prompt:** a sensible teaching order across exactly the given days (introduce, build up, practise, revise or test at the end when there are enough days); realistic one-period plans; specific homework; follow the class's usual syllabus; no invented facts.
  - The free "खाली दिन-वार ढाँचा बनाएँ (मुफ़्त)" stays.
- **Reason:** The teacher decides before paying, never after.
- **Verified:**
  - Shared 46 tests (limits) and API 99 tests (exact day count both ways, empty plan refused, fixture run of 4 days charges 1).
  - Desktop typecheck, lint and build pass.
  - End-to-end in Electron against Docker (fixture mode):
    - disabled until chapter and subject are filled; "· 1 क्रेडिट"
    - on an empty plan, no question asked; 3 objectives and exactly 3 days filled, the title filled, 1 credit taken
    - pressing again with the plan written shows "लिखी योजना बदल जाएगी … इसमें 1 क्रेडिट लगेंगे"; "रुकें" keeps the credits unchanged
- **Not verified:** a live Claude run.
- **Revisit if:** teachers want AI to fill only empty days, or plans longer than 30 days.

### DN-058 · AI DPP (`dpp_generate`): one topic, answers stay in the teacher-only hint, AI questions are added, never replace
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `packages/shared/src/ai.ts`, `apps/api/src/ai/dppGenerate.ts`, `apps/desktop/src/components/NotebookDppMaker.jsx`
- **Status:** Decided by agent
- **What was unclear:** The DPP document saves only question text and a hint (`DppContentSchema`), with no options or answer fields. It also wasn't settled what happens to questions the teacher already wrote.
- **Options considered / Decision:**
  - **Input:** subject, topic (the screen's existing fields), batch, 3–50 questions (default 10), style (all MCQ, short/numerical, or mixed: about two thirds MCQ), difficulty (easy first by default) and language. Price 1 credit per sheet (DN-053).
  - **Fitting the schema:** no schema change. MCQ options go into the printed question text as "(a) … (d) …" lines (the sheet already keeps line breaks). The answer goes into the hint, which is teacher-only and not printed: "उत्तर: (b) … · method". MCQs without four options and empty questions are dropped; nothing usable fails the job and refunds it.
  - **Prompt:** every question drills the one topic from a different angle; plausible distractors; worked numerical answers; never invent data.
  - **Teacher's questions:** AI questions are added after any the teacher wrote (up to the 200 limit). A "replace?" dialog was tried first and dropped: by the time it shows, the credit is already spent, so cancelling would waste it.
- **Reason:** No migration or schema version bump. The printed sheet never shows answers. Nothing paid for or written is lost.
- **Verified:**
  - Shared 45 tests (defaults, limits) and API 97 tests (options on their own lines, answer and hint combined, broken MCQs dropped; a fixture run of 6 mixed gives 4 MCQs).
  - Desktop typecheck, lint and build pass.
  - End-to-end in Electron against Docker (fixture mode): disabled until topic and subject are filled; "· 1 क्रेडिट"; 1 credit taken; 6 questions in the editor; "(a) विकल्प 1" on the printed sheet; the hint is "उत्तर: (a) … · …"; the title is filled from the topic; a second run with a written question keeps it and adds 6 more (12).
- **Not verified:** a live Claude run.
- **Revisit if:** DPPs need a printed answer key (add an `answer` field and a schema version), or an answer-key page for students.

### DN-057 · Screenshot → MCQ (`mcq_extract`): up to 20 screenshots per job, inferred answers flagged
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `packages/shared/src/ai.ts`, `apps/api/src/ai/{mcqExtract.ts,definitions.ts,processor.ts,deckQuiz.ts}`, `apps/desktop/src/components/ScreenshotToPpt.jsx`
- **Status:** Decided by agent
- **What was unclear:** The plan names "Screenshot → MCQ (vision)" third in the AI order, priced per screenshot (DN-053). It doesn't say how many screenshots go in one call, what happens when a screenshot has no answer marked, or how the result meets the teacher's own edits.
- **Options considered / Decision:**
  - **One job reads up to 20 screenshots** (one Claude call with an image block per screenshot, numbered). The price is 1 credit per screenshot, so 20 cost 20. Larger sets run in more batches; the button always takes the next 20.
  - **Before charging:** every file must be this institute's uploaded PNG, JPEG or WebP of up to 5 MB (Claude's image limit; uploads allow 10 MB). Otherwise `AI_INPUT_FILE_INVALID`, whose message is now generic rather than PDF-specific.
  - **Prompt rules:** transcribe the question and four options exactly, in their own script, without the option letters; read Devanagari carefully and note unreadable words. `answerFromImage` is true only when the screenshot marks the answer; otherwise Claude works it out and says so. Ignore watermarks, channel names and ads. If there's no MCQ, `found` is false.
  - **Result:** one item per screenshot in input order, keyed by file id. A screenshot Claude skipped comes back as not found.
  - **Screen:** "AI से स्क्रीनशॉट पढ़ें" fills only screenshots that are uploaded and still have empty question text, so the teacher's own writing is never overwritten. Inferred answers are counted in a banner, and the question shows "यह उत्तर स्क्रीनशॉट पर नहीं था…" with an "उत्तर सही है" button; choosing an answer by hand also clears it. Claude's note shows under it. Screenshots with no question show a message to write it by hand. The result fills unsaved. The flags aren't saved with the set.
  - **Plumbing:** `ctx.readFile` takes a list of allowed types and returns the type; `finish` also gets the input.
- **Reason:** Batching keeps one request per class set; per-screenshot pricing stays fair; the teacher confirms every answer the image didn't give.
- **Verified:**
  - Shared 44 tests (per-item count; 0, more than 20 or duplicate files refused) and API 95 tests (a PDF, another institute's image or an unknown id refused before charging; a counselor gets 403; 3 screenshots charge 3 and come back in order with the inferred flags; the worker sends each image with its own type and exact bytes; a skipped screenshot is not found).
  - Desktop typecheck, lint and build pass.
  - End-to-end in Electron against Docker (fixture mode): two screenshots uploaded through the real file input; the button reads "AI से प्रश्न पढ़ें · 2 क्रेडिट"; 2 credits taken; the questions filled; "1 प्रश्नों का उत्तर … AI ने तय किया है" shown; question 2 shows the warning and Claude's note; "उत्तर सही है" clears it; status "unsaved"; the button is disabled once nothing is left to read.
- **Not verified:** a live Claude run on real Hindi screenshots (the important check for this feature).
- **Revisit if:** screenshots often hold several questions (then one screenshot can yield many), or the flags should be saved with the set.

### DN-056 · AI question papers (`paper_generate`): blueprint by counts, fixed marks per kind
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `packages/shared/src/ai.ts`, `apps/api/src/ai/paperGenerate.ts`, `apps/desktop/src/components/QuestionPaperMaker.jsx`
- **Status:** Decided by agent
- **What was unclear:** The plan lists "job paper_generate + question bank" second in the AI order. It doesn't say what the teacher specifies, how marks are set, or whether generated questions go into the `questions` table.
- **Options considered / Decision:**
  - **Input:** subject, class (the screen's existing field), topics (required), how many MCQs, short-answer and long-answer questions (1–60 in all; defaults 10 / 5 / 2), difficulty (mixed by default: easy first) and language (hi, en, both).
  - **Marks:** fixed per kind (MCQ 1, short 3, long 5, `PAPER_MARKS`), shown before generating with the total. After generating, the screen sets maximum marks to the real total. Section names and marks can still be edited.
  - **Output:** one section per kind, in MCQ → short → long order. MCQs have four options and an answer that starts with the letter; the others have a model answer or worked solution, which fills the answer key. `finish` drops MCQs without four non-empty options and empty questions; a paper with nothing usable fails and is refunded.
  - **Prompt rules:** cover only the given topics, spread across them; no repeated facts; plausible distractors, no "all/none of the above"; never invent data; the teacher reviews.
  - **Screen:** an "AI से पेपर बनाएँ" box (topics, counts, difficulty, language, cost from DN-053: 2 credits). The result fills the editor unsaved (title too, if empty). The free empty layout stays as "खाली पेपर ढाँचा बनाएँ (मुफ़्त)".
  - **Question bank:** not yet. Generated questions live in the saved paper document only; adding them to `questions` (for reuse and de-duplication) is a follow-up.
- **Reason:** Counts by kind match how teachers plan a paper, and fixed marks keep the total predictable before paying.
- **Verified:**
  - Shared 43 tests (defaults, 0 and >60 questions refused) and API 92 tests (normalization order and drops; a fixture run charges 2 and returns 4 MCQ + 2 short).
  - Desktop typecheck, lint and build pass.
  - End-to-end in Electron against Docker (fixture mode): the button stays disabled until subject and topics are filled; "कुल 7 प्रश्न · 15 अंक"; generating takes 2 credits; the editor and preview fill with 3 sections, MCQ options as "A) …", title and max marks 15, status "unsaved".
- **Not verified:** a live Claude run.
- **Revisit if:** institutes need other marks per kind or other question kinds (assertion–reason, match the following), or the question bank is built.

### DN-055 · Deck → interactive quiz: Claude reads the PDF, a fixed template builds the HTML
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `packages/shared/{src/deckQuiz.ts,src/branding.ts,templates/deck-quiz.html,scripts/gen-deck-quiz-template.mjs}`, `apps/api/src/ai/{deckQuiz.ts,definitions.ts,processor.ts,jobs.service.ts,runner.ts}`, `apps/api/src/files/storage.ts`, `apps/desktop/src/components/DeckQuiz.tsx`, `docs/prompts/deck-to-interactive-quiz.md`
- **Status:** Decided by agent (please review the template choices and the system prompt)
- **What was unclear:** The developer's prompt (`PROMPT_deck_to_interactive_html.md`) and sample (`biol.html`) describe a long agent session that writes a new page per deck: ads and logo cut from the deck, 3D scenes made for each subject, CDN libraries. Every example names one institute. What part should Claude do inside a product used by many institutes?
- **Options considered:** A) Claude returns only structured quiz data; EduSuite fills one fixed, tested template with the signed-in institute's name. B) Claude writes the whole HTML per deck. C) Claude picks from the sample's biology scenes.
- **Decision:** A.
  - **Prompt:** kept in the repo as `docs/prompts/deck-to-interactive-quiz.md`, with the institute examples removed and a note on how EduSuite splits the work. The job's system prompt follows its sections 2–4: skip banners and ads; transcribe faithfully and check Hindi against English; answers from the deck are marked `answerInDeck`, inferred ones are not; deck errors go in a per-question `note`, never silently fixed; 1–3 sentence explanations; 2–5 key points with the one or two the answer rests on marked; no links, numbers or institute names. Institute, exam and subject are filled per job.
  - **Template:** made once from `biol.html` by script and kept as readable HTML. It keeps the quiz screens, language toggle (हिन्दी / English / दोनों), reveal, keyboard, score, dots, result ring and the self-healing watermark. Removed: the other institute's name, logo, ads, carousel and ad slides, the biology-only 2D and 3D scenes, and every CDN (three.js, motion, Google Fonts). It is fully self-contained and works offline and in the app's network-less player. One new "concept" scene works for any subject: the key points light up on answer. The logo is the institute's initials badge (DN-052).
  - **Building the file:** `buildDeckQuizHtml` in the shared package, so the app builds it after the teacher's review. Every deck string is HTML-escaped, and the data is JSON that can't close its script block. Replacements use a function. A generated module (`deckQuizTemplate.ts`) carries the template; a test fails if it drifts from the `.html`.
  - **Job `deck_quiz`:** input `{fileId, exam, subject}`. Before charging, it checks that the file is this institute's uploaded PDF of up to 20 MB (`AI_INPUT_FILE_INVALID`, 400). The worker reads the PDF from storage (`Storage.read`, this institute only) and sends it as a base64 document block. Effort `high`, 64k max tokens. The output is normalized: questions without four options or a valid answer are dropped and listed in `issues`; no usable question fails the job and refunds it. Price stays as DN-053 set it (10 credits per deck, operator-editable).
  - **Job plumbing:** a definition may now have an async `user()`, a `precheck` (runs before credits are taken) and a `finish` (shapes the stored result).
  - **Screen "डेक से इंटरैक्टिव क्विज़"** (`ai.content`): upload the PDF, type exam and subject, generate. Then every question is shown with its options. The teacher can change any answer. Each answer the deck didn't state is marked "जाँचना बाकी" (to check) and must be ticked or changed before "HTML डाउनलोड करें" works. Deck problems are listed. "क्विज़ खोलें" runs the quiz in the isolated player (DN-036).
  - **Not saved yet:** the quiz isn't saved on the server. Leaving before downloading asks first, and a new run costs credits again.
  - `initialsOf` moved to the shared package (the desktop re-exports it).
- **Not in this version (follow-ups):** saving quizzes as documents with history; deck banners and the institute's own logo in the quiz; subject-specific or 3D scenes; PPTX decks; a wider in-app preview.
- **Reason:** No model-written code runs on students' devices; one template is tested once and carries only the right institute's name; and the teacher, not the AI, has the last word on answers.
- **Verified:**
  - Shared tests 42 (template matches its source; no other institute, ads or outside requests; escaping, including `</script>` and `$&`; normalization; download name).
  - API tests 90 (3 new): a PNG, an unfinished upload, another institute's file or an unknown id is refused before charging; a fixture run charges the price and returns checked data; the worker sends the exact PDF bytes as a document block with the institute's name; a job pointed at another institute's file fails and is refunded.
  - Desktop 36; typecheck and lint pass.
  - End-to-end in the real Electron app against Docker (fixture mode):
    - the sidebar item shows; the button stays disabled until a PDF is uploaded through the files API and the fields are filled
    - generating takes the price from the header chip; 3 questions, 2 marked to check, the deck issue and note are shown, and download is blocked
    - changing one answer and ticking the other unblocks download
    - the player shows "डेमो कोचिंग संस्थान", "SSC CGL · जीव विज्ञान · यूनिट-1" and the watermark, with no other institute's text; the teacher's changed answer (d) scores correct and its key point lights
    - leaving before downloading asks first, and "रुकें" keeps the quiz
- **Not verified:** a live Claude run on a real deck (no key yet). Use `AI_MODE=record` once with a key to judge Hindi transcription and answer quality.
- **Revisit if:** teachers need to reopen past quizzes (add a document type), or decks over 20 MB or 100 questions are common (split the PDF across jobs).

### DN-054 · Phase 4 foundation: jobs API, BullMQ worker, fixture mode, PPT outline
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 · `apps/api/src/ai/*`, `apps/api/src/worker.ts`, `packages/shared/src/ai.ts`, `infra/*`, `apps/desktop/src/{api/ai.ts,api/client.ts,components/{AiGenerate,CreditsChip}.tsx,components/PptMaker.jsx}`
- **Status:** Decided by agent; packages approved by developer (DN-053).
- **Decision:**
  - **Jobs API:** `POST /ai/jobs` (requires an `Idempotency-Key` header). It checks the type's permission and input, then charges credits in the same transaction as the job row (402 when credits run short). It queues the job, or fails and refunds it (503) if queueing fails. A repeated key returns the same job, 200, uncharged.
  - **Reading jobs:** `GET /ai/jobs/:id` is for the starter or admins; anyone else gets 404. `GET /ai/jobs/:id/events` is SSE: it re-reads the row every second and ends at a terminal status (move to Redis pub/sub at scale). `GET /ai/mode` serves the fixture badge.
  - **Worker:** `dist/src/worker.js`, a separate compose service; only it holds the key. BullMQ allows 3 attempts with exponential backoff. Rate limits, 5xx and connection errors are retried; 4xx, refusals and invalid output are not. A final failure marks the job failed and refunds once. Usage and cost go to `ai_usage`.
  - **Claude calls:** `claude-opus-5-5` (`AI_MODEL`), streamed, with structured outputs from the job's zod schema (checked again with zod), a prompt-cached system prompt, adaptive thinking (the model default), effort per job, and server-side refusal fallbacks (`server-side-fallback-2026-07-01`, `fallbacks: "default"`).
  - **`AI_MODE`:**
    - `fixture` (the default): a recorded answer at `fixtures/ai/<type>/<sha256>.json`, otherwise a predictable sample
    - `record`: calls Claude and saves the answer as a fixture
    - `live`: calls Claude

    Production refuses anything but `live`. An empty key counts as unset.
  - **Migration `20261123010000_ai_job_progress`:** adds `error_code`, `result`, `progress_done`, `progress_total` and `fixture` to `ai_jobs`.
  - **First job, `ppt_outline`:** PptMaker has "AI से स्लाइड बनाएँ · N क्रेडिट" with live progress and the result filled in unsaved. The free empty outline stays. The header shows an "AI फिक्स्चर मोड" badge when AI is not live, and after a fixture run the screen says plainly that it was a sample answer, not AI. PptMaker's screenshot banner no longer promises an "AI screenshot detector … in 30 seconds".
- **Verified so far:** API tests 87 (11 new: charging, idempotency, 402 with nothing written, permissions, a fixture run, who can read a job, retry then a single refund, queue failure refunds, SSE). Desktop tests 36 (SSE reader, headers). Shared 36. Typecheck and build pass; compose validates.
- **End-to-end** in the real Electron app against Docker with the worker container in fixture mode:
  - the badge is shown; the button is disabled until a topic is typed, then reads "AI से स्लाइड बनाएँ · 1 क्रेडिट"
  - the worker logs the job as succeeded; the editor fills 5 slides titled by the topic, the document title fills, and the status is "unsaved"; the fixture note is shown
  - the header chip drops by exactly 1
- **Not verified:** a live Claude call (no key configured yet). Use `AI_MODE=record` once with a key to check output quality and save fixtures.
- **Next:** the deck-to-interactive-quiz job (DN-055), using the developer's prompt filled per institute and the `biol.html` engine as a neutral template.

### DN-053 · AI credits per institute, managed by an EduSuite operator role
- **Date:** 2026-11-23
- **Phase / area:** Phase 4 prerequisite · `packages/shared/src/{permissions,credits}.ts`, `apps/api/src/credits`, `apps/api/prisma` (migration `20261123000000_ai_credits`), `apps/desktop/src/components/{PlatformCredits,CreditsChip}.tsx`
- **Status:** Decided by developer (operator role, priced per job type, packages approved); details decided by agent
- **What was unclear:** The developer asked for "a credit system for individual institutes so each uses a limited number of uploads, managed through the admin". There was no role above an institute, and the plan's limit was a monthly token quota.
- **Options considered:** Who manages: A) an EduSuite operator role outside institutes, with an admin screen. B) Each institute's super admin. C) The operator, via a command only. What costs credits: A) every AI job, priced per type. B) Only deck-to-quiz uploads. C) A flat 1 per job.
- **Decision:** A and A. The developer also approved `@anthropic-ai/sdk` and `bullmq` for Phase 4, and PDF-only decks for now.
  - **Role:** `platform_admin` (scope `platform`) holds only `platform.credits`. It is not in `ROLES`, so the users API can never create or assign it (tested). It is created with `createSuperAdmin --platform` in a dedicated operator institute, which the command refuses if that institute has any staff. `scopeWhere` refuses the platform scope, so it can never be used to read institute data. The operator lands on the credits screen and sees nothing else.
  - **Data:** `institutes.credit_balance` (CHECK ≥ 0) and an append-only `credit_ledger` (kinds: grant, adjust, job_charge, job_refund; `balance_after`; reason; actor; job). A unique (job, kind) pair means a job is charged once and refunded at most once. `ai_jobs.credits_charged` is added. `ai_credit_prices` holds only the prices the operator changed; every other job type uses `DEFAULT_CREDIT_PRICES` (in code, because Postgres can't use a new enum value in the migration that adds it). New job type `deck_quiz` (DN-054).
  - **Moving credits:** one transaction with a conditional update (`balance >= amount`), so concurrent spends can't go below zero. Tested: ten parallel spends against a balance of 5 give exactly five successes and 0 left; the database also refuses a direct negative write.
  - **Default prices** (operator-editable, please review): PPT outline 1, paper 2, screenshot MCQ 1 per screenshot, DPP 1, lesson 1, doubt 1, YouTube 1, notice 1, book chapter 2, poster copy 1, deck quiz 10. A price is "per job" or "per item". Changes apply to new jobs.
  - **API:**
    - `GET /credits`: own balance and the prices of job types the caller may start
    - `GET /credits/ledger`: own history, for admins with `audit.view`
    - `GET /platform/institutes`: customer institutes with balance and use in the last 30 days; the operator's own institute is excluded
    - `GET` and `POST /platform/institutes/:id/credits`: history, and add or take away credits with a required reason of 3–300 characters (409 `CREDITS_ADJUST_TOO_LARGE` below zero)
    - `GET /platform/credit-prices` and `PUT /platform/credit-prices/:jobType`

    Grants, adjustments and price changes are audited. `CreditsService.chargeJob` (402 `CREDITS_EXHAUSTED`) and `refundJob` are ready for the Phase 4 jobs API.
  - **Desktop:**
    - an operator screen with institutes and balances, an add/take-away dialog (reason required, shows the balance after, can't take away more than the balance), paged history, and an editable price table
    - an "AI क्रेडिट: N" chip in the header for roles that can start any AI job (it turns red below 10)
    - `ApiClient.put`
  - **Seed:** an operator institute `EDUSUITE` with `DEMO-PA`, and starting credits written through the ledger (DEMO 200, OTHR 20).
  - The token quota (`ai_monthly_token_quota`) stays in the schema; credits are what limit use.
- **Reason:** Credits are the unit the operator sells; the ledger makes every change explainable, and the database guarantees the balance can't go negative.
- **Verified:** API tests 76 (8 new):
  - only the operator reaches the platform routes (403 and 401 otherwise)
  - customer list excludes the operator institute, which can't be credited
  - grant and adjust update the balance, ledger (paged newest first) and audit; taking away too much is refused; zero amounts and missing reasons are refused
  - balance and per-role prices: a counselor sees only notice drafting; the other institute has its own balance
  - admins see the history and teachers don't
  - price change seen by the institute; unknown job types answer 404
  - the race test
  - the users API refuses `platform_admin`

  Shared tests 33. End-to-end in the real Electron app against Docker:
  - the operator lands on `#/platform` with only that menu item; its own institute isn't listed
  - adding 50 with a reason shows the preview and moves 200 → 250; the history row shows the reason and the operator's name
  - taking away more than the balance is blocked in the form; a price change saves
  - the teacher's header shows "AI क्रेडिट: 250" and `#/platform` bounces to the dashboard; the super admin has no operator menu
  - a counselor sees the chip, because notice drafting uses credits
- **Affects:** the files above, `apps/api/src/{common/errors.ts,auth/{scope,crypto}.ts,scripts/{seed,createSuperAdmin}.ts,app.module.ts}`, `packages/shared/src/{auth,users}.ts`, `apps/desktop/src/{App.tsx,api/client.ts,components/{Header.tsx,Sidebar.jsx,UserManagement.tsx}}`, test fixtures
- **Revisit if:** Institutes should buy credits themselves (add payments, with approval), credits should expire, or branches need their own sub-limits.

### DN-052 · Product is EduSuite AI; documents carry only the signed-in institute's own name; installer renamed
- **Date:** 2026-11-23
- **Phase / area:** Branding · `apps/desktop/{package.json,index.html,build/*,public/*}`, `src/utils/{branding.ts,academicSession.ts,motionHtmlGenerator.js,motionTemplate.js,pptxGenerator.js,mediaHelper.js}`, Header, LoginScreen, Sidebar, ScreenshotToPpt and the screens that used the logo
- **Status:** Decided by developer (three choices, below)
- **What was unclear:** Satyadhi Sharma Classes' name, Indore address, helpline and logo were built in as defaults, so any institute using the app would show or print another institute's details:
  - PPT and motion-file exports, including ad slides with a fixed "MPTET Biology" title slide
  - the MCQ preview, the sidebar footer and the header helpline
  - the logo fallback on every screen, the login and header logo
  - the window title, the installer name and the app icons

  Whether the product itself is "EduSuite" or "Satyadhi Sharma Tech" was the developer's call.
- **Options considered / Decision:** The developer chose:
  - the **EduSuite** brand for the app itself
  - an **initials badge** when an institute has no logo (logo upload is its own change)
  - **renaming the installer now**

  What changed:
  - **App:** window title "EduSuite AI"; an EduSuite mark (amber "E" on navy, `branding.ts`) on the login screen and in the header; new icons rendered from that mark (`build/icon.png` 1024, `build/icon.ico` and `public/icon.ico` 16–256 as PNG-in-ICO, `public/logo.png`).
  - **Installer:** `appId` `com.edusuite.desktop`, `productName` and shortcut "EduSuite AI", DMG title and author renamed. The Mac workflow artifact is now `EduSuite-AI-macOS-Installer`.
  - **Effect of the rename:** the app's data folder changes, so existing installs start fresh: the saved sign-in, language and device id are gone, and users sign in again. The language key is now `edusuite_lang`.
  - **Institute's own details:** the sidebar footer shows the institute's initials, name and current branch. The header helpline shows the institute's own phone (hidden if it has none). The header session ("सत्र 2026-27") is worked out from today's date, with the session starting in April (`academicSession.ts`).
  - **Documents:** every screen uses `instituteLogo(activeInstitute)`: the institute's logo if it has one, otherwise a navy-and-amber badge with the first letter of its first two words (Devanagari conjuncts kept whole).
    - PPT generator: footers and brand use only the institute's name and, for the MCQ deck, its city and phone.
    - Motion template: title slide, header brand, finale line and art caption come from the set (title, subject, exam tag, faculty, question count) and the institute. All ad slides are removed (pre-roll, every 5 questions, outro); their images were never shipped.
    - MCQ preview: footer and badge use the institute's own name, city and phone.
  - **Safer motion export:** values are inserted with a function (so a `$&` in a title stays text) and escaped for both HTML and JS template literals (`& < > " ' \` $ \\`). Question JSON escapes `<`, so it can't close the script block. Tests cover both.
  - **Removed:** the embedded logo (`src/assets/logoData.js`), its generator (`scripts/makeLogo.cjs`), the unused `src/assets/{logo,hero}.png`, `public/{favicon.png,favicon.svg,icons.svg}` (`favicon.png` was the old logo and shipped in every installer), and the unused brand strings in `translations.js`. The `createSuperAdmin` usage example uses demo names.
  - **Kept on purpose:** the MCQ dark theme's id `satyadhi_dark` stays as an internal value, because saved MCQ sets store it; only its label changed. Planning documents (`docs/architecture/*`, `AGENT_README.md`, `master-build-prompt.md`) still say "EduSuite / Satyadhi Sharma Tech"; they are the developer's documents and were not edited. The plan's code-signing `publisherName` is a Phase 6 decision.
- **Reason:** A multi-institute product can't print one institute's name, address and helpline on another's papers.
- **Verified:**
  - Unit tests: desktop 34 (initials, logo fallback, escaping, motion file with no Satyadhi text, no ad slides and no unfilled placeholders, real question count, academic session); API 69; shared 29.
  - Electron security self-check still passes.
  - End-to-end in the real Electron app against Docker:
    - window title "EduSuite AI"; login screen shows only the EduSuite mark and no Satyadhi text
    - as the demo institute: no banned text anywhere; sidebar footer "डेमो कोचिंग संस्थान | मेन ब्रांच"; header "सत्र 2026-27"; dashboard badge "डेको"; the notice circular is clean
    - as the second seeded institute: its own name in the header and sidebar, with no banned text
- **Affects:** the files above; anyone with an older build installed (fresh sign-in)
- **Revisit if:** Logo upload is added (store the file id in `branding`, then `instituteLogo` uses it), or the product name changes again before Phase 6 signing.

### DN-051 · `GET /stats/dashboard`; Dashboard and TeacherDesk show real work; sample data removed
- **Date:** 2026-11-23
- **Phase / area:** Phase 3 · `apps/api/src/stats`, `packages/shared/src/stats.ts`, `apps/desktop/src/components/{Dashboard.jsx,TeacherDesk.jsx,RecentDocuments.tsx,DocumentBar.tsx}`, `App.tsx`, `translations.js`
- **Status:** Decided by agent
- **What was unclear:** DN-021 says these screens show real documents and counts, with schedule and syllabus "coming soon". The plan lists `GET /stats/dashboard` under ADMIN but doesn't say what it returns, who may call it, or how a listed document opens.
  - **Dashboard:** its stat cards were fixed text ("32 बैचेस", "8 सेशंस", "180+ सेट्स", "48 किताबें"), it had an always-"LIVE" class banner, and the hero badge named another institute. Tool tiles also showed screens the role can't open.
  - **TeacherDesk:** made up four named faculty with experience and timetables, a syllabus tracker with invented percentages, and a footer with another institute's name and city.
- **Options considered / Decision:**
  - **API:** `GET /api/v1/stats/dashboard`, any signed-in user (every role has a dashboard, DN-008). For each document type the role may use, it counts with exactly the documents API's rules (DN-038): super admin institute-wide, everyone else their current branch. Types the role can't use are left out. It returns `byType` (total, mine), `totals` (total, mine, last 7 days), and the 6 latest visible and 6 latest own documents as summaries (no content). Shared types are in `packages/shared/src/stats.ts`, with `DOCUMENT_SCREENS` (type → screen) and Hindi `DOCUMENT_TYPE_LABELS`. A shared test checks that each type's screen needs the same permission as the type.
  - **Opening from a list:** a link like `#/ppt?open=<id>` makes that screen's `DocumentBar` open the document once and then drop the parameter. Opening a document of another type on the wrong screen is refused. Save and delete refresh the stats.
  - **Dashboard:** three real cards (saved documents, "branch" or "whole institute"; mine; last 7 days) and "हाल के दस्तावेज़" (recent documents) with "खोलें". The live banner and fake stat strings are gone (keys removed from `translations.js`). Tool tiles and hero buttons show only screens the role may open. The hero buttons are a 2×2 grid, because four in a row squeezed the greeting into a narrow column.
  - **TeacherDesk:** the signed-in user's name, role, institute and branch; tool tiles filtered by role; "मेरे हाल के दस्तावेज़" (my recent documents) with "खोलें"; their own count per type; and one "टाइमटेबल और सिलेबस ट्रैकर जल्द आ रहा है" (timetable and syllabus tracker coming soon) card (DN-021). All the made-up faculty, schedule, syllabus and notice content is gone.
  - **Translations:** the hero badge no longer names another institute, and tool descriptions no longer promise AI detection, "500+ MCQs", slides "ready as soon as you type a topic", or "GST" receipts (DN-013).
  - **`sampleData.js` deleted:** the Dashboard's "sample PPT" prop was passed but never used, so it is removed from `App.tsx` with the last sample data.
- **Not changed (follow-up):** another institute's name and logo still appear as defaults elsewhere: the sidebar footer, the `SATYADHI_LOGO` fallback, the PPT and motion-file generators, and parts of QuestionPaperMaker, ScreenshotToPpt and the UI gallery. The Dashboard hero text still lists every tool, even for roles that can't use some of them.
- **Reason:** A dashboard that shows invented numbers misleads the people running the institute.
- **Verified:** API tests (3 new, 69 total) with real Postgres:
  - 401 without sign-in
  - per-type and "mine" counts and newest-first recent lists
  - a teacher doesn't count another branch's notice
  - a typist has no notice type
  - a counselor sees only notices and posters
  - the super admin sees both branches
  - another institute sees nothing
  - deleted documents stop counting

  Shared tests 29. End-to-end in the real Electron app against Docker:
  - teacher: no fake stats or other-institute badge; 9 tool tiles with no fee-receipt tile; saving a deck raises "मेरे दस्तावेज़" (my documents) by 1 and lists it; "खोलें" lands in PptMaker with the deck loaded, shown as "saved", and the link cleaned to `#/ppt`
  - TeacherDesk: shows the teacher's name, their deck, counts per type and the coming-soon card, with none of the made-up faculty
  - counselor: no PPT documents, only the receipt, poster and notice tiles, and no teacher-portal button
- **Affects:** `/api/v1/stats/dashboard`, `apps/api/src/{stats,app.module.ts,documents/documents.service.ts}`, `packages/shared/src/{stats.ts,stats.test.ts,index.ts}`, the desktop files above, `apps/desktop/src/api/{stats.ts,documents.ts}`, `apps/desktop/src/data/sampleData.js` (deleted)
- **Revisit if:** Stats get slow on large institutes (add an index on `documents(institute_id, branch_id, type, updated_at)`), or timetables are added to the plan.

### DN-050 · Image Studio saves posters through DocumentBar; fake export and outside-AI prompts removed
- **Date:** 2026-11-23
- **Phase / area:** Phase 3 · `apps/desktop/src/components/ImageStudio.jsx`
- **Status:** Decided by agent
- **What was unclear:**
  - "Export Graphic" saved nothing (confetti plus an `alert()` saying the design was saved).
  - The category presets made claims an institute may not be able to back ("Kota Top Faculty", "100% Success Ratio", "Apex Family").
  - Every category except toppers showed an "Admissions Open" badge, and every poster carried an "Official Creative" badge.
  - A box offered to copy prompts for Gemini/Imagen. The plan keeps AI on our own server (ADR-2), and counselors get no AI copy (DN-008).
- **Options considered / Decision:**
  - Same save pattern as DN-041 to DN-049 (`PosterContentSchema` unchanged). A new poster starts with empty text, the admission category, 1:1 and the cyan colour.
  - Choosing a category no longer overwrites the text. "<category> का ढाँचा भरें" fills plain Hindi starting text with [brackets] for details, and asks first if any text is already written. Templates make no claims about results or faculty.
  - The badge on the poster follows the category (प्रवेश प्रारंभ, हमारे टॉपर्स, अध्ययन सामग्री, शुभकामनाएँ). The "Official Creative" badge is gone. The phone and city footer shows only what the institute has.
  - A colour picker sets the accent colour (saved as `#rrggbb`, which the schema requires).
  - The fake export and the Gemini/Imagen prompt box are removed. The preview says to use a screenshot for now and that PNG download comes later, the same follow-up as the YouTube thumbnail (DN-047).
  - Controls use the shared primitives with Hindi labels; category and size buttons use `aria-pressed`. The poster itself keeps its own design.
- **Reason:** No fake export, no claims put in an institute's mouth, and no AI path outside the server that counts and limits AI use.
- **Verified:** End-to-end in the real Electron app against Docker: no "Kota", "Gemini", "Export Graphic" or "Official Creative" on open; the topper category shows "हमारे टॉपर्स"; its template fills an empty poster without asking; a typed call-to-action, the 9:16 size and colour #123abc show; the template over written text asks first, and cancelling keeps it; save shows "saved"; New clears without asking and goes back to the admission badge; reopening from History restores the text, colour, category and size, and shows "saved"; an unsaved edit then New asks first, and "रुकें" keeps it.
- **Affects:** `ImageStudio.jsx`
- **Revisit if:** PNG export is built (shared with the YouTube thumbnail), or Phase 4 adds `poster_copy` AI for roles with `image_studio.ai_copy`.

### DN-049 · BookCreator becomes a chapter editor that prints the whole book; unused sample data removed
- **Date:** 2026-11-23
- **Phase / area:** Phase 3 · `apps/desktop/src/components/BookCreator.jsx`, `apps/desktop/src/data/sampleData.js`
- **Status:** Decided by agent
- **What was unclear:** Almost everything on this screen was fake:
  - The presets were sample books from `sampleData.js`.
  - "पूरी किताब तैयार करें" waited 0.9 s, then filled every chapter with the same filler paragraphs and placeholder MCQs ("विकल्प 1"…), with confetti.
  - The cover always claimed "500+ Practice MCQs" and an "Official" badge, and ignored the chosen cover colour.
  - The contents showed made-up page numbers ("Page 12, 24…").
  - "पूरी किताब प्रिंट करें" printed only the page currently on screen.
  - Nothing in a chapter could be edited.
- **Options considered / Decision:**
  - Same save pattern as DN-041 to DN-048 (`BookContentSchema` unchanged). A new book starts blank with one empty chapter.
  - "अध्याय ढाँचा बनाएँ" makes 3, 5 or 8 empty chapters, and asks first if any chapter already has content. A note says AI chapters come in the next phase.
  - Chapter editor: pick a chapter (also by clicking its tab or contents entry); title, subtitle, theory (paragraphs separated by a blank line), exam points (one per line), practice questions (text, options one per line, answer; add up to 500, delete); add a chapter (up to 100) or delete one.
  - Cover: uses the chosen theme (now saved as `coverColor`: `amber`, `navy` or `emerald`) and shows the real chapter and question counts. The "Official" badge and "500+" claim are gone; empty author or edition show "—".
  - Contents: chapter numbers and titles only, no page numbers (the app can't know them).
  - Printing: cover, contents and every chapter are always rendered; only the chosen one shows on screen, and in print each gets its own page. The print stylesheet hides all buttons, so the contents print from a plain copy of each entry. Chapters print without the on-screen scroll limit. The editor is `no-print`.
  - `sampleData.js`: `sampleBooks`, and the now-unused `sampleQuestionPapers` and `sampleInstitutes`, are removed. Only `presentationPresets` remains, still used by the Dashboard's sample-PPT download.
  - Form uses the shared primitives with Hindi labels; page tabs and theme buttons use `aria-pressed`.
- **Reason:** A printed study book goes to students; it must hold the institute's own content and print completely, with no invented claims.
- **Verified:** End-to-end in the real Electron app against Docker: no "500+", "Official" or fake page numbers on open; a 3-chapter outline fills the document title; chapter 2's two theory paragraphs, exam point and practice question show in the reader; the cover uses the navy theme and shows "3 अध्याय" and "1 अभ्यास प्रश्न"; in print mode the page shows the cover, contents and all three chapters and hides the editor; save shows "saved"; re-running the outline asks first; New clears without asking; reopening from History restores 3 chapters, the navy theme, and chapter 2's title, paragraphs, question and options, and shows "saved"; an unsaved edit then New asks first, and "रुकें" keeps it.
- **Affects:** `BookCreator.jsx`, `sampleData.js`
- **Revisit if:** Phase 4 adds the `book_chapter` AI job, or the Dashboard's sample PPT is replaced (then `sampleData.js` can go).

### DN-048 · NoticeHub becomes an editor with own-institute templates; saves through DocumentBar
- **Date:** 2026-11-23
- **Phase / area:** Phase 3 · `apps/desktop/src/components/NoticeHub.jsx`, `apps/desktop/src/data/sampleData.js`
- **Status:** Decided by agent
- **What was unclear:** The screen only displayed three fixed English notices from `sampleData.js` (fee reminder, PTM, admissions). Nothing could be edited, and the text named another institute, with its phone number, campus address and reference numbers, so every institute would have sent another institute's notice. Every card also showed a fixed "18 Nov 2026" date.
- **Options considered / Decision:**
  - The screen is now an editor: category, date, title, the WhatsApp message and the formal circular, all saved (`NoticeContentSchema` unchanged).
  - The three notice types stay as Hindi starting templates (fee reminder, parent-teacher meeting, admissions). They are built from the signed-in institute's own name and phone; anything staff must fill in is in [brackets], including the phone when the institute has none. Applying a template to an empty notice fills it at once. If a message is already written, it asks first, because it replaces the title, category and both messages. These are plain templates, not AI, and are labelled as a starting point.
  - Preview: a WhatsApp bubble or the formal circular with the institute letterhead, title, date and "अधिकृत हस्ताक्षर" (authorised signature). The editor is `no-print`. The copy button copies the version being previewed and is disabled when it's empty.
  - `sampleNotices` was removed from `sampleData.js` (nothing else used it).
  - The screen moved to tokens and the shared primitives with Hindi labels; preview switchers use `aria-pressed`.
- **Reason:** A notice must come from the institute sending it, and staff need to change the details before sending.
- **Verified:** End-to-end in the real Electron app against Docker: no other-institute text on open; the fee template applies without asking on an empty notice and uses the demo institute's own name; an edited date shows in bold in the WhatsApp preview, and the circular shows "दिनांक: 25 नवंबर 2026"; applying another template over written text asks first, and cancelling keeps it; save shows "saved"; New clears without asking; reopening from History restores every field and shows "saved"; an unsaved edit then New asks first, and "रुकें" keeps it.
- **Affects:** `NoticeHub.jsx`, `sampleData.js`
- **Revisit if:** Phase 4 adds the `notice` AI job, or the institute wants English notices too (templates per language).

### DN-047 · YouTube Studio saves through DocumentBar; title, description and tags become editable; fake download removed
- **Date:** 2026-11-23
- **Phase / area:** Phase 3 · `apps/desktop/src/components/YouTubeStudio.jsx`
- **Status:** Decided by agent (the thumbnail PNG download is a follow-up; see below)
- **What was unclear:** "थंबनेल डाउनलोड करें" downloaded nothing (confetti plus an `alert()` saying it was "ready for export"). The video title appended "Indore", the tags were a fixed list naming one institute ("satyadhi sharma classes"), and the description was built but never shown or copied. The three topic presets were sample text, one naming that institute. The schema has `title`, `description` and `tags`, which the screen never let anyone edit.
- **Options considered:** Download: A) Remove the fake button now and say plainly that PNG download comes later; build a real export (drawing the thumbnail on a `<canvas>`, saved through `file.saveAs`) as its own change set. B) Build the canvas export in this change set. C) Add an HTML-to-image library (new dependency, needs approval).
- **Decision:** A.
  - Same save pattern as DN-041 to DN-046. A new thumbnail starts blank with the red theme; the presets, confetti and alert are gone. The preview shows placeholders and hides empty badges.
  - Title, description and tags are editable and saved. "थंबनेल से टाइटल भरें" fills the title from headline, punchline and the institute's name (no hard-coded city). The title shows a count against YouTube's 100-character limit (the field allows the schema's 200). Tags are typed comma-separated and saved as a cleaned list. Each of the three has its own copy button, disabled when empty.
  - The preview note says to use a screenshot of the thumbnail for now.
  - Theme buttons use `Button` with `aria-pressed`; the form uses the shared primitives and Hindi labels. The thumbnail itself keeps its own design.
- **Reason:** Nothing claims a download that doesn't happen, and the YouTube metadata is the institute's own, not another institute's.
- **Verified:** End-to-end in the real Electron app against Docker: no sample or other-institute text and no fake download button on open; headline, punchline and badge show on the thumbnail; "fill title" gives "headline | punchline | institute"; save shows "saved"; New clears without asking; reopening from History restores every field, the Royal Blue theme, the description's two lines and the tags (cleaned to "mppsc, इतिहास, live"), and shows "saved"; an unsaved edit then New asks first, and "रुकें" keeps it.
- **Affects:** `YouTubeStudio.jsx`
- **Revisit if:** The PNG download is built (option A's follow-up), or Phase 4 adds AI-written titles and descriptions.

### DN-046 · DoubtSolver saves through DocumentBar; teachers write the solution until Phase 4
- **Date:** 2026-11-23
- **Phase / area:** Phase 3 · `apps/desktop/src/components/DoubtSolver.jsx`
- **Status:** Decided by agent
- **What was unclear:** The screen always showed one built-in train-and-platform solution, whatever question was typed. Its "हल निकालें" (solve) button waited 0.7 s and played confetti, so it looked as if the AI had solved the typed question.
- **Options considered / Decision:**
  - Same pattern as DN-041 to DN-045. A new doubt starts blank. The sample solution, the fake solve button and the confetti are gone; a note says AI solutions come in the next phase.
  - The teacher writes every part: question, subject, answer, steps (one per line), shortcut trick, common mistake and similar questions (one per line). The solution card on the right shows what was typed and hides the optional parts that are empty.
  - Saved shape is `DoubtContentSchema` unchanged; empty lines aren't saved, and an empty trick or mistake isn't saved.
  - The WhatsApp copy now includes only the parts that have text, and the similar questions.
  - The whole screen moved to tokens and the shared primitives (light surfaces, Hindi labels, `PageHeader`).
- **Not changed:** the sidebar still shows an "AI" badge on this screen; sidebar labels change in their own change set.
- **Reason:** A saved solution is the teacher's own; nothing implies the AI solved the student's question.
- **Verified:** End-to-end in the real Electron app against Docker: no sample text on open; all parts typed show on the card, and the empty "common mistake" is hidden; save shows "saved"; New clears without asking; reopening from History restores every field and shows "saved"; an unsaved edit then New asks first, and "रुकें" keeps it.
- **Affects:** `DoubtSolver.jsx`
- **Revisit if:** Phase 4 adds the `doubt_solve` AI job (a solve button then starts a job and fills the fields for the teacher to check).

### DN-045 · LessonPlanner saves through DocumentBar; teachers write the plan until Phase 4
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/desktop/src/components/LessonPlanner.jsx`
- **Status:** Decided by agent
- **What was unclear:** The screen always showed one built-in English physics plan (Faraday's laws, 5 days). Its form fields changed nothing on the plan, and "Update Lesson Blueprint" only played confetti and showed an English `alert()` claiming the AI had updated it. Its panels were light text on dark slate, unlike the migrated screens.
- **Options considered / Decision:**
  - Same pattern as DN-041 to DN-044. A new plan starts blank: empty chapter, subject and class, no objectives, one empty day. The sample plan, the confetti button and the alert are gone.
  - "दिन-वार ढाँचा बनाएँ" (make a day-by-day outline) creates one empty day per chosen teaching day (3, 5 or 8). If any day already has a topic, activity or homework written, it asks first, because it replaces them. A note says AI lesson plans come in the next phase.
  - Editors: objectives in a textarea, one per line (empty lines aren't saved); a day editor (pick a day; day label, topic, activities, homework; add a day up to 365, or delete one). The plan on the right now shows what the teacher typed.
  - Saved shape is `LessonContentSchema` unchanged. A reopened plan whose number of days isn't 3, 5 or 8 still shows its own value.
  - The whole screen moved to tokens and the shared primitives (light surfaces, Hindi labels); the form column is `no-print`.
- **Reason:** A saved plan is the teacher's own work; nothing claims the AI did something it didn't.
- **Verified:** End-to-end in the real Electron app against Docker: no sample text on open; a 3-day outline gives 3 days and fills the document title from the chapter; objectives and day 2 typed show in the plan; save shows "saved"; New clears without asking; reopening from History restores 3 days, the duration, both objectives and day 2's topic, activities and homework, and shows "saved"; re-running the outline over written days asks first, and cancelling keeps them; an unsaved edit then New asks first, and "रुकें" keeps it.
- **Affects:** `LessonPlanner.jsx`
- **Revisit if:** Phase 4 adds the `lesson_plan` AI job (the outline button then starts a job and fills the days).

### DN-044 · DPP / notebook / OMR saves through DocumentBar; DPP questions are teacher-written
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/desktop/src/components/NotebookDppMaker.jsx`
- **Status:** Decided by agent
- **What was unclear:** The DPP sheet always printed five built-in sample questions, which couldn't be edited, and its "Update Material Template" button only played confetti and showed an English `alert()`. The sheet also carried a fake "[QR] Scan for Video Solution · Satyadhi Sharma Mobile App" block and a fixed "Max Marks: 20 | Time: 25 Mins".
- **Options considered / Decision:**
  - Same pattern as DN-041 to DN-043. A new sheet starts with one empty question and empty topic, subject and batch. The sample questions and the confetti button are gone.
  - DPP question editor: text and an optional hint per question, add (up to 200, the schema limit) and delete. Hints are for the teacher and are not printed, as before. A note says AI questions come in the next phase.
  - The sheet type (DPP, notebook, OMR) and the OMR size are saved, so a reopened document comes back as the same kind of sheet. Topic, subject and batch fields now show for every sheet type (the notebook page shows the topic); before, they showed only for DPP.
  - Printed sheet: the fake QR block is removed (there is no video-solution link to point to); the fixed marks and time became the question count; the batch shows in full instead of only its first word; the date line no longer hard-codes 2026. OMR bubbles lost their hover effect, since they aren't clickable.
  - Settings and editor use the shared primitives and are `no-print`; the sheet-type switcher uses `Button` with `aria-pressed`.
- **Reason:** Saved sheets are the teacher's own questions, and nothing on the printout claims a feature that doesn't exist.
- **Verified:** End-to-end in the real Electron app against Docker: no sample text on open; topic, subject, batch, two questions and a hint typed; switching to OMR 100 shows 100 bubbles; save shows "saved"; New clears without asking; reopening from History comes back as OMR 100 with topic and batch, and the DPP tab shows both questions and the hint; an unsaved change then New asks first, and "रुकें" keeps the work.
- **Affects:** `NotebookDppMaker.jsx`
- **Revisit if:** Phase 4 adds a `dpp` AI job, or institutes want a real QR code to a video solution.

### DN-043 · Screenshot → MCQ saves sets with real screenshot uploads; teachers type the questions until Phase 4
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/desktop/src/components/ScreenshotToPpt.jsx`
- **Status:** Decided by agent
- **What was unclear:** Every "AI" step on this screen was fake. Uploading a screenshot pasted a built-in sample question's text and answer under it, timers played a pretend OCR scan, and a "10 demo screenshots" batch loaded made-up questions. How should this become real saved work while AI reading of screenshots waits for Phase 4?
- **Options considered / Decision:**
  - Each chosen screenshot becomes a question with empty text and answer "A", and the screen goes straight to the review editor, where the teacher types the question, four options, the correct answer and the trick. The sample questions, demo batch, scan timers, the "run AI detector" button, the "auto Devanagari OCR" badge and the confetti are gone. The header says AI reading comes in the next phase.
  - Screenshots upload through the files API (DN-040) one by one, as soon as they are chosen. Each card shows "sending to server…", or an error with a "send again" button; a failed upload also shows a toast. The saved question keeps `screenshotFileId`. Saving before an upload finishes saves the question without its image; when the upload completes the set shows "unsaved changes" again, so nothing is silently lost.
  - The picker accepts PNG, JPEG and WebP only (what the API accepts; SVG data URLs from the old demo are gone).
  - Reopening a saved set shows the text at once, then fetches each screenshot through `GET /files/:id/url`, downloads it (bucket CORS allows GET) and keeps it as a data URL, so the PPTX and motion exports still embed it. A screenshot that can't be fetched is marked "screenshot didn't load".
  - Saved shape is `McqSetContentSchema` unchanged; `qNum` is saved from the list order. Subject and exam tag are new inputs in the settings box; they were saved before but had no control. New sets start with empty titles instead of sample text.
  - The dark banner became the shared `PageHeader`; the rest of the screen keeps its older styling until it is migrated. A PPTX failure shows an inline message instead of `alert()`.
- **Correction to DN-042:** its "unsaved edit then नया asks first" check actually clicked the sidebar's "नया" badge, so it tested the leave-screen guard, not the New button. The e2e scripts now click the exact button; re-run on 2026-11-21 against the question paper screen, the New button asks first and "रुकें" keeps the edit.
- **Reason:** Saved MCQ sets hold the teacher's real questions and images, and nothing pretends to be AI.
- **Verified:** End-to-end in the real Electron app against Docker and Garage: no demo or AI text on open; a real PNG chosen through the file input uploads with no error and opens the editor; typed question, options and answer B save; New clears the screen without asking; reopening from History restores the text, answer B and the screenshot fetched back from storage, and shows "saved"; an unsaved edit then a sidebar click asks first, and "रुकें" keeps the edit.
- **Affects:** `ScreenshotToPpt.jsx`
- **Revisit if:** Phase 4 adds the `screenshot_mcq` AI job (uploads then start a job that fills the fields), or sets grow large enough that fetching every screenshot on open is slow (then load them lazily).

### DN-042 · QuestionPaperMaker saves through DocumentBar; teachers write the questions until Phase 4
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/desktop/src/components/QuestionPaperMaker.jsx`
- **Status:** Decided by agent
- **What was unclear:** The screen's "Generate Test Paper" filled in the same fake chemistry questions for every subject after an 800 ms delay, and there was no way to edit a question, so a saved paper would only hold that fake text.
- **Options considered / Decision:**
  - Same pattern as PptMaker (DN-041): no `sampleData.js`; a new paper starts with one empty section. The button became "पेपर ढाँचा बनाएँ": it lays out the usual three sections (3 MCQs, 2 short, 1 long) with empty questions, and a note says AI questions come in the next phase. The fake delay and confetti are gone.
  - A section editor was added: pick a section, rename it, add or delete sections (up to 20, the schema limit); per question: text, options one per line (empty means not an MCQ), answer, delete; "new question" and "new MCQ" buttons.
  - Saved shape is `PaperContentSchema` unchanged. Option lines that are empty or only a letter ("A) ") aren't saved; an empty answer isn't saved. The unused `difficulty` state was dropped (not in the schema, no control on screen).
  - The settings panel moved to the shared `Field`/`Input`/`Select` primitives; this also fixes the "Max Marks" and "Time Allowed" labels, which were light grey on white. Labels are Hindi. A reopened paper whose class or marks isn't in the dropdown list still shows its own value.
  - The settings and editor column is `no-print`, so printing gives only the paper. The general instructions no longer claim fixed marks per section.
- **Reason:** Saved papers are the teacher's real work, and nothing pretends to be AI.
- **Verified:** End-to-end in the real Electron app against Docker: no sample text on open; template gives 3 sections; a typed MCQ shows in the preview; save shows "saved"; leaving after saving doesn't prompt; coming back starts blank; reopening from History restores the question, options, answer, subject and all 3 sections and shows "saved"; an unsaved edit then "नया" asks first, and "रुकें" keeps the edit.
- **Affects:** `QuestionPaperMaker.jsx`
- **Revisit if:** Phase 4 adds `question_paper` AI jobs (the button then starts a job and fills the questions).

### DN-041 · Shared DocumentBar for save/open/history; PptMaker is the first wired screen
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/desktop/src/{api/documents.ts,components/DocumentBar.tsx,components/PptMaker.jsx}`
- **Status:** Decided by agent
- **What was unclear:** Track B asks for one consistent "save → history" flow on every tool screen and unsaved-changes guards, but not where the bar sits, how "unsaved" is detected, or what to do with screens whose "Generate" is still a fake until Phase 4.
- **Options considered / Decision:**
  - One `DocumentBar` under each screen's `PageHeader`: title, status ("अभी सेव नहीं हुआ" / "बिना सेव किए बदलाव" / "सेव हो गया · time", announced politely), New, History, Save. A screen gives it its content (in its type's schema shape) plus `onOpen` and `onNew`.
  - Unsaved changes: compare the screen's current title+content with the last saved or opened state. After New or Open, the screen's next render becomes the baseline, so small differences in how a screen rebuilds content don't show as false "unsaved".
  - Leaving with unsaved changes asks first (react-router `useBlocker` for in-app navigation; also before New or Open). A stale save (409) offers "open the latest" or "save as a new copy".
  - History modal: title search, "only mine", newest first, load more, open, and delete (creator or admin) with a confirmation that says it can't be reopened here.
  - Upload helper (`uploadFile`): presign → PUT straight to storage → complete; used by the screens that take images.
  - PptMaker: no `sampleData.js`; a new deck starts blank. Its "Generate" button became "स्लाइड ढाँचा बनाएँ" (make an outline template) with a note that AI content comes in the next phase; the fake 900 ms "AI" delay and confetti are gone (golden rule 5). A small slide editor (tag, title, points one per line, exam tip, add/delete slide) was added so a saved deck is real work, not a template.
- **Reason:** One flow for every screen, honest about what isn't built yet, and no silent loss of work.
- **Verified:** End-to-end in the real Electron app against Docker: new screen "not saved" → edit "unsaved" → save "saved · 01:52 pm"; leaving after saving doesn't prompt; reopening from History restores the edited slide and shows "saved"; an unsaved edit then a sidebar click asks first, and "रुकें" keeps the page and the edit.
- **Affects:** the 13 other tool screens as they're wired (one change set each)
- **Revisit if:** Staff want autosave, or browser-level close (closing the window) should also ask.

### DN-040 · Files API: presign → upload → verify, public storage address, Garage quirks
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/api/src/files`, `packages/shared/src/files.ts`, `infra/*`
- **Status:** Decided by agent
- **What was unclear:** The plan says "presigned uploads" and `GET /files/:id` (302), but not how an upload is confirmed, how the type is really checked, which address links are signed for (the API reaches Garage as `garage:3900`, which the desktop can't), or how the `file://` app passes storage CORS.
- **Options considered / Decision:**
  - Flow: `POST /files/presign {name, mime, bytes}` creates the record and returns a 10-minute PUT link with content type and length signed in; the app uploads straight to storage; `POST /files/:id/complete` (uploader only) checks the real size and the first bytes (PNG, JPEG, WebP, PDF signatures). A mismatch deletes the object and the record and answers `FILE_SIZE_MISMATCH` or `FILE_TYPE_MISMATCH`. Only completed files can be read.
  - Types and sizes: PNG, JPEG, WebP up to 10 MB; PDF up to 25 MB. SVG is refused (it can carry script).
  - Keys: `<instituteId>/<random uuid>.<ext>`, never from the file name; the cleaned name is kept only for the download name.
  - Reading: any signed-in user of the same institute (other institutes get 404). `GET /files/:id` redirects (302) to a 5-minute signed link; `GET /files/:id/url` returns the link as JSON for `<img>` tags, which can't send the login token.
  - Addresses: the API uses `S3_ENDPOINT` for its own calls and signs links for `S3_PUBLIC_ENDPOINT` (`http://localhost:3900` locally, `https://${FILES_DOMAIN}` on the VPS, where Caddy proxies to Garage). The desktop CSP allows that origin for uploads and images (`EDUSUITE_FILES_URL`).
  - CORS on the bucket is set by the API at startup from `CORS_ORIGINS`, one rule per origin (Garage echoes a rule's whole origin list, which browsers reject).
  - AWS SDK checksums are limited to "when required": the SDK's default put a CRC32 of an empty body into every presigned PUT link, so every real upload failed with `InvalidDigest` against Garage.
  - Migration `20261121000000_files_upload_state` adds `files.name` and `files.uploaded_at`.
  - Tests use an in-memory storage fake (CI has no Garage); a live check ran the whole flow against real Garage.
- **Reason:** Uploads never pass through the API, and nothing unverified can be used.
- **Verified:** Live against Garage: preflight from `Origin: null` gets exactly `null`; signed PUT 200; complete 200 with the Hindi name; download bytes match; a PUT with a different content type is refused (403, signature); HTML disguised as PNG is rejected at complete.
- **Affects:** `/api/v1/files*`, `apps/api/src/{files,config/env.ts,app.module.ts,bootstrap.ts}`, `apps/api/prisma/*`, `infra/{docker-compose*.yml,Caddyfile,.env.example}`, `apps/desktop/vite.config.js`
- **Revisit if:** Abandoned presigns pile up (add a cleanup job and Garage lifecycle rule, ADR-5), or files need branch-level privacy.

### DN-039 · S3 client for presigned uploads: AWS SDK v3
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · files API
- **Status:** Decided by developer
- **What was unclear:** The plan names "S3 API / presigned uploads" but no package (AGENT_README §3).
- **Options considered:** A) `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. B) Hand-written S3 Signature V4 signing with `node:crypto`.
- **Decision:** A. Only the S3 modules are installed; they talk to Garage through its S3 endpoint.
- **Reason:** The official client; avoids maintaining security-sensitive signing code.
- **Affects:** `apps/api` files module (next Phase 3 change set)
- **Revisit if:** The package size becomes a problem in the API image.

### DN-038 · Documents API: per-type content schemas, branch visibility, compare-and-set saves
- **Date:** 2026-11-21
- **Phase / area:** Phase 3 · `apps/api/src/documents`, `packages/shared/src/documents.ts`
- **Status:** Decided by agent (please review the content shapes before screens start saving)
- **What was unclear:** The plan gives the table and routes, but not the shape of each type's `content` (a format staff will save), who sees whose documents, who may edit them, or what happens when two people save the same one.
- **Options considered / Decision:**
  - Content: one zod schema per type (`ppt`, `mcq_set`, `paper`, `dpp`, `lesson`, `book`, `doubt`, `youtube`, `notice`, `poster`) that mirrors the state each screen already holds, so wiring a screen doesn't change its data. Each type has a version (all 1 today) stored in `schema_version`; later changes bump it and keep reading old versions. Content is limited to 2 MB of JSON; the API's body limit is 3 MB and any 413 answers `DOCUMENT_TOO_LARGE`.
  - Permission: a type needs the permission of the screen that makes it (`DOCUMENT_PERMISSIONS`): AI content for most, `ai.screenshot_ppt` for MCQ sets, `notices` for notices, `image_studio` for posters. The route allows any signed-in user and the service checks the type's permission on every call.
  - Visibility: a super admin sees the whole institute; everyone else sees documents saved at their current branch, by anyone. Other branches and institutes answer 404.
  - Editing: the creator, a super admin or a branch admin may edit or delete.
  - Concurrent saves: every update sends the `updatedAt` it started from; the write is a compare-and-set, and a stale one answers 409 `DOCUMENT_CHANGED` with the newer time, instead of silently overwriting.
  - History: lists return summaries only (no content), newest first, cursor-paged, filterable by title and "mine".
  - Delete is soft (DN-014); create, update and delete are audited (field names only).
  - Screenshots inside an MCQ set are referenced by `screenshotFileId` once the files API exists.
- **Reason:** Matches ADR-3 (JSONB + zod + schema_version) and keeps staff work safe from accidental overwrites.
- **Affects:** `/api/v1/documents*`, `packages/shared/src/documents.ts`, `apps/api/src/{bootstrap.ts,common/*}`
- **Revisit if:** Teachers shouldn't see each other's work in the same branch (then default to "mine"), or a type needs fields the schema rejects.

### DN-037 · Desktop wired to the API: client, session, router, CORS; branch picker postponed
- **Date:** 2026-11-21
- **Phase / area:** Phase 2 · `apps/desktop/src/{api,App.tsx}`, LoginScreen, Header, Sidebar, SettingsModal, UserManagement
- **Status:** Decided by agent; one part open (branch picker, below)
- **What was unclear:** How the renderer talks to the API (tokens, refresh races, errors), how routing and permissions meet the existing screens, how the `file://` app passes CORS, and how DN-015's branch picker fits a login form that doesn't yet know the user.
- **Options considered / Decision:**
  - Packages: `react-router` 8.5 (approved in DN-010; hash router, so deep links work under `file://`) and `@tanstack/react-query` 5 (named in the plan).
  - API client (`src/api/client.ts`): access token in memory only; refresh token in the DPAPI vault (memory only in a plain browser); a 401 triggers one refresh and a retry, and concurrent 401s share one refresh so the token is never rotated twice (which the server would treat as theft). Every failure is an `ApiError` with the server's code and translated message; `Accept-Language` follows the UI language. A stable `deviceId` per install is kept in `localStorage`.
  - Session (`src/api/session.tsx`): resumes the day's session from the vault at start; when the server ends it (23:59 IST, revoked, blocked) the user goes to login with the reason shown, and returns to the screen they were on after logging in.
  - Routing: `/login`, `/` (dashboard) and `/:screen`; a screen the role may not open redirects to the dashboard, using the same `visibleScreens` list as the Sidebar and the API guard. Existing screens get the same props as before through an adapter (`activeInstitute` filled from `GET /institutes/:id`, `currentUser` from `/me`), so none of them changed.
  - Converted to TypeScript because they were rewritten: `App`, `LoginScreen`, `Header`, `SettingsModal`, `UserManagement`. Removed: `employeeAccounts.js`, the master passwords, the "super" ID trick, demo one-click logins and default-password hints, the stored Gemini API key, plain-text password display, user delete, the fake institute switcher and the fake window buttons in the header (Electron draws real ones). The header is now the window's drag area.
  - Shared package: the desktop imports `@edusuite/shared`'s TypeScript source through a `source` export condition (Vite `resolve.conditions`, `customConditions` in tsconfig, `node --conditions=source` in tests), so no separate build step.
  - CORS: the packaged app loads from `file://` and sends `Origin: null`. The API now reads `CORS_ORIGINS` (default `null`; local adds `http://localhost:5173`). Allowing `null` is acceptable because the API uses Bearer tokens, never cookies; a foreign page has no token to send.
  - Labels on the rewritten screens are Hindi only for now; English comes with the per-screen `translations.js` work.
  - **Open:** DN-015's branch picker. The login form doesn't know the user's branches until after the password is checked, and the API has no "switch branch" call. For now every login uses the home branch; staff with extra branches can't choose. Options: A) a second step after login when the user has more than one branch (needs a small `POST /auth/switch-branch` that issues a new session). B) Keep home-branch only. Recommendation: A, as its own change set.
- **Reason:** Completes Phase 2's definition of done without changing any tool screen, and keeps every rule on the server.
- **Verified:** End-to-end in the real Electron app against the Docker stack: wrong password shows the server's Hindi message; a deep link (`#/ppt`) returns after login; the super admin sees 14 menu items, the settings button and the real institute and branch; the users page loads from the API with no password column or delete; settings load the institute and have no API-key field; the session resumes after an app restart and logout clears the vault; a teacher sees 12 menu items, no users item, no settings, and `#/users` bounces to the dashboard.
- **Affects:** `apps/desktop/src/*`, `apps/desktop/{vite.config.js,tsconfig*.json,package.json}`, `apps/api/src/{bootstrap.ts,config/env.ts}`, `infra/docker-compose.local.yml`
- **Revisit if:** The API moves to cookie auth (then `null` must not be an allowed CORS origin), or multi-branch staff are common (do the branch picker).

### DN-036 · Electron hardening: sandbox, meta CSP, isolated motion-player origin, DPAPI token vault
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · `apps/desktop/electron`
- **Status:** Decided by agent
- **What was unclear:** The plan asks for `sandbox`, `webSecurity`, a strict CSP and a preload exposing named functions, while the motion-class player (which the plan keeps "exactly as is") runs inline scripts inside an `srcdoc` iframe. A srcdoc frame inherits the page's CSP, so a strict policy breaks it; the old frame also used `allow-scripts allow-same-origin`, which let it remove its own sandbox (audit R6). Pages loaded from `file://` can't receive CSP response headers.
- **Options considered:** A) Serve the player from a separate custom origin with its own CSP. B) Allow `'unsafe-inline'` scripts in the app CSP. C) Drop the in-app preview and only offer the download.
- **Decision:** A.
  - Window: `contextIsolation`, `sandbox`, `webSecurity` on; `nodeIntegration`, webviews and spellcheck off. Navigation is locked to the app's own `index.html`; new windows are denied; only the `clipboard-sanitized-write` permission is granted.
  - CSP: generated into `index.html` at build time by a Vite plugin (`electron/security.cjs`): scripts only from the bundle, network only to the API origin (`EDUSUITE_API_URL`, default `http://localhost:3000`; Phase 6 sets the production URL), frames only from `edusuite-motion://player`. Inline style attributes are allowed (React `style={{…}}`); inline scripts are not. `vite` dev gets the dev-server additions.
  - Motion player: `motion:open` keeps the HTML in the main process (last 3 only) and serves it from `edusuite-motion://player/<random id>` with `connect-src 'none'`; the iframe is `sandbox="allow-scripts"` (no `allow-same-origin`) with `allow="fullscreen"`. Google Fonts and pop-ups in the player are therefore blocked (local fonts are used); the downloaded `.html` is unchanged.
  - Loading: packaged builds load only `dist/index.html`; the Vite dev server is used only when not packaged and `ELECTRON_DEV_SERVER_URL` is set. Single-instance lock.
  - Preload (`window.edusuite`): `app.version/config`, `update.status` (stub until Phase 6), `auth.getToken/setToken/clearToken`, `print.toPdf`, `file.saveAs` (allowed extensions only, 200 MB cap, name sanitised), `motion.open`. IPC handlers accept calls only from the main window. `motion:open` and `app:config` are additions to the plan's list.
  - Token vault: the refresh token is encrypted with `safeStorage` (DPAPI) into `userData/session.bin`; if encryption is unavailable it stays in memory only. The access token never leaves the page's memory.
  - Electron files stay CommonJS JavaScript (an exception to "convert to TS when editing", which would need a separate build step for the main process).
  - `EDUSUITE_SMOKE=1` makes the app report its security state as JSON and quit, for checks now and in Phase 6 CI.
- **Reason:** Keeps the player working while fixing R6 (a malicious question text can run only inside a frame with no network and no access to the app), with no `'unsafe-inline'` scripts in the app itself.
- **Verified:** Smoke run of the built app: bridge exposes only the six named groups; `require` and `process` are undefined; sandbox/contextIsolation/webSecurity on; an outside `fetch` is blocked; the vault round-trips through DPAPI and clears; the login screen renders; the motion origin runs scripts and its outside `fetch` is blocked.
- **Affects:** `apps/desktop/electron/*`, `apps/desktop/vite.config.js`, `apps/desktop/src/components/ScreenshotToPpt.jsx`
- **Revisit if:** The player needs network (e.g. web fonts), or files move to a remote host (add it to `fileOrigins` in the CSP).

### DN-035 · API accepts an empty JSON body; Fastify's 4xx errors keep their status
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · `apps/api/src/bootstrap.ts`, exception filter
- **Status:** Decided by agent
- **What was unclear:** A live check found `POST /users/:id/block` answering 400 (so nothing was blocked) whenever the client sent `content-type: application/json` with no body, which most HTTP clients do. Fastify rejects that by default. The tests used `inject` without the header and missed it. Malformed JSON was also answered with 500.
- **Options considered:** A) Make the server treat an empty JSON body as no body. B) Require the desktop client never to send the header on body-less calls.
- **Decision:** A. Nest's own body parser is turned off and one JSON parser is registered that accepts an empty body; malformed JSON is 400 `BAD_REQUEST`. The exception filter keeps any 4xx status that Fastify sets (bad JSON, body too large) instead of turning it into 500. A regression test sends exactly the failing request.
- **Reason:** The server shouldn't depend on client header habits for correctness.
- **Affects:** `apps/api/src/bootstrap.ts`, `apps/api/src/common/apiExceptionFilter.ts`, `apps/api/test/users.test.ts`
- **Revisit if:** File uploads go through the API directly (they use presigned URLs to storage in Phase 3).

### DN-034 · User management rules: rank, own-branch scope, self-protection (please review)
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · `apps/api/src/users`, `apps/api/src/institutes`
- **Status:** Decided by agent (restrictive defaults; please review)
- **What was unclear:** The plan says a branch admin manages users "in their branch" and settings "own", but not which roles they may give, whether people can change themselves, or how passwords are set.
- **Options considered:** A) Restrictive defaults (below). B) Branch admins may create any non-super-admin role.
- **Decision:** A.
  - Rank: a super admin manages everyone in the institute; a branch admin manages only teachers, typists and counselors whose home branch is the admin's current branch, and can't give admin roles (`assignableRoles` in `packages/shared/users.ts`). Users a branch admin may not manage answer 404, not 403.
  - Self: nobody changes their own role or status; editing one's own name or email is allowed. An institute always keeps one active super admin (a safety net; with the self rule it can't normally be reached).
  - Passwords: the admin sets the password (at least 8 characters), stored as argon2id. Reset clears lockout and ends every session. There is no "change my own password" screen yet.
  - Sessions end on block, password reset, role change and home-branch change, so new rights apply at once.
  - No delete (DN-009); employee code and branch code can't be changed after creation; email, code and phone are unique system-wide (DN-026) and duplicates answer 409 `ALREADY_EXISTS` with the field.
  - Institutes: everyone reads their own institute and its branches; only a super admin edits the institute (name, branding) and adds branches; a branch admin edits only their own branch's name and city. Code and AI quota aren't editable from the app.
  - First super admin in production: `createSuperAdmin.js` one-time command (password from a hidden prompt or `SUPERADMIN_PASSWORD`, never a CLI argument); validates before writing and writes institute, branch, user and audit row in one transaction; refuses if the institute already has a super admin.
- **Reason:** Least privilege for money- and data-handling staff; easy to relax later, hard to undo a leak.
- **Affects:** `/api/v1/users*`, `/api/v1/institutes*`, `packages/shared/src/{users,institutes,pagination}.ts`, `apps/api/src/scripts/createSuperAdmin.ts`
- **Revisit if:** Branch admins need to appoint other branch admins, or staff need to change their own password (add `POST /me/password`).

### DN-033 · Auth module design: opaque rotating refresh tokens, deny-by-default guards
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · `apps/api/src/auth`
- **Status:** Decided by agent
- **What was unclear:** The plan fixes the outline (argon2id, 15-minute JWT, rotating refresh until 23:59 IST, reuse ends all sessions, 5-attempt lockout) but not several details that are hard to change once the desktop app depends on them.
- **Options considered / Decision:**
  - Refresh token: an opaque 32-byte random value; only its SHA-256 is stored (`sessions.refresh_hash`). Rotation marks the old row `replaced_by_id` inside a transaction with a conditional update, so two racing refreshes can't both win.
  - Reuse: presenting a rotated or revoked token, or one from a different `deviceId`, revokes every session of that user and writes `auth.refresh_reuse`.
  - Access token: HS256 with `JWT_SECRET`, claims `sub`, `sid`, `iid`, `bid`, `role`; never valid past the session's 23:59 IST end. Stateless for its 15 minutes, so blocking a user takes effect at the next refresh (at most 15 minutes).
  - Login lookup: `@` means email, 10+ digits means a +91 mobile number, otherwise employee code (case-insensitive). Unknown IDs and wrong passwords return the same `AUTH_INVALID` and take the same time (a dummy argon2 check). Lockout returns 423 `AUTH_LOCKED`; blocked status is checked only after a correct password, so it can't be probed.
  - Guards: global, in order rate limit → auth → permission. Every route must declare `@Public()`, `@AnySignedIn()` or `@RequirePermission()`; a route with none is refused. Institute scoping comes only from the token (`scopeWhere`, `assertSameInstitute`, which answers 404 for other institutes).
  - Rate limit: `@nestjs/throttler`, in memory, only on `auth/login` and `auth/refresh`, `LOGIN_RATE_LIMIT` per IP per minute (default 10). `TRUST_PROXY=true` behind Caddy.
  - Errors: specific codes (`AUTH_INVALID`, `AUTH_LOCKED`, `AUTH_BLOCKED`, `AUTH_BRANCH_NOT_ALLOWED`, `AUTH_SESSION_EXPIRED`, `AUTH_SESSION_REVOKED`, `VALIDATION_FAILED`) with Hindi and English messages; validation errors list field paths only, never values.
  - Tests: a separate `edusuite_test` database (or `DATABASE_URL_TEST` in CI) is created, migrated and emptied per run; CI sets `REQUIRE_DB_TESTS=1` so missing Postgres fails instead of skipping.
- **Reason:** Matches plan §05 and §09 and AGENT_README §7–8 with no extra infrastructure.
- **Affects:** `apps/api/src/{auth,audit,common,prisma}`, `packages/shared/src/auth.ts`, `apps/api/test/*`, `.github/workflows/ci.yml`, `infra/*` (`JWT_SECRET`, `TRUST_PROXY`)
- **Revisit if:** More than one API instance runs (move rate limits to Redis), or blocking must take effect immediately (check the session on every request).

### DN-032 · Auth packages: @node-rs/argon2, jose, @nestjs/throttler
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · dependencies
- **Status:** Decided by developer
- **What was unclear:** The plan names argon2id, JWT and rate limiting but no packages (AGENT_README §3: ask before adding unnamed dependencies).
- **Options considered:** argon2id: A) `@node-rs/argon2` B) `argon2`. JWT: A) `jose` B) `@nestjs/jwt`. Rate limit: A) `@nestjs/throttler` B) a Caddy plugin.
- **Decision:** A for all three. argon2id parameters: 19 MiB memory, 2 passes, parallelism 1 (OWASP minimum).
- **Reason:** Prebuilt binaries with no C++ build tools; a small dependency-free JWT library; Nest's official limiter, which can limit per route.
- **Affects:** `apps/api/package.json`
- **Revisit if:** Any of them stops being maintained.

### DN-031 · Shared `PageHeader` fixes the four invisible tool-screen titles
- **Date:** 2026-11-20
- **Phase / area:** Track A · NoticeHub, IdAndFeeReceipt, LessonPlanner, ImageStudio
- **Status:** Decided by agent
- **What was unclear:** The audit (frontend §1.6) found these four titles in `text-white` on a light page. Patching each in place would leave four slightly different headers; a new primitive is a small addition to the UI kit.
- **Options considered:** A) A shared `PageHeader` (h1, icon, neutral badge, description, actions) used by all four. B) Change only the colour classes in each file.
- **Decision:** A. The title is the screen's `h1`; actions sit on the right with secondary first and primary last. The wrapper is a `<div>`, because the print CSS hides `<header>`. Only the header blocks changed; screen text and behaviour stayed the same, except "GST" was dropped from the receipt description (DN-013). The rest of each screen keeps its older dark panels until that screen is migrated.
- **Reason:** One consistent title row across tool screens, as Track B asks, with no print change.
- **Affects:** `apps/desktop/src/components/ui/PageHeader.tsx`, the four screens' header blocks
- **Revisit if:** A tool screen needs secondary navigation (breadcrumbs, tabs) in its title row.

### DN-030 · Shared UI primitives: native `<dialog>`, Hindi default labels, tests without a DOM library
- **Date:** 2026-11-20
- **Phase / area:** Track A · `apps/desktop/src/components/ui/`
- **Status:** Decided by agent
- **What was unclear:** The prompt lists the primitives and requires focus traps, `aria-live` and tests, but names no dialog library, test DOM or i18n approach for the primitives' own text ("Close", "Cancel", "Retry").
- **Options considered:** Dialog: A) native `<dialog>` + `showModal()`. B) A headless UI library (new dependency). Tests: A) `react-dom/server` markup checks with `node:test`, plus keyboard checks in Electron. B) jsdom or Testing Library (new dependencies). Labels: A) Hindi defaults, overridable by props. B) A new i18n context now.
- **Decision:** A for all three. Built: `Button` (primary/secondary/ghost/danger, loading, icon), `Field` + `Input`/`Select`/`Textarea` (label, hint and error wired via `aria-describedby`/`aria-invalid`), `Card`, `Table` (caption, `scope="col"`, focusable scroll region), `Modal`, `ConfirmDialog` (focus starts on Cancel), `Tabs` (WAI-ARIA, arrow keys), `EmptyState`, `ErrorState`, `Skeleton`, `ToastProvider`/`useToast` (polite and assertive live regions; errors persist), `JobProgress` (no timers; indeterminate when the server gives no progress). Every control keeps a border so Windows contrast themes still show its edge. Added the `danger-hover` token (white on it 8.3:1). The desktop app gets `tsconfig.json` (`allowJs`), `typecheck` and `test` scripts. A development-only gallery at `#ui-gallery` shows every state and is excluded from production builds.
- **Reason:** No new dependencies. The native dialog gives focus containment, an inert background and Esc for free. Labels can move to `translations.js` when screens are migrated.
- **Verified:** 12 component tests pass. In Electron: Enter opens the Modal, focus moves inside, Tab never leaves it, Esc closes it and focus returns to the opener; ConfirmDialog focuses Cancel; Tab shows a 2 px ink focus ring; arrow keys move between tabs; no horizontal overflow at 1280×720; the gallery stays readable under the developer's Windows contrast theme.
- **Affects:** `apps/desktop/src/components/ui/*`, `apps/desktop/src/main.jsx`, `apps/desktop/src/index.css`, `apps/desktop/tsconfig*.json`, `apps/desktop/package.json`, `.gitignore`
- **Revisit if:** A screen needs a combobox, date picker or other complex widget (consider a headless library then, with approval), or primitive labels need English before screens are migrated.

### DN-029 · Track A design tokens: new names, amber as fill only, system Devanagari font
- **Date:** 2026-11-20
- **Phase / area:** Track A · `apps/desktop/src/index.css`
- **Status:** Decided by agent
- **What was unclear:** The prompt asks for tokens like `--color-surface`, `--color-ink`, `--color-accent`, a 12/14/16/20/24/32 type scale and radii, but redefining Tailwind's built-in names (`text-lg`, `rounded-lg`) would silently restyle every screen at once, against "screen by screen, not in one big diff". Amber also fails contrast as text on white (1.7:1).
- **Options considered:** A) New token names that no screen uses yet, migrated one screen at a time. B) Override Tailwind's defaults globally. Font: A) system fonts (Nirmala UI ships with Windows 10/11). B) Bundle Noto Sans Devanagari (a new package, would need approval).
- **Decision:** A for both. Colours: `surface`, `page`, `inverse`, `ink`, `muted`, `ink-inverse`, `muted-inverse`, `accent` (amber fill), `accent-hover`, `accent-strong` (amber text), `accent-subtle`, `line`, `line-strong`, `success`, `warning`, `danger` (+ `-subtle`), `focus`, `focus-inverse`. Type: `text-caption` 12, `text-label` 14, `text-body` 16, `text-title` 20, `text-heading` 24, `text-display` 32, with taller line heights for Devanagari. Radii: `rounded-control` 6 px, `rounded-card` 8 px. Spacing uses Tailwind's existing steps 1, 2, 3, 4, 6, 8. Only these changed globally: body font and background, a visible `:focus-visible` ring, reduced-motion handling, `<html lang="hi">` kept in step with the language switch.
- **Reason:** Measured contrast (WCAG 2.2): ink/surface 17.9, muted/surface 7.6, muted/page 6.9, ink/accent 10.7, accent-strong/surface 7.1, success 5.0, warning 5.0, danger 6.5, white/danger 6.5, muted-inverse/inverse 12.0, line-strong/surface 4.8 (UI ≥ 3), focus ink/surface 17.9, focus accent/inverse 10.7. All pass.
- **Affects:** `apps/desktop/src/index.css`, `apps/desktop/index.html`, `apps/desktop/src/App.jsx`
- **Verified:** Rendered in Electron 45 at 1280×720: Devanagari draws with Nirmala UI and matras are clean; no horizontal page overflow. The developer's PC runs a Windows contrast theme (`forced-colors: active`), which replaces every colour; the app stays readable there because Windows supplies the colours. Screens migrated to tokens must be checked in both modes, and must not use colour alone to show state (forced colours remove it).
- **Revisit if:** Devanagari renders poorly on the institutes' PCs (then bundle a font, with approval), or the brand changes.

### DN-027 · S3-compatible storage service
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · `infra/docker-compose.yml`
- **Status:** Decided by developer
- **What was unclear:** The plan says "MinIO or Garage (S3 API)", and ADR-5 warns that MinIO's community edition has changed its licence and features and should be checked at setup. The choice decides which image runs and how buckets and keys are created.
- **Options considered:** A) Garage: small, open source (AGPL), made for self-hosting on one server; needs a one-time layout and key setup step, which a script can do. B) MinIO: the best-known option, but check its current community-edition terms and image availability first. C) SeaweedFS: Apache-licensed and simple to start, but heavier to operate.
- **Decision:** A) Garage, for local testing and production alike, pinned to `dxflrs/garage:v2.1.0`. Its image has no shell, so the one-time setup (layout, access key, bucket) is `infra/scripts/garage-init.mjs`, which runs Garage's own CLI through `docker compose exec`. The access key and secret come from the env file and are imported, so the API and the env file always agree.
- **Reason:** Free, made for single-server self-hosting, and avoids the MinIO licence and image risk named in ADR-5.
- **Affects:** `infra/docker-compose.yml`, `infra/garage/garage.toml`, `infra/scripts/*`, `infra/.env.example`, the files module (Phase 3), the `/ready` storage check
- **Revisit if:** Storage needs more than one server, or Garage stops being maintained. Bump the image tag deliberately; check its release notes first.

### DN-028 · Compose layout: one base file, a local override, migrations as a one-shot service
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · `infra/`
- **Status:** Decided by agent
- **What was unclear:** The prompt names `docker-compose.yml` + `docker-compose.local.yml` and "no code forks" between local and production, but not how to keep Caddy and published ports out of local runs, or when migrations run.
- **Options considered:** A) Caddy behind a `production` profile; the local file publishes Postgres, Redis and the API on 127.0.0.1 only; a `migrate` service runs `prisma migrate deploy` before the API starts. B) Separate compose files per environment.
- **Decision:** A. Env files: `infra/.env.example` → `infra/.env.local` (local) or `infra/.env` (VPS). The API image is built from the repo root with `apps/api/Dockerfile` on `node:26`, runs as the `node` user and has a health check. The worker service is added in Phase 4, when `worker.ts` exists.
- **Reason:** Same images and files in both environments; only the env file and profile differ.
- **Affects:** `infra/*`, `apps/api/Dockerfile`, `.dockerignore`
- **Revisit if:** Production needs services that should never run locally (backup, uptime monitoring; Phase 6).

### DN-026 · Prisma 7 schema: login IDs unique system-wide, first migration generated offline
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · Prisma schema
- **Status:** Decided by agent (please review before the migration is first applied)
- **What was unclear:** The plan's login flow finds a user "by ID / email / phone" with no institute on the form, so the same employee code in two institutes would be ambiguous. Prisma 7 also needs a driver adapter, which the plan doesn't mention.
- **Options considered:** Identity: A) `employee_code`, `email` and `phone` unique across the whole system. B) Unique per institute, with an institute picker on the login form. Driver: A) `@prisma/adapter-pg` (Prisma's own Postgres adapter, which needs `pg`). B) Stay on Prisma 6 without adapters.
- **Decision:** A for both. Tables use snake_case names (`app_users`, `fee_receipts`, …) mapped from PascalCase models. Also added: `institutes.code` and `branches.code` for receipt numbers (DN-013); `user_branches` for multi-branch staff and `sessions.branch_id` (DN-015); `failed_login_count` and `locked_until` for the plan's 5-attempt lockout; `idempotency_key` with a per-institute unique index on `ai_jobs` and `fee_receipts`; cache-token columns on `ai_usage`. The `20261120000000_init` migration was generated with `prisma migrate diff` (no database needed) and has not been applied anywhere yet.
- **Reason:** No extra login field, and it's easy to change now because no data exists. Prisma 7 is the current stable release.
- **Affects:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261120000000_init`, `apps/api/prisma.config.ts`
- **Revisit if:** Two institutes need the same employee codes. Once the migration has been applied, any change must be a new migration.

### DN-025 · API skeleton: NestJS 11, probes outside `/api/v1`, pino through Fastify
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · `apps/api`
- **Status:** Decided by agent
- **What was unclear:** NestJS 12 is the latest release, but the plan names NestJS 11. The plan lists `/health` and `/ready` in the API surface without saying whether they sit under `/api/v1`. The plan names pino but no Nest integration.
- **Options considered:** Version: A) 11 as the plan says. B) 12. Probes: A) root paths. B) under `/api/v1`. Logging: A) Fastify's built-in pino with a small Nest logger bridge. B) add `nestjs-pino`.
- **Decision:** NestJS 11.2; `/health` and `/ready` at the root, everything else under `/api/v1`; Fastify's pino with secrets redacted and an `x-request-id` per request. `/ready` returns 503 until Postgres, Redis and storage all answer. Postgres is checked by TCP for now and moves to `SELECT 1` when Prisma is wired in. The API compiles to CommonJS (Nest decorators) and imports the ESM shared package through Node's `require(esm)`.
- **Reason:** Follows the plan's version; probes are called by Docker, Caddy and Uptime Kuma without auth; no extra dependency.
- **Affects:** `apps/api/*`
- **Revisit if:** A NestJS 11 security fix stops shipping, or the probes need to be private.

### DN-024 · Tests use Node's built-in test runner; TypeScript 7
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · tooling
- **Status:** Decided by agent
- **What was unclear:** The plan requires unit and API tests but names no test framework, and AGENT_README §3 asks before adding unnamed dependencies.
- **Options considered:** A) `node:test` (built into Node 26, no dependency). B) Vitest. C) Jest (NestJS default).
- **Decision:** A. Shared-package tests run TypeScript directly through Node 26's type stripping (`erasableSyntaxOnly` in `tsconfig.base.json`). API tests run `node --test` against the compiled output, because NestJS decorators can't be type-stripped. TypeScript is 7.0 (the current release).
- **Reason:** No new dependency, and one runner across all workspaces.
- **Affects:** `packages/*/package.json` `test` scripts, `tsconfig.base.json`
- **Revisit if:** Playwright e2e (Phase 6) or snapshot testing needs features `node:test` lacks.

### DN-023 · Desktop app moved into `apps/desktop` (npm workspaces)
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · repo layout
- **Status:** Decided by agent
- **What was unclear:** AGENT_README §5 asks for the move but not where shared tool config (lint, `.nvmrc`) and the old build folders should end up.
- **Options considered:** A) Move everything, including lint config, into `apps/desktop`. B) Move the app; keep repo-wide config (`.oxlintrc.json`, `.nvmrc`, `.gitignore`) at the root, and leave the old ignored `dist/` and `release/` folders where they are.
- **Decision:** B. `src/`, `electron/`, `build/`, `public/`, `scripts/`, `index.html`, `vite.config.js` and `Run-On-Mac.command` moved unchanged. The desktop package is `@edusuite/desktop`; the root `package.json` declares workspaces `apps/*` and `packages/*` and forwards `dev`, `electron:dev`, `build`, `dist:nsis` and `lint`. New builds go to `apps/desktop/dist` and `apps/desktop/release`.
- **Reason:** One lint config for every workspace; old build output is ignored and DN-019 keeps `release/` in place.
- **Affects:** root and `apps/desktop/package.json`, `package-lock.json`, `.github/workflows/build-mac-dmg.yml`
- **Revisit if:** The API needs different lint rules from the desktop app.

### DN-022 · Node.js version: plan says 22 LTS, winget installed 26 LTS
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · toolchain
- **Status:** Decided by developer
- **What was unclear:** The plan's stack table names "Node 22 LTS". `winget install OpenJS.NodeJS.LTS` installed Node 26.13.1, the current LTS. Node 22 reaches end of life in April 2027, about five months away.
- **Options considered:** A) Move the plan to Node 26 LTS everywhere (PC, Docker images, CI). B) Install Node 22 on the PC to match the plan. C) Node 26 on the PC, Node 22 in Docker and CI.
- **Decision:** A. Node 26 LTS on PCs, in Docker images (`node:26`) and in CI. This overrides "Node 22 LTS" in the architecture plan's stack table.
- **Reason:** Node 22 leaves support in April 2027; one version everywhere avoids dev/prod differences.
- **Affects:** `package.json` `engines`, `.nvmrc`, `infra/` Dockerfiles, `.github/workflows/*`
- **Revisit if:** A dependency (NestJS, Prisma, Electron tooling) doesn't support Node 26.

### DN-021 · TeacherDesk shows real documents; schedule and syllabus are "coming soon" (Q-18)
- **Date:** 2026-11-20
- **Phase / area:** Phase 3 · TeacherDesk
- **Status:** Decided by developer
- **What was unclear:** The plan maps TeacherDesk only to stats and documents; its schedule, faculty list and syllabus tracker have no table.
- **Options considered:** A) Real "my documents" and counts; schedule/syllabus shown as coming soon. B) Add timetable tables.
- **Decision:** A.
- **Reason:** Timetables are a new product area the plan doesn't cover.
- **Affects:** `TeacherDesk`, `GET /stats/dashboard`, `GET /documents`
- **Revisit if:** The institute asks for timetable or syllabus tracking.

### DN-020 · Mac DMG workflow runs on tags and manual runs only (Q-17)
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · CI
- **Status:** Decided by developer
- **What was unclear:** `build-mac-dmg.yml` runs on every push and PR to `main`, using macOS runner minutes.
- **Options considered:** A) Tags + `workflow_dispatch` only. B) Leave it.
- **Decision:** A.
- **Reason:** Mac builds are only needed for releases.
- **Affects:** `.github/workflows/build-mac-dmg.yml`
- **Revisit if:** Mac becomes a primary platform.

### DN-019 · `release/` stays in place, git-ignored (Q-16)
- **Date:** 2026-11-20
- **Phase / area:** Setup · repo
- **Status:** Decided by developer
- **What was unclear:** 1 GB of old installers sits in the source folder; AGENT_README says to move installers only after asking.
- **Options considered:** A) Move it outside the repo. B) Leave it, ignored.
- **Decision:** B. `release` was added to `.gitignore` on 2026-11-20.
- **Reason:** It's already excluded from git, and nothing reads it.
- **Affects:** `.gitignore`, `release/`
- **Revisit if:** Disk space or the monorepo move makes it a problem.

### DN-018 · Offline drafts deferred (Q-15)
- **Date:** 2026-11-20
- **Phase / area:** Phase 3 · documents
- **Status:** Decided by developer
- **What was unclear:** The plan mentions IndexedDB drafts while offline, but no phase includes it.
- **Options considered:** A) Defer; show "offline, saving paused". B) Build in Phase 3.
- **Decision:** A.
- **Reason:** Keeps Phase 3 focused on saving and history.
- **Affects:** `src/api/` client, save buttons on all tool screens
- **Revisit if:** Branches report frequent internet drops.

### DN-017 · Install the prompt's named skills if available (Q-14)
- **Date:** 2026-11-20
- **Phase / area:** Setup · agent tooling
- **Status:** Decided by developer
- **What was unclear:** `claude`, `web-design-guidelines` and the `ecc:*` skills named in the prompt aren't installed here.
- **Options considered:** A) Install them before the tracks that need them. B) Proceed without them.
- **Decision:** A when the developer has them; otherwise the agent proceeds with the installed skills and the written rules.
- **Reason:** The skills are helpful but not required to follow the plan.
- **Affects:** Agent workflow only
- **Revisit if:** A skill turns out to conflict with AGENT_README rules.

### DN-016 · Installer becomes one-click, per-user, in Phase 6 (Q-13)
- **Date:** 2026-11-20
- **Phase / area:** Phase 6 · installer
- **Status:** Decided by developer
- **What was unclear:** The plan wants `oneClick: true, perMachine: false`; today it's `oneClick: false` with a folder chooser.
- **Options considered:** A) Follow the plan. B) Keep the chooser.
- **Decision:** A, applied when Phase 6 starts.
- **Reason:** No admin prompt on office PCs; required for silent auto-update.
- **Affects:** `package.json` `build.nsis`
- **Revisit if:** Institutes need a machine-wide install.

### DN-015 · Branch comes from the user record, not the login form (Q-12)
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · auth
- **Status:** Decided by developer
- **What was unclear:** Staff pick any branch on the login screen, but the server must never trust a client `branchId`.
- **Options considered:** A) Branch from the user record; staff allowed at several branches pick from a server-provided list. B) Remove the picker.
- **Decision:** A.
- **Reason:** Keeps the familiar picker while making the server the authority.
- **Affects:** `LoginScreen`, `POST /auth/login`, `app_user` (needs a user-to-branches link for multi-branch staff)
- **Revisit if:** No one works at more than one branch.

### DN-014 · Schema adds the columns the ER diagram omits; documents are soft-deleted (Q-11)
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · Prisma schema
- **Status:** Decided by developer
- **What was unclear:** The ER diagram leaves out columns other rules require.
- **Options considered:** A) Add them now and soft-delete documents. B) Hard-delete documents.
- **Decision:** A. Add `institute_id` to `ai_job`, `ai_usage`, `question`, `file` and `fee_receipt`; `branch_id`, `student_id`, `status` and `cancel_reason` to `fee_receipt`; `created_by` and `deleted_at` to `document`.
- **Reason:** Institute scoping, quotas and audited deletions all need these.
- **Affects:** `prisma/schema.prisma`, the documents API
- **Revisit if:** A document must be erased for legal reasons (add a purge job then).

### DN-013 · Receipt numbers per branch per financial year; no GST yet (Q-10)
- **Date:** 2026-11-20
- **Phase / area:** Phase 5 · fees
- **Status:** Decided by developer
- **What was unclear:** The year reset, the branch code and whether receipts are GST invoices were not specified.
- **Options considered:** A) Per branch per financial year (resets 1 April), branch code stored on `branches`, no GST fields. B) Add GST fields now.
- **Decision:** A. Format `<INST>-<BRANCH>/<FY>/<6-digit seq>`, e.g. `IND-BKN/2026-27/000431`. The UI stops calling it a "GST receipt".
- **Reason:** Tax treatment needs the institute's registration status, which is a business decision.
- **Affects:** `receipt_counter`, `fee_receipt`, `branch.code`, `IdAndFeeReceipt`
- **Revisit if:** The institute confirms GST registration.

### DN-012 · Build a fixture AI mode for local tests and demos (Q-09)
- **Date:** 2026-11-20
- **Phase / area:** Phase 4 · AI worker
- **Status:** Decided by developer
- **What was unclear:** `AI_MODE=fixture` goes beyond the plan, and the prompt said to ask first.
- **Options considered:** A) Build it. B) Mock the SDK in tests only.
- **Decision:** A. The worker replays recorded Claude responses keyed by job type and a hash of the input. Fixture mode is refused when `NODE_ENV=production`, and the UI shows a "fixture mode" badge.
- **Reason:** Tests and offline demos cost nothing and never call the live API.
- **Affects:** `apps/api/src/worker.ts`, `packages/shared/ai/*`, Header badge
- **Revisit if:** Fixtures drift from the live model's output shape.

### DN-011 · TypeScript with `allowJs`; convert JSX only when editing (Q-08)
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · tooling
- **Status:** Decided by developer
- **What was unclear:** Conventions require strict TS and a `typecheck` script; the app is JSX with no `tsconfig`.
- **Options considered:** A) `tsconfig` with `allowJs`, new code in TS, convert on edit. B) Convert everything up front.
- **Decision:** A.
- **Reason:** Matches AGENT_README §7 and avoids a large mixed diff.
- **Affects:** `tsconfig*.json`, all new files
- **Revisit if:** JS files cause repeated type gaps at module boundaries.

### DN-010 · Add react-router with hash history (Q-07)
- **Date:** 2026-11-20
- **Phase / area:** Track B / Phase 2 · routing
- **Status:** Decided by developer
- **What was unclear:** Deep links, return-after-login and unsaved-changes guards need a router; the plan names none.
- **Options considered:** A) `react-router` data router with hash history. B) TanStack Router. C) Hand-rolled hash router.
- **Decision:** A. New dependency approved.
- **Reason:** Widely known; hash history works with `file://` in Electron.
- **Affects:** `App.jsx`, `Sidebar`, all tool screens
- **Revisit if:** The app moves to a custom protocol where browser history works.

### DN-009 · Branch admins manage own-branch users; block instead of delete (Q-06)
- **Date:** 2026-11-20
- **Phase / area:** Phase 2 · users
- **Status:** Decided by developer
- **What was unclear:** The plan lets Branch admins manage their branch's users, but the code blocks them; the UI has permanent delete, the API has none.
- **Options considered:** A) Follow the plan; no delete, only block. B) Soft delete for Super admin.
- **Decision:** A. The delete button is removed when UserManagement is wired to the API.
- **Reason:** Keeps the audit trail intact.
- **Affects:** `UserManagement`, `permissions.ts`, users API
- **Revisit if:** Data-protection requests require removing a staff record.

### DN-008 · Counselor gets Image Studio templates only; TeacherDesk and Dashboard access set (Q-05)
- **Date:** 2026-11-20
- **Phase / area:** Phase 1 · `permissions.ts`
- **Status:** Decided by developer
- **What was unclear:** The matrix gives Counselor Image Studio but not AI tools, while Image Studio runs `poster_copy`; TeacherDesk and Dashboard weren't in the matrix.
- **Options considered:** A) Counselor: templates only, AI copy disabled. TeacherDesk: Super, Branch, Teacher. Dashboard: everyone. B) Counselor also gets `poster_copy`.
- **Decision:** A.
- **Reason:** Keeps AI spend with roles that need it.
- **Affects:** `packages/shared/permissions.ts`, `ImageStudio`, `Sidebar`
- **Revisit if:** Counselors need AI-written poster copy.

### DN-007 · Typists don't handle fees; journey D uses a Counselor (Q-04)
- **Date:** 2026-11-20
- **Phase / area:** Phase 5 · fees; Track B journeys
- **Status:** Decided by developer
- **What was unclear:** The prompt's fee journey uses a typist, but the plan's matrix gives DTP/Typist no fee access.
- **Options considered:** A) Keep the matrix; Counselor in journey D. B) Give Typist fee access.
- **Decision:** A.
- **Reason:** Money stays with accountable roles.
- **Affects:** `permissions.ts`, e2e journey D
- **Revisit if:** A branch has no counselor.

### DN-006 · Track A applies design principles and keeps the EduSuite brand (Q-03)
- **Date:** 2026-11-20
- **Phase / area:** Track A · UI polish
- **Status:** Decided by developer
- **What was unclear:** AGENT_README golden rule 2 and the plan say "don't redesign, keep navy/amber"; the master prompt widens that for polish and offers a full re-skin.
- **Options considered:** A) Principles only: slate ink dominant, amber as the single accent. B) Full re-skin to ivory/clay.
- **Decision:** A. The master prompt overrides golden rule 2 for visual polish and flow only; markup structure, translations and print CSS rules still apply.
- **Reason:** Keeps the brand staff already know.
- **Affects:** `src/index.css` tokens, `src/components/ui/*`, every screen (one per change set)
- **Revisit if:** The institute asks for a new brand.

### DN-005 · Architecture plan moves to `docs/architecture/` (Q-02)
- **Date:** 2026-11-20
- **Phase / area:** Setup · repo layout
- **Status:** Decided by developer
- **What was unclear:** The docs pointed to `docs/architecture/edusuite-architecture.html`, but the file was at the repo root.
- **Options considered:** A) Move the file. B) Change the docs.
- **Decision:** A.
- **Reason:** Matches the target layout in AGENT_README §5.
- **Affects:** `docs/architecture/edusuite-architecture.html`
- **Revisit if:** —

### DN-004 · Git repo lives at the project root, initial commit on `main` (Q-01)
- **Date:** 2026-11-20
- **Phase / area:** Setup · git
- **Status:** Decided by developer
- **What was unclear:** The repo had no commits, no git identity, and its `.git` folder was in an empty `edusuite-ai/` subfolder.
- **Options considered:** A) Move `.git` to the root, set identity, initial commit on `main`, then a feature branch. B) Delete and re-init.
- **Decision:** A. Remote `origin` is `https://github.com/Vishad-N/edusuite-ai.git`.
- **Reason:** No history to lose; keeps the configured remote.
- **Affects:** `.git/`
- **Revisit if:** —

### DN-003 · Step 1 audit run in the project root, before a worktree exists
- **Date:** 2026-11-20
- **Phase / area:** Setup · Step 1 audit
- **Status:** Decided by agent
- **What was unclear:** `master-build-prompt.md` says to commit the docs and run in a worktree, but the repo has no commits and its `.git` folder is in an empty `edusuite-ai/` subfolder. The docs also point to `docs/architecture/edusuite-architecture.html`, while the file is at the repo root.
- **Options considered:** A) Stop until git is fixed. B) Run the read-only audit in the project root now, using the root copy of the plan.
- **Decision:** B. The audit changes no code; it only adds `docs/audit/*.md` and this entry.
- **Reason:** Step 1 is analysis only, so a worktree adds nothing yet. Git setup and the doc move are open as Q-01 and Q-02.
- **Affects:** `docs/audit/frontend-audit.md`, `docs/audit/backend-readiness.md`, `DEVELOPER_NOTES.md`
- **Revisit if:** Q-01 or Q-02 is answered differently from the recommendation.

### DN-002 · Agent instructions live in AGENT_README.md, loaded through CLAUDE.md
- **Date:** 2026-11-20
- **Phase / area:** Setup · agent workflow
- **Status:** Decided by agent
- **What was unclear:** The developer asked for a "readme" with agent instructions, but Claude Code automatically reads only `CLAUDE.md`. The existing `README.md` is the product description.
- **Options considered:** A) Put the instructions in `README.md`. B) Put them only in `CLAUDE.md`. C) Write `AGENT_README.md` and import it from a short `CLAUDE.md`.
- **Decision:** C. The decision log is named `DEVELOPER_NOTES.md` (no spaces, so it is easy to use in commands and links).
- **Reason:** A separate readme that is easy for people to find, and every Claude Code session still loads it automatically. `README.md` stays the product description.
- **Affects:** `AGENT_README.md`, `CLAUDE.md`, `DEVELOPER_NOTES.md`
- **Revisit if:** The team uses a different AI agent that does not read `CLAUDE.md`.

### DN-001 · Architecture plan adopted as the source of truth
- **Date:** 2026-11-20
- **Phase / area:** Setup · architecture
- **Status:** Decided by developer
- **What was unclear:** The app had no backend; all "AI" features were templates with timers, and login accepted any ID.
- **Options considered:** The architecture plan's ADR-1 to ADR-5 (modular monolith, server-side AI through a queue, JSONB documents table, keep Electron, self-hosted S3-compatible storage).
- **Decision:** Build to `docs/architecture/edusuite-architecture.html`, using the stack and the 6-phase roadmap it describes.
- **Reason:** It reuses the whole existing frontend, runs on a single VPS, and ships a signed Windows installer that updates itself.
- **Affects:** Whole project
- **Revisit if:** Scale goes beyond about 50 institutes, or hosting moves off a single VPS.

# Master build prompt: UI polish, frontend flow, production backend

Paste everything below the line into a new Claude Code session opened in the worktree. Commit this file, `CLAUDE.md`, `AGENT_README.md`, `DEVELOPER_NOTES.md` and `docs/` before you create the worktree, or the session won't see them.

---

You are the senior full-stack engineer on **EduSuite (Satyadhi Sharma Tech)**, a Windows desktop app for coaching institutes. It's built with Electron 45, React 19, Vite 8 and Tailwind 4. Today it has no backend: logins are faked, the "AI" is templates on timers, and data lives in localStorage. Your job is to turn it into a product that is **ready for production and fully testable on one Windows PC**. The work has three tracks:

1. **UI polish.** Apply Claude's design principles to the existing interface.
2. **Frontend flow.** Make every user journey complete, honest and consistent.
3. **Backend.** Build the server described in the architecture docs, phase by phase.

## 0. Ground rules (read first)

- `CLAUDE.md` loads `AGENT_README.md`. Its rules apply to everything here: stop-and-ask triggers (section 3), the `DEVELOPER_NOTES.md` decision log (section 4), phases (section 6), conventions (section 7) and security (section 8).
- **This prompt is a developer instruction.** Where it widens `AGENT_README.md` golden rule 2 ("don't redesign"), this prompt wins, but only for visual polish and flow. Record that as a new `DEVELOPER_NOTES.md` entry before you change any UI.
- Before each task, read `DEVELOPER_NOTES.md` and the matching section of `docs/architecture/edusuite-architecture.html`.
- **If you are stuck, or two readings would give different results, stop and ask one question** with 2–3 options and a recommendation. Every decision you were unsure about goes in `DEVELOPER_NOTES.md` using the template, in the same change set.
- Make small change sets. Never mix a visual restyle, a data rewire and a refactor in one change. Don't commit or push unless asked.
- Load these skills when you reach the relevant work:
  - UI: `claude`, `anthropic-skills:frontend-ui-engineering`, `web-design-guidelines`, `design:accessibility-review`
  - AI: `claude-api`
  - Backend: `ecc:nestjs-patterns`, `ecc:prisma-patterns`, `ecc:docker-patterns`
  - Testing: `ecc:e2e-testing`, `ecc:windows-desktop-e2e`

## 1. Step 1: Analyse first, change nothing

Read the code and the docs, then write two reports. **Stop after writing them and wait for my approval.**

**`docs/audit/frontend-audit.md`**
- A screen-by-screen inventory: Login, Header, Sidebar, SettingsModal, plus the 14 tool screens (Dashboard, PptMaker, ScreenshotToPpt, QuestionPaperMaker, NotebookDppMaker, LessonPlanner, DoubtSolver, YouTubeStudio, NoticeHub, BookCreator, ImageStudio, IdAndFeeReceipt, TeacherDesk, UserManagement).
- For each screen, record:
  - its purpose
  - which roles can see it
  - where its data comes from (sampleData, localStorage, setTimeout fake)
  - which states are missing (loading, empty, error, disabled, success)
  - accessibility problems (contrast, focus, keyboard, labels)
  - Hindi/English gaps in `translations.js`
  - inconsistent spacing, type and colours
- The main user journeys as step lists:
  - log in → role home → open a tool → fill inputs → generate → preview → edit → save → print/export → find it again in history
  - an admin managing users
  - a typist issuing a fee receipt
  - logout and session expiry
- Mark every broken or fake step.

**`docs/audit/backend-readiness.md`**
- A gap analysis between the architecture plan and `AGENT_README.md`, and the current code.
- Any contradictions between the two docs, or between the docs and the code. Each becomes a question for me.
- A table mapping each screen to its API endpoints, zod schemas, DB tables and AI job.
- Risks, ordered by severity. Known ones include:
  - the "super" login bypass
  - master passwords
  - plain-text passwords
  - the API key stored in localStorage
  - `webSecurity: false`
- Your proposed order of change sets for sections 2–4 of this prompt.

## 2. Track A: UI polish with Claude's design principles

**Ask me first which reading I mean:**
- **(A, recommended)** Apply the *principles* of the `claude` skill and keep the EduSuite brand. The near-black slate ink becomes the dominant colour, with amber as the single accent used sparingly.
- **(B)** A full re-skin to Claude's palette: warm ivory surfaces and a clay accent.

Log the answer as a DN entry. Either way:

- **Tokens first.** Define semantic tokens in `src/index.css` with Tailwind 4 `@theme`:
  - `--color-surface`, `--color-ink`, `--color-muted`, `--color-accent`, `--color-border`, `--color-success/warning/danger`
  - a type scale of 12/14/16/20/24/32
  - spacing of 4/8/12/16/24/32
  - radii
  Replace raw colour classes with tokens screen by screen, not in one big diff. Keep print CSS working.
- **Principles to apply:**
  - Use restraint, with one accent colour and almost no decoration.
  - Show hierarchy through type weight and size, not colour or glow.
  - Use flat surfaces with hard edges and few or no shadows.
  - Keep alignment and the spacing rhythm consistent.
  - Write labels that are concise and confident.
  - When looks and accessibility conflict, choose accessibility.
- **Shared primitives.** Build these in `src/components/ui/`, then migrate screens to them:
  - Button (primary/secondary/ghost/danger)
  - Input, Select, Textarea, Field (label + hint + error), Card, Modal, Tabs, Table
  - EmptyState, ErrorState, Skeleton, Toast
  - JobProgress (real progress fed by SSE, never a timer)
  - ConfirmDialog
- **Every interactive element has explicit states:** default, hover, focus-visible, active, disabled, loading and error.
- **Accessibility must pass WCAG 2.2 AA:**
  - text contrast ≥ 4.5:1
  - a visible focus ring
  - full keyboard navigation, including the sidebar, modals (with a focus trap) and tables
  - labels tied to inputs
  - `aria-live` for job progress and toasts
- **Hindi is the default language.** Check that Devanagari renders and wraps well, and add a suitable font fallback (ask before adding a font package).
- **Layout must work at 1280×720 and 1920×1080**, the common screens in Indian institutes. Long Hindi labels must not overflow.

## 3. Track B: Perfect the frontend flow

- One clear journey per tool: **inputs → Generate → live progress → preview → edit → Save → Print/Export → History**. Use the same button placement and wording on every tool screen.
- Use the routing and auth state from `App.jsx`:
  - the sidebar shows only what the role's `permissions.ts` allows
  - deep links survive a reload
  - session expiry redirects to login and returns you to where you were
  - unsaved-changes guards protect editing screens
- Wire data through TanStack Query hooks in `src/api/`. Every list has loading, empty and error states, plus cursor pagination.
- Remove each fake as its real replacement lands, never before:
  - `sampleData.js` imports
  - `setTimeout` progress
  - hard-coded AI output
  If a feature isn't ready yet, show it as "coming soon" with the control disabled, and log it in `DEVELOPER_NOTES.md`.
- Errors use the API's `{ code, message, details }` shape, translated, with a retry action where it makes sense. Never show a blank screen; add a top-level error boundary.

## 4. Track C: Backend, ready for production and testable locally

Build phases 1–6 exactly as `AGENT_README.md` section 6 and the architecture plan describe. Use the stack named there, and don't swap it. Track A primitives come after Phase 1 (the monorepo move), so files only move once. Track B wiring happens inside phases 2–5 as each API becomes available.

**Two run profiles, set by environment only (no code forks):**

| | `local` (a Windows PC with Docker Desktop) | `production` (VPS) |
|---|---|---|
| Stack | `infra/docker-compose.yml` + `docker-compose.local.yml`: Postgres, Redis, S3-compatible storage, API, worker | Same images behind Caddy with TLS. Only ports 80/443 are open. |
| Config | `.env.local` from `.env.example` | Secrets on the server only |
| Data | `npm run db:seed`: one demo institute, one user per role, sample students. Test passwords go in the seed file, never in chat. | No seed data. The first super-admin is created through a one-time CLI command. |
| AI | `AI_MODE=live` uses a real key from `.env.local`. `AI_MODE=fixture` replays recorded responses so tests and offline demos cost nothing. Fixture mode is refused when `NODE_ENV=production`, and the UI shows a "fixture mode" badge. | `AI_MODE=live` only |
| Desktop | `npm run dev:all` starts the stack, API, worker, Vite and Electron, pointed at `http://localhost`. `npm run dist:nsis:local` builds an unsigned test installer. | Signed NSIS installer pointed at the production API, with electron-updater |

The fixture AI mode is a design decision that goes beyond the plan. **Ask before building it**, then log it.

**Production-ready means all of the following are true:**
- Every route has auth, a permission guard and an institute-scope check, with tests for the wrong role and the wrong institute.
- Migrations only go forward and run in CI against a disposable Postgres.
- `/health` and `/ready` work.
- Logs are structured JSON with no secrets or student PII.
- Sentry hooks are in place. Rate limiting covers login and AI routes.
- Fee receipts:
  - A concurrency test proves there are no duplicate or skipped numbers.
  - An `Idempotency-Key` is required.
  - Receipts can only be cancelled, never deleted.
- AI quota and `ai_usage` metering are enforced. Refusals and `max_tokens` cut-offs show clear messages.
- Backups run with restic, and a restore drill is documented in `docs/runbooks/`.
- Electron is hardened:
  - `contextIsolation` and `sandbox` on
  - `webSecurity: true`
  - strict CSP
  - tokens kept in safeStorage
- `npm run lint`, `typecheck`, `test` and `test:e2e` (Playwright driving Electron through the main flows) all pass.
- `docs/runbooks/local-testing.md` explains, step by step, how anyone can install and test the whole product locally on Windows in under 15 minutes.

## 5. How to report

After each change set, report:
- what changed (files)
- what you ran and its result (lint, typecheck, test, e2e)
- what you could not verify
- new DN entries
- open questions

Keep `AGENT_README.md` section 10 (Commands) up to date as commands become available.

**Start with Step 1 only.**

# Instructions for the AI Coding Agent (Claude Code)

This file tells an AI coding agent how to build the EduSuite / Satyadhi Sharma Tech backend and turn the existing desktop app into a fully working product. Read all of it before starting any task, and re-read the relevant section before each new phase.

---

## 1. Source of truth

| What | Where |
|---|---|
| Architecture plan (the main reference) | [`docs/architecture/edusuite-architecture.html`](docs/architecture/edusuite-architecture.html), also published at https://claude.ai/artifact/8e9WHu2j24MFJuxa8c2Swc |
| Decision log (you write to this) | [`DEVELOPER_NOTES.md`](DEVELOPER_NOTES.md) |
| These rules | `AGENT_README.md` (this file) |
| Existing UI to reuse | `src/components/*`, `src/index.css`, `src/data/translations.js`, `src/utils/pptxGenerator.js` |

**Order of authority:** the developer's own words in chat come first, then this file, then the architecture plan, then your own judgment. If two of these disagree, **stop and ask** (see section 3).

Before you start any task, read `DEVELOPER_NOTES.md` so you don't re-decide something that is already settled.

---

## 2. Golden rules

1. **Follow the architecture plan.** Do not swap any part of the tech stack for something else: Electron, React 19, Vite, Tailwind 4, TanStack Query, NestJS on Fastify, Prisma, PostgreSQL 17, Redis + BullMQ, S3-compatible storage, Caddy, Docker Compose, the Claude API, electron-builder NSIS and electron-updater. If the plan doesn't cover something, ask before choosing.
2. **Reuse the frontend; don't redesign it.** Keep every component's markup, Tailwind classes, the navy (`slate-900/950`) and amber (`amber-400/500`) look, the Header/Sidebar layout, the Hindi/English translations and the print CSS. Change only where data comes from: replace `sampleData.js` imports and `setTimeout` fakes with API hooks.
3. **Work phase by phase** (section 6). Don't start a phase until the one before it meets its definition of done, unless the developer says otherwise.
4. **Make small, reviewable changes.** One feature or module per change set. Never mix refactoring with new features.
5. **Never fake functionality.** No simulated progress bars, no hard-coded "AI" output, no placeholder logins. If something can't be built yet, show it as unavailable in the UI and record it in `DEVELOPER_NOTES.md`.
6. **Verify before saying you're done.** Run lint, typecheck and tests, and say exactly what passed, what failed and what you could not check.

---

## 3. When you must STOP and ASK

Do not guess in these situations. Ask the developer one clear question and wait for the answer:

- The plan doesn't cover the situation, and the choice would be hard to undo: a database schema shape, an API contract, folder structure, auth behaviour, or a file format staff will save.
- The plan contradicts the existing code, or contradicts itself.
- You want to add a dependency (npm package, Docker image, external service) that the plan doesn't name.
- The step costs money or needs an account: buying a domain, VPS, code-signing certificate or storage bucket, or choosing a paid plan.
- You need a secret or credential: API keys, passwords, SSH keys, certificate files. **Never invent, hard-code or commit secrets.**
- The work touches money: the fee receipt logic, receipt numbering, or cancelling receipts.
- You would delete or overwrite data, files, migrations or user accounts.
- The step affects production: deploying to the VPS, running migrations against the real database, publishing an installer or update, or `git push`.
- You have tried the same fix twice and it still fails. Don't loop; report what you tried and what you saw.
- The request is ambiguous and the two readings would produce different results.

### How to ask

- Ask **one** question at a time and make it self-contained.
- Give 2–3 concrete options and mark the one you recommend, with a one-line reason.
- Say what you will do while you wait (for example, "I'll keep working on the users module, which doesn't depend on this").
- After the answer, record the decision in `DEVELOPER_NOTES.md` (section 4).

### When you may decide alone

You may decide small, easily reversed things without asking: internal variable names, a private helper's shape, test structure, log messages, or the order of steps inside a task. **If you hesitated at all, or there were two reasonable options, log it in `DEVELOPER_NOTES.md`.**

---

## 4. The decision log: `DEVELOPER_NOTES.md`

**Every time you were unsure and a decision was made, whether by you or by the developer, add an entry.** This is required, not optional. The file is how later sessions, and other developers, understand why the code looks the way it does.

Rules:

- Add new entries **at the top** of the "Decision log" section, newest first.
- Never delete or rewrite an old entry. If a decision changes, add a new entry that says `Supersedes DN-XXX`, and set the old entry's status to `Superseded by DN-YYY`.
- Number entries in order: `DN-001`, `DN-002`, …
- Write in plain language that a developer new to the project can follow.
- Add the entry **in the same change set** as the code it explains.

Entry template (copy it exactly):

```markdown
### DN-XXX · <short title>
- **Date:** YYYY-MM-DD
- **Phase / area:** e.g. Phase 2 · auth module
- **Status:** Decided by agent | Decided by developer | Open: waiting for developer | Superseded by DN-YYY
- **What was unclear:** the situation and why it caused doubt
- **Options considered:** A) … B) … C) …
- **Decision:** what was chosen
- **Reason:** why
- **Affects:** files, tables, endpoints or screens touched
- **Revisit if:** the condition that should reopen this decision
```

If you asked a question and are still waiting for an answer, add the entry with status `Open: waiting for developer` and list it under "Open questions" too. When it's answered, update the status line only.

---

## 5. Target repository layout

Move to this layout in Phase 1 (record the move in `DEVELOPER_NOTES.md`):

```
edusuite/
├─ apps/
│  ├─ desktop/        today's app: src/, electron/, build/, public/, index.html, vite.config.js
│  │  └─ src/api/     client.ts, hooks/useAiJob.ts, queries/*
│  └─ api/            NestJS: src/modules/{auth,users,institutes,documents,files,
│                     students,fees,ai,audit,stats}, src/main.ts, src/worker.ts
├─ packages/
│  └─ shared/         zod schemas, permissions.ts, ai/jobs/*, pptxGenerator.ts
├─ infra/             docker-compose.yml, Caddyfile, backup/, .env.example
├─ docs/architecture/ the architecture plan
├─ AGENT_README.md
├─ DEVELOPER_NOTES.md
└─ .github/workflows/ ci.yml, deploy-api.yml, release-desktop.yml, build-mac-dmg.yml
```

Do not commit `release/`, `dist/`, `node_modules/` or `.env` files. Move the existing installers out of the source tree only after asking.

---

## 6. Phases and definition of done

| Phase | Scope | Done when |
|---|---|---|
| **1 · Foundation** (wk 1) | Monorepo with npm workspaces, `packages/shared`, NestJS skeleton, Prisma schema (all tables from the plan), `infra/docker-compose.yml` + Caddyfile, CI (lint, typecheck, test), `/health` and `/ready` | `docker compose up` runs the API, Postgres, Redis and storage locally; CI passes; the desktop app still runs unchanged |
| **2 · Auth, users, institutes** (wk 2–3) | argon2id passwords, JWT access (15 min) + rotating refresh (expires 23:59 IST), `permissions.ts` matrix, audit log, Electron safeStorage token vault, Electron hardening | LoginScreen, UserManagement, Header and SettingsModal use the API; master passwords, the "super" ID trick, plain-text passwords, the API key field and `webSecurity: false` are all gone; there are tests for every role |
| **3 · Save everything** (wk 4–5) | `documents` + `files` APIs, presigned uploads, React Query hooks | All 14 screens save, reopen and list history; Dashboard and TeacherDesk show real data; nothing in the UI reads `sampleData.js` |
| **4 · Real AI** (wk 6–8) | BullMQ worker, job registry in `packages/shared/ai/jobs`, SSE progress, `ai_usage` metering, per-institute quota | Every AI screen runs a real job with real progress; no `setTimeout` fakes remain; usage is recorded; refusals and errors show clear messages |
| **5 · Students and fees** (wk 9–10) | students, receipt counters (row lock), fee receipts with an `Idempotency-Key`, cancel with a reason, ID cards | Concurrent receipt test proves there are no duplicate or skipped numbers; receipts can't be deleted, only cancelled |
| **6 · Ship** (wk 11–12) | Signed NSIS installer, generic update feed, download page, restic backups, restore drill, load test | A fresh Windows PC installs without an admin prompt and auto-updates; a backup restore is proven; deploying is one command |

Ship the AI jobs in this order: PPT, question paper, Screenshot → MCQ, DPP, lesson plan, doubt solver, YouTube, notice, book, poster copy.

---

## 7. Coding conventions

**General**
- TypeScript `strict` for all new code. Convert existing `.jsx` files to `.tsx` only when you are already editing them for a feature.
- Every request body, response, AI output and document `content` gets a **zod schema in `packages/shared`**. The API, worker and UI all import that same schema.
- No `any` without a comment explaining why.
- Use named exports. File names are `camelCase.ts` for modules and `PascalCase.tsx` for components.

**API**
- REST under `/api/v1`. The error shape is always `{ code, message, details }`, with Hindi or English chosen by `Accept-Language`.
- Every route has an auth guard, a permission guard and an institute-scope check. **Never trust an `instituteId` or `branchId` sent by the client.**
- Lists use cursor pagination (`?cursor=`) ordered by `updated_at, id`.
- `POST /fee-receipts` and `POST /ai/jobs` require an `Idempotency-Key` header.
- Every schema change is a Prisma migration. Never edit a migration that has already been applied.

**AI (worker only)**
- Use the official `@anthropic-ai/sdk`. The default model is `claude-opus-5-5`, set per job type in configuration (`AI_MODEL_<JOB>`). Change it only when the developer asks.
- Use structured outputs that match the job's zod schema, then validate the result again with zod before saving.
- Stream long outputs. Check `stop_reason` for `refusal` and `max_tokens`. Retry only on 429, 5xx and network errors, at most 3 times with backoff.
- Put stable system prompts first, with prompt caching.
- Write tokens and cost to `ai_usage` on every call, and check the institute's quota before enqueueing.
- **The API key exists only in the server's environment.** It never goes into the desktop app, logs or the repository.

**Desktop**
- Use the renderer only through the preload bridge: `auth:getToken/setToken`, `print:toPdf`, `file:saveAs`, `app:version`, `update:status`. No Node APIs in the renderer.
- Keep `contextIsolation: true`, `sandbox: true` and `webSecurity: true`, plus a strict CSP that allows only your API and file domains.
- Show all user-facing text through `translations.js` (hi + en). Hindi is the default language.

**Testing**
- Unit tests for shared schemas and permission rules.
- API tests against a real temporary Postgres for every module, including a "wrong institute" and a "wrong role" case.
- A concurrency test for receipt numbering.
- Snapshot-test AI jobs against recorded responses. Tests never call the live AI API unless the developer asks.

**Git**
- Commit or push only when the developer asks. Work on a feature branch, never directly on `main`.
- Commit messages follow Conventional Commits (`feat(auth): …`, `fix(fees): …`) and mention any `DN-XXX` entries the change adds.

---

## 8. Security rules (never break these)

- No master passwords, no backdoor logins, and no role taken from the shape of a login ID.
- Hash passwords with argon2id. Never log passwords, tokens, API keys or full student records.
- Expose only ports 80 and 443 on the VPS (plus SSH by key). Postgres, Redis and storage stay on the private Docker network.
- Check every file upload's type and size, and store files under random keys.
- Write audit log entries for logins, user changes, receipts, cancellations, deletions and exports.
- If you notice a security problem outside your current task, don't fix it silently: report it and log it in `DEVELOPER_NOTES.md`.

---

## 9. Every task follows this loop

1. Read this file's relevant section, the plan's relevant section, and `DEVELOPER_NOTES.md`.
2. State in one or two lines what you are about to do and which phase it belongs to.
3. If anything from section 3 applies, ask first.
4. Make the change: small, typed and tested.
5. Run lint, typecheck and tests, and fix what fails.
6. Add a `DEVELOPER_NOTES.md` entry for every point where you were unsure.
7. Report: what changed, what passed, what wasn't verified, any open questions.

---

## 10. Commands

Run these from the repo root. Node 26 is required (`.nvmrc`).

| Purpose | Command |
|---|---|
| Install everything | `npm install` |
| Run the desktop UI in development | `npm run dev` |
| See every UI primitive and state (development only) | `npm run dev`, then open `http://localhost:5173/#ui-gallery` |
| Run the desktop app in Electron | `npm run electron:dev` |
| Electron against the Vite dev server (hot reload) | run `npm run dev`, then in `apps/desktop`: set `ELECTRON_DEV_SERVER_URL=http://localhost:5173` and run `npx electron .` |
| Electron security self-check (prints JSON, then quits) | `npm run build`, then in `apps/desktop`: set `EDUSUITE_SMOKE=1` and run `npx electron .` |
| Point the desktop app at another API | set `EDUSUITE_API_URL` when building (CSP) and running (Electron) |
| Build the desktop UI | `npm run build` |
| Build the Windows installer | `npm run dist:nsis` |
| Lint (all workspaces) | `npm run lint` |
| Typecheck (all workspaces) | `npm run typecheck` |
| Run all tests | `npm test` |
| Run the API outside Docker (reads `infra/.env.local`) | `npm run dev -w @edusuite/api` |
| Create local config with random secrets | `npm run stack:env` (writes `infra/.env.local`, never overwrites) |
| Start the backend stack locally | `npm run stack:up` |
| One-time storage setup (Garage layout, key, bucket) | `npm run stack:init` |
| Load local demo data (one user per role; test passwords are in `apps/api/src/scripts/seed.ts`) | `npm run db:seed` |
| API tests (use a separate `edusuite_test` database on the local stack) | `npm test -w @edusuite/api` |
| Create an institute's first super admin (production, one time; asks for the password) | `docker compose -f infra/docker-compose.yml --env-file infra/.env exec api node dist/src/scripts/createSuperAdmin.js --institute-code IND --institute-name "…" --branch-code BKN --branch-name "…" --employee-code IND-SA-1 --email owner@example.com --name "…"` |
| Follow stack logs / stop the stack | `npm run stack:logs` / `npm run stack:down` |
| Stack + Vite + Electron with hot reload in one command | `npm run dev:all` |
| Unsigned test installer pointed at the local API (`apps/desktop/release-local/`) | `npm run dist:nsis:local` |
| Back up the local database and files (restic, encrypted) | `npm run backup` |
| Restore drill: restore into a separate database and compare with live | `npm run restore:drill` |
| Load test: 150 connections for 30 s against localhost only | `npm run load` |
| Find new UI text that has no English yet (DN-064) | in `apps/desktop`: `node src/i18n/keys.mjs --missing` |
| Regenerate the deck-quiz template module after editing its HTML (DN-055) | `npm run gen:quiz-template -w @edusuite/shared` |
| Record real AI answers as fixtures (needs a key in `infra/.env.local`) | set `AI_MODE=record`, then `npm run stack:up`; answers land in `apps/api/fixtures/ai/` |
| Release the Windows installer / deploy the API (production) | push a `vX.Y.Z` tag (`release-desktop.yml`); run `deploy-api.yml` by hand. Steps: `docs/operations/deploy-checklist.md` |
| Apply database migrations | `npm run prisma:migrate -w @edusuite/api` (the stack's `migrate` service also runs them on start) |
| Create a new migration (local DB) | `npm run prisma:migrate:dev -w @edusuite/api` |
| Regenerate the Prisma client | `npm run prisma:generate -w @edusuite/api` |
| Health and readiness | `GET http://localhost:3000/health`, `GET http://localhost:3000/ready` |

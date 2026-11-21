# Developer Notes: Decision Log

This file records every point where the AI agent (or a developer) was unsure and a decision was made. The rules for writing entries are in [`AGENT_README.md`](AGENT_README.md), section 4.

- Newest entries go at the top of the "Decision log".
- Never delete or rewrite old entries. Supersede them with a new one.
- Number entries in order: DN-001, DN-002, …

---

## Open questions

Decisions waiting for the developer. Remove a line here once its entry's status is updated.

- DN-037 · Multi-branch staff: how should they pick a branch at login? (Today everyone works at their home branch.)

---

## Decision log

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

# Local testing on Windows

How anyone can install and test the whole EduSuite product on one Windows PC in about 15 minutes: the backend (API, AI worker, Postgres, Redis, Garage storage) in Docker, and the desktop app. Nothing here needs a server, a domain or an AI key.

## You need

- Windows 10 or 11 with **Docker Desktop** (WSL 2 backend), started
- **Node.js 26** (`node --version` shows v26)
- **Git**

## First run (about 15 minutes, most of it downloads)

Run every command from the repo root.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local config with random secrets. This writes `infra/.env.local` (git-ignored) and never overwrites an existing one:

   ```bash
   npm run stack:env
   ```

3. Build and start the stack: Postgres, Redis, Garage, the migrations, the API and the AI worker:

   ```bash
   npm run stack:up
   ```

4. Set up storage once (layout, access key, bucket). Running it again is harmless:

   ```bash
   npm run stack:init
   ```

5. Load the demo data: one demo institute with two branches, one user per role, the EduSuite operator, and starting AI credits:

   ```bash
   npm run db:seed
   ```

   The test logins and passwords are in `apps/api/src/scripts/seed.ts`. They are for local testing only.

6. Check the API. `/ready` should answer `200` with `database`, `redis` and `storage` all `"up"`:

   ```bash
   curl http://localhost:3000/ready
   ```

7. Open the desktop app:

   ```bash
   npm run electron:dev
   ```

   Or, for development with hot reload, `npm run dev:all` starts the stack (if needed), Vite and Electron in one go. Only one copy of the app can be open at a time.

## What to try

| Log in as | Try |
|---|---|
| `DEMO-T` (teacher) | Any AI tool: PPT, question paper, DPP, lesson plan, doubt, YouTube, book chapter, deck → quiz, screenshot → MCQ. Save, then reopen from History. Press "रोकें" while a job runs. |
| `DEMO-C` (counselor, second branch) | Students: add one with a photo, issue a fee receipt, print it, print the ID card. Notices with AI. |
| `DEMO-SA` (super admin) | Users, settings, cancelling a receipt (needs a reason), "AI उपयोग और ऑडिट लॉग". |
| `DEMO-BA` (branch admin) | The same, limited to the main branch. |
| `DEMO-PA` (EduSuite operator) | AI credits per institute, adding or taking away credits, job prices. |

The header's हिन्दी / English switch changes every screen.

### AI runs in fixture mode

Locally `AI_MODE=fixture`: every AI button returns a **sample answer** (the header shows "AI फिक्स्चर मोड" and the result says it is a sample). Credits are still charged and refunded, so the whole flow can be tested for free.

To try real Claude, put your key in `infra/.env.local` (never in chat or the repo) and set either:
- `AI_MODE=live`: real answers, or
- `AI_MODE=record`: real answers, also saved under `apps/api/fixtures/ai/` so later fixture runs replay them.

Then run `npm run stack:up` again. Optional: `AI_MODEL_<JOB_TYPE>` (e.g. `AI_MODEL_DECK_QUIZ`) runs one job type on another model.

## Every day

- Start: `npm run stack:up`, then `npm run electron:dev` (or `npm run dev:all`)
- Logs: `npm run stack:logs`
- Stop: `npm run stack:down` (data is kept in Docker volumes)

## Backups and the restore drill (DN-063)

Locally, backups go to a Docker volume (`RESTIC_REPOSITORY=/backup-repo`); production uses Cloudflare R2 or Backblaze B2 (`docs/operations/deploy-checklist.md`).

1. Take a backup (database dump plus every stored file, in one encrypted snapshot):

   ```bash
   npm run backup
   ```

   It ends with `no errors were found`.

2. Run the restore drill. It restores into a separate database (`<db>_restore_drill`), compares every key table with the live one, and prints `restore_seconds`. It never touches the live data:

   ```bash
   npm run restore:drill
   ```

   Right after a backup, add `-e DRILL_EXPECT_EQUAL=1` to the underlying command (see `package.json`) to fail on any difference. The run ends with `drill passed`.

3. Drop the drill database when done:

   ```bash
   docker exec edusuite-postgres-1 psql -U edusuite -d postgres -c "DROP DATABASE IF EXISTS edusuite_restore_drill WITH (FORCE)"
   ```

Restoring over the live database is refused unless `I_AM_RESTORING_LIVE=yes` is set; that is only for a real disaster on a fresh server.

## Load test (DN-063)

```bash
npm run load
```

It sends 150 connections at once for 30 seconds against `localhost` only, as the demo users, and passes when p97.5 latency is under 300 ms with no errors. It saves test notices into the demo institute, so run it on demo data only.

## A test installer

```bash
npm run dist:nsis:local
```

It builds an unsigned, one-click, per-user installer pointed at the local API, in `apps/desktop/release-local/`. Windows shows "Windows protected your PC" for unsigned installers: choose "More info" → "Run anyway". Auto-update is off in this build.

## Ports

All ports listen on `127.0.0.1` only, so nothing is reachable from your network.

| Service | Port |
|---|---|
| API | 3000 |
| Postgres | 5432 |
| Redis | 6379 |
| Garage S3 API | 3900 |
| Vite (with `npm run dev` / `dev:all`) | 5173 |

## Automated checks

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

API tests use a separate `edusuite_test` database on the local stack, so Docker must be running.

## When something goes wrong

- **`/ready` says `storage: "down"`:** run `npm run stack:init`, then check `npm run stack:logs`.
- **`set POSTGRES_USER` (or similar) error:** `infra/.env.local` is missing; run `npm run stack:env`.
- **`required variable UPDATES_DOMAIN is missing`:** your `infra/.env.local` predates Phase 6; add `UPDATES_DOMAIN=updates.example.com` to it.
- **The app opens and closes at once:** another copy is already open; close it first.
- **AI buttons say credits are low:** log in as `DEMO-PA` and add credits to the demo institute.
- **Start fresh, deleting all local data:** `npm run stack:down -- -v`. This removes the local database, stored files and local backups permanently.

# Local testing on Windows

How to run the whole EduSuite backend on one Windows PC. This covers Phase 1 (API, Postgres, Redis, Garage storage). Later phases add the worker, seed data and the desktop app wiring; this page grows with them.

## You need

- Windows 10 or 11 with **Docker Desktop** (WSL 2 backend) running
- **Node.js 26** (`node --version` shows v26)
- **Git**

## First run

Run every command from the repo root.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local config with random secrets. This writes `infra/.env.local`, which is git-ignored, and never overwrites an existing one:

   ```bash
   npm run stack:env
   ```

3. Build and start the stack (Postgres, Redis, Garage, then migrations, then the API):

   ```bash
   npm run stack:up
   ```

4. Set up storage once (layout, access key, bucket). Running it again is harmless:

   ```bash
   npm run stack:init
   ```

5. Check the API:

   ```bash
   curl http://localhost:3000/health
   ```

   ```bash
   curl http://localhost:3000/ready
   ```

   `/ready` should return `200` with `database`, `redis` and `storage` all `"up"`.

## Every day

- Start: `npm run stack:up`
- Logs: `npm run stack:logs`
- Stop: `npm run stack:down` (data is kept in Docker volumes)

## Ports

All ports listen on `127.0.0.1` only, so nothing is reachable from your network.

| Service | Port |
|---|---|
| API | 3000 |
| Postgres | 5432 |
| Redis | 6379 |
| Garage S3 API | 3900 |

## When something goes wrong

- **`/ready` says `storage: "down"`:** run `npm run stack:init`, then check `npm run stack:logs`.
- **`set POSTGRES_USER` (or similar) error:** `infra/.env.local` is missing; run `npm run stack:env`.
- **Start fresh, deleting all local data:** `npm run stack:down -- -v`. This removes the local database and stored files permanently.

# EduSuite deploy checklist (Phase 6)

Everything here touches the real server, money or secrets, so the developer does it (or approves each step).
Nothing in this repo holds a real secret. Decisions: DN-062 (installer, updates, release), DN-063 (backups, load test).

## 1. Server

- [ ] A VPS in Mumbai or Bangalore: Ubuntu 24.04, 4 vCPU / 8 GB (plan §11).
- [ ] SSH with a key only (no passwords). Firewall open only on 22, 80 and 443.
- [ ] Install Docker Engine and the compose plugin.
- [ ] Clone the repo to `/srv/edusuite`.
- [ ] `mkdir -p /srv/edusuite/updates/desktop`. The release workflow copies installers there, and Caddy serves it.

## 2. Domains (DNS A records to the VPS)

| Variable         | Example                | Serves                                 |
|------------------|------------------------|----------------------------------------|
| `API_DOMAIN`     | `api.example.com`      | the API                                |
| `FILES_DOMAIN`   | `files.example.com`    | presigned uploads and downloads (Garage) |
| `UPDATES_DOMAIN` | `updates.example.com`  | update feed `/desktop/` and the download page |

Caddy gets the TLS certificates automatically once DNS points at the server.

## 3. `infra/.env` on the server (chmod 600, never committed)

- [ ] `cp infra/.env.example infra/.env`, then fill it in:
  - `NODE_ENV=production`
  - new random secrets for `POSTGRES_PASSWORD`, `JWT_SECRET`, `GARAGE_*` and `S3_*` (as `npm run stack:env` makes them)
  - the three domains
  - `S3_PUBLIC_ENDPOINT=https://<FILES_DOMAIN>`
  - `CORS_ORIGINS=null`
- [ ] **AI:** `AI_MODE=live` (production refuses fixture mode) and `ANTHROPIC_API_KEY`. Only the worker reads the key.
- [ ] **Backups:**
  - `RESTIC_REPOSITORY=s3:https://<account>.r2.cloudflarestorage.com/edusuite-backups` (or a Backblaze B2 S3 URL)
  - `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY`: a key limited to that one bucket
  - `RESTIC_PASSWORD`: long and random. **Store a copy in a password manager off the server.** Without it, the backups can't be read.

## 4. First start

```sh
docker compose -f infra/docker-compose.yml --env-file infra/.env --profile production up -d --build
ENV_FILE=infra/.env COMPOSE_FILES=infra/docker-compose.yml node infra/scripts/garage-init.mjs   # one time: layout, key, bucket
curl -fsS https://$API_DOMAIN/ready    # postgres, redis and storage all answer
```

- [ ] Create the operator, then each institute's first super admin, with the one-time command. The full usage is at the top of `apps/api/src/scripts/createSuperAdmin.ts`. The password comes from a hidden prompt, never from the command line (DN-034, DN-053):
  ```sh
  docker compose -f infra/docker-compose.yml --env-file infra/.env exec api node dist/src/scripts/createSuperAdmin.js \
    --platform --institute-code EDUSUITE --institute-name "EduSuite" --branch-code HQ --branch-name "HQ" \
    --employee-code OPS-1 --email ops@<your-domain> --name "<Operator name>"
  ```
  The operator then grants each institute its credits in the app.

## 5. Backups (DN-063)

- [ ] Run one by hand and check it says `no errors were found`:
  `docker compose -f infra/docker-compose.yml --env-file infra/.env --profile ops run --rm backup`
- [ ] Add a nightly cron job at 02:30 IST (21:00 UTC). Run `crontab -e` as the deploy user and add:
  `0 21 * * * cd /srv/edusuite && docker compose -f infra/docker-compose.yml --env-file infra/.env --profile ops run --rm backup >> /var/log/edusuite-backup.log 2>&1`
- [ ] **Restore drill, monthly and before the pilot.** It restores into a separate database and only compares, so it's safe on the live server:
  `... --profile ops run --rm backup /usr/local/bin/restore.sh`
  Write down `restore_seconds`. The plan's target is a restore within 2 hours, losing at most 24 hours of data.
- [ ] Disaster restore on a new server: set `RESTORE_DB=<POSTGRES_DB>`, `RESTORE_BUCKET=<S3_BUCKET>` and `I_AM_RESTORING_LIVE=yes`, then start the API.

## 6. GitHub settings

- **Variables:**
  - `EDUSUITE_API_URL=https://<API_DOMAIN>`
  - `EDUSUITE_FILES_URL=https://<FILES_DOMAIN>`
  - `UPDATES_URL=https://<UPDATES_DOMAIN>/desktop/`
- **Secrets:** `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a deploy-only key), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <host>`).
- **Environment `production`:** add yourself as a required reviewer. `deploy-api.yml` waits for that approval.

## 7. Releasing the desktop app

1. Bump nothing by hand. Tag `vX.Y.Z` on `main` and push the tag.
2. `release-desktop.yml` refuses to run unless the three variables are `https://` addresses. It then tests and builds the one-click, per-user installer and uploads it as an artifact. When the deploy secrets exist, it copies the installer and then `latest.yml` to the feed, and drafts a GitHub release.
3. Installed apps check at start and every 4 hours. They download the update quietly, then show "अपडेट तैयार … दोबारा शुरू करें". The update also installs when staff close the app.

**Code signing:** none for the pilot, so Windows shows "Windows protected your PC" once; the download page explains it. Before the wider rollout, add `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (or Azure Trusted Signing). electron-builder signs automatically once they're set.

## 8. Before the pilot branch

- [ ] Run every AI job once with `AI_MODE=record` on a test institute. Check the Hindi quality and commit the fixtures.
- [ ] Run the load test against a staging copy (not production) if the VPS size changes.
- [ ] Pilot at one branch for a week, watching `/ready`, the backup log and the AI cost, then roll out.

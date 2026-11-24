#!/usr/bin/env bash
# Nightly backup (plan §11, DN-063): one encrypted restic snapshot holding
#   db/edusuite.dump  — pg_dump custom format (all tables, including the receipt counters)
#   files/            — every object in the storage bucket, copied out with rclone
# then keeps 7 daily, 4 weekly and 6 monthly snapshots.
# Needs: RESTIC_REPOSITORY, RESTIC_PASSWORD (+ AWS_* for an S3 repository), PG*, SRC_S3_*.
set -euo pipefail
log() { printf '%s backup: %s\n' "$(date -u +%FT%TZ)" "$*"; }

: "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD:?}" "${PGHOST:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
: "${SRC_S3_ENDPOINT:?}" "${SRC_S3_BUCKET:?}" "${SRC_S3_ACCESS_KEY_ID:?}" "${SRC_S3_SECRET_ACCESS_KEY:?}"

export RCLONE_CONFIG_SRC_TYPE=s3 RCLONE_CONFIG_SRC_PROVIDER=Other RCLONE_CONFIG_SRC_REGION="${SRC_S3_REGION:-garage}" \
  RCLONE_CONFIG_SRC_ENDPOINT="$SRC_S3_ENDPOINT" RCLONE_CONFIG_SRC_ACCESS_KEY_ID="$SRC_S3_ACCESS_KEY_ID" \
  RCLONE_CONFIG_SRC_SECRET_ACCESS_KEY="$SRC_S3_SECRET_ACCESS_KEY" RCLONE_CONFIG_SRC_FORCE_PATH_STYLE=true

work=/work/snapshot
rm -rf "$work" && mkdir -p "$work/db" "$work/files"

# First run on a new repository: create it.
restic cat config >/dev/null 2>&1 || { log "initialising repository"; restic init; }

log "dumping database $PGDATABASE"
pg_dump --format=custom --no-owner --file="$work/db/edusuite.dump" "$PGDATABASE"

log "copying files from bucket $SRC_S3_BUCKET"
rclone copy "src:$SRC_S3_BUCKET" "$work/files" --fast-list --transfers 8 --checksum
files=$(find "$work/files" -type f | wc -l)

log "snapshot (database + $files files)"
cd "$work"
restic backup --host edusuite --tag nightly db files
restic forget --host edusuite --tag nightly --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
restic check --read-data-subset=1/50
rm -rf "$work"
log "done"

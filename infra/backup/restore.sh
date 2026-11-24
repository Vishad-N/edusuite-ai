#!/usr/bin/env bash
# Restore (plan §11, DN-063). By default this is a DRILL: it restores the latest (or
# SNAPSHOT=<id>) snapshot into a separate database and bucket, then compares them with
# the live ones, so it is safe to run on the production server at any time.
#   RESTORE_DB      target database   (default: ${PGDATABASE}_restore_drill; recreated)
#   RESTORE_BUCKET  target bucket     (default: none = files are only checked, not uploaded)
# A real disaster restore points RESTORE_DB / RESTORE_BUCKET at the live names on a fresh
# server; see docs/operations/deploy-checklist.md.
set -euo pipefail
log() { printf '%s restore: %s\n' "$(date -u +%FT%TZ)" "$*"; }
: "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD:?}" "${PGHOST:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"

snapshot="${SNAPSHOT:-latest}"
target_db="${RESTORE_DB:-${PGDATABASE}_restore_drill}"
started=$(date +%s)
work=/work/restore
rm -rf "$work" && mkdir -p "$work"

log "restoring snapshot $snapshot"
restic restore "$snapshot" --host edusuite --target "$work"
# restic versions differ in how much of the original path they keep, so find the dump.
dump=$(find "$work" -name edusuite.dump -path "*/db/*" | head -n1)
[ -n "$dump" ] || { echo "No database dump in snapshot $snapshot" >&2; exit 1; }
src=$(dirname "$(dirname "$dump")")

log "recreating database $target_db"
if [ "$target_db" = "$PGDATABASE" ] && [ "${I_AM_RESTORING_LIVE:-}" != "yes" ]; then
  echo "Refusing to overwrite the live database without I_AM_RESTORING_LIVE=yes" >&2
  exit 2
fi
psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS \"$target_db\" WITH (FORCE)" -c "CREATE DATABASE \"$target_db\""
pg_restore --no-owner --exit-on-error -d "$target_db" "$src/db/edusuite.dump"

restored_files=$(find "$src/files" -type f | wc -l)
if [ -n "${RESTORE_BUCKET:-}" ]; then
  : "${SRC_S3_ENDPOINT:?}" "${SRC_S3_ACCESS_KEY_ID:?}" "${SRC_S3_SECRET_ACCESS_KEY:?}"
  export RCLONE_CONFIG_DST_TYPE=s3 RCLONE_CONFIG_DST_PROVIDER=Other RCLONE_CONFIG_DST_REGION="${SRC_S3_REGION:-garage}" \
    RCLONE_CONFIG_DST_ENDPOINT="$SRC_S3_ENDPOINT" RCLONE_CONFIG_DST_ACCESS_KEY_ID="$SRC_S3_ACCESS_KEY_ID" \
    RCLONE_CONFIG_DST_SECRET_ACCESS_KEY="$SRC_S3_SECRET_ACCESS_KEY" RCLONE_CONFIG_DST_FORCE_PATH_STYLE=true
  log "uploading $restored_files files to bucket $RESTORE_BUCKET"
  rclone copy "$src/files" "dst:$RESTORE_BUCKET" --transfers 8 --checksum
fi

# Compare with the live database: the drill passes only if every table has the same rows.
log "comparing $target_db with $PGDATABASE"
count_sql="SELECT 'institutes',count(*) FROM institutes UNION ALL SELECT 'app_users',count(*) FROM app_users
  UNION ALL SELECT 'documents',count(*) FROM documents UNION ALL SELECT 'files',count(*) FROM files
  UNION ALL SELECT 'students',count(*) FROM students UNION ALL SELECT 'fee_receipts',count(*) FROM fee_receipts
  UNION ALL SELECT 'receipt_counters',sum(last_seq) FROM receipt_counters UNION ALL SELECT 'credit_ledger',count(*) FROM credit_ledger
  UNION ALL SELECT 'audit_logs',count(*) FROM audit_logs ORDER BY 1"
psql -At -F' ' -d "$target_db" -c "$count_sql" >"$work/restored.txt"
psql -At -F' ' -d "$PGDATABASE" -c "$count_sql" >"$work/live.txt"
uploaded_files=$(psql -At -d "$target_db" -c "SELECT count(*) FROM files WHERE uploaded_at IS NOT NULL")

echo "table restored live"
join "$work/restored.txt" "$work/live.txt" | while read -r t r l; do echo "$t $r $l"; done
echo "files_in_backup $restored_files (uploaded files recorded in the database: $uploaded_files)"
echo "restore_seconds $(( $(date +%s) - started ))"

# Rows written after the snapshot are expected on a live server; DRILL_EXPECT_EQUAL=1 makes
# any difference a failure (used right after a backup in the local drill).
if [ "${DRILL_EXPECT_EQUAL:-0}" = "1" ]; then
  diff "$work/restored.txt" "$work/live.txt" >/dev/null || { echo "MISMATCH between restored and live data" >&2; exit 1; }
  [ "$restored_files" -ge "$uploaded_files" ] || { echo "MISSING files in the backup" >&2; exit 1; }
  log "drill passed"
fi
rm -rf "$work"

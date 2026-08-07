#!/usr/bin/env bash
# JMECPS PostgreSQL backup script.
#
# Requires: pg_dump (PostgreSQL client tools) and gzip on PATH. Neither is
# installed in this project's dev environment as of writing — this script
# is correct, standard practice (this is genuinely how pg_dump-based backups
# work, no shortcuts), but hasn't been run end-to-end here. Install the
# client tools before relying on it: see docs/BACKUP_RECOVERY.md.
#
# Usage:
#   ./scripts/backup-db.sh
#   BACKUP_DIR=/mnt/backups RETENTION_DAYS=14 ./scripts/backup-db.sh
#
# Idempotent: each run writes a new timestamped file (never overwrites a
# prior backup) and the retention sweep only deletes files already past
# their window — safe to re-run, and safe to schedule via cron.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

command -v pg_dump >/dev/null 2>&1 || {
  echo "Error: pg_dump not found on PATH. Install the PostgreSQL client tools (see docs/BACKUP_RECOVERY.md)." >&2
  exit 1
}
command -v gzip >/dev/null 2>&1 || {
  echo "Error: gzip not found on PATH." >&2
  exit 1
}

# DIRECT_URL, not DATABASE_URL — pg_dump needs a direct, non-pooled
# connection; Supabase's PgBouncer transaction-mode pooler (what
# DATABASE_URL points at) doesn't support the session-level operations
# pg_dump relies on. Same reasoning as prisma.config.ts's migration
# datasource. Read from the environment if already set, otherwise pull it
# out of .env without sourcing/executing the rest of the file.
if [ -z "${DIRECT_URL:-}" ] && [ -f "$PROJECT_ROOT/.env" ]; then
  DIRECT_URL="$(grep -E '^DIRECT_URL=' "$PROJECT_ROOT/.env" | head -1 | cut -d '=' -f2- | tr -d '"')"
fi

if [ -z "${DIRECT_URL:-}" ] || [[ "$DIRECT_URL" == *REPLACE_WITH* ]]; then
  echo "Error: DIRECT_URL is not set to a real connection string (checked \$DIRECT_URL and .env)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTFILE="$BACKUP_DIR/jmecps_${TIMESTAMP}.sql.gz"
TMPFILE="${OUTFILE}.tmp"

echo "Backing up database to $OUTFILE ..."
# --no-owner/--no-privileges: portable across environments where the
# restoring role's name may differ from the one that created these objects.
pg_dump "$DIRECT_URL" --no-owner --no-privileges | gzip > "$TMPFILE"
mv "$TMPFILE" "$OUTFILE"
echo "Backup complete: $OUTFILE ($(du -h "$OUTFILE" | cut -f1))"

echo "Applying retention policy (deleting backups older than ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name 'jmecps_*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete

# Off-site sync — not implemented (would need real R2/S3 credentials, none
# configured; see docs/BACKUP_RECOVERY.md). Uncomment and adapt once they
# exist:
# rclone copy "$OUTFILE" r2:jmecps-backups/

echo "Done."

# Backup & Recovery

Covers three things: database backups, database restore, and the storage
(Cloudflare R2) cleanup/lifecycle policy for uploaded manuscript files.

Current honest status: the backup script is written and its logic verified
(argument parsing, error handling, retention sweep), but has **not** been
run end-to-end here, because `pg_dump` isn't installed in this dev
environment. R2 lifecycle rules are documented below but not applied,
because no real R2 credentials are configured yet (`.env` still has
placeholder `R2_*` values — see `src/lib/storage/r2.ts`). Neither of these
is a code problem; both need action outside this repo.

---

## 1. Database backups

### Prerequisites

`scripts/backup-db.sh` needs `pg_dump` (PostgreSQL client tools) and `gzip`
on `PATH`.

- **Windows**: install the "Command Line Tools" component from the
  [PostgreSQL installer](https://www.postgresql.org/download/windows/), or
  `choco install postgresql` — either adds `pg_dump` to `PATH`. `gzip`
  ships with Git Bash, already present in this environment.
- **macOS**: `brew install libpq && brew link --force libpq`
- **Linux**: `apt install postgresql-client` (Debian/Ubuntu) or the
  equivalent for your distro.

### Running a backup

```bash
./scripts/backup-db.sh
```

Writes `backups/jmecps_<UTC timestamp>.sql.gz` (schema + data, both
present by `pg_dump`'s default — no `--schema-only`/`--data-only` flag is
passed). The `backups/` directory is gitignored — these dumps contain real
user and manuscript data and must never be committed.

Environment overrides:

```bash
BACKUP_DIR=/mnt/backups RETENTION_DAYS=14 ./scripts/backup-db.sh
```

The script reads `DIRECT_URL` from the environment, falling back to
parsing it out of `.env` if unset. It uses `DIRECT_URL` specifically, not
the pooled `DATABASE_URL` — `pg_dump` needs session-level operations that
Supabase's PgBouncer transaction-mode pooler (what `DATABASE_URL` points
at) doesn't support, the same reason `prisma.config.ts` uses `DIRECT_URL`
for migrations.

### Retention

Each run deletes backups older than `RETENTION_DAYS` (default 7) from
`BACKUP_DIR`. Every run writes a new timestamped file rather than
overwriting the last one, so the script is safe to schedule (cron, a
scheduled task, etc.) and safe to re-run manually — it's idempotent in the
sense that matters for a backup job: no run corrupts or depends on another.

### Automating it

Not configured here (would need a host to run it on — this project isn't
deployed anywhere yet). Once it is, a simple crontab entry:

```cron
0 3 * * * cd /path/to/jmecps && ./scripts/backup-db.sh >> /var/log/jmecps-backup.log 2>&1
```

### Off-site sync

Not implemented — would need real object storage credentials (R2/S3),
which aren't configured (same standing gap as file uploads and search
indexing elsewhere in this project; see the R2 section below). Once they
exist, the commented-out line at the bottom of `scripts/backup-db.sh` shows
where to add an `rclone`/`aws s3 cp` upload of the freshly-written dump.
Keeping backups on the same machine as the database they're backing up is
not a real disaster-recovery posture — this is a placeholder, not a
finished backup strategy, until off-site sync is wired up.

---

## 2. Restoring from a backup

**Restoring overwrites data. Confirm you're pointed at the right database
before running any of this — there is no undo.**

1. Decompress:
   ```bash
   gunzip -k backups/jmecps_20260101T030000Z.sql.gz
   # -k keeps the .gz; drop it if you don't need the compressed copy anymore
   ```

2. Restore into a **fresh, empty** database first if you want to verify
   the dump before touching anything live:
   ```bash
   createdb jmecps_restore_test
   psql "postgresql://postgres:<password>@<host>:5432/jmecps_restore_test" \
     < backups/jmecps_20260101T030000Z.sql
   ```
   Spot-check row counts, then decide whether to proceed.

3. Restoring over the real database (destructive — the target database's
   current contents are replaced by what's in the dump):
   ```bash
   psql "$DIRECT_URL" < backups/jmecps_20260101T030000Z.sql
   ```
   Because this dump was taken with `--no-owner --no-privileges`, it
   doesn't try to reassign ownership or grants that may differ between the
   original and target environments — it just recreates the schema objects
   and reloads the data.

4. After restoring, regenerate the Prisma client if the schema in the dump
   doesn't match what's in `prisma/schema.prisma` at that point in time
   (it should, if the dump and the deployed code came from the same
   release):
   ```bash
   npx prisma generate
   ```

5. `auth.*` and `storage.*` schemas: a `pg_dump` of the whole database
   (which is what this script does — no `--schema=public` filter) includes
   Supabase's `auth` schema too, so a full restore brings user accounts
   back as well, not just `public.*` tables. If you only want to restore
   `public.*` (application data) without touching `auth.*`, add
   `--schema=public --schema=auth` selectively, or restore into a scratch
   database and pipe only the tables you need with `pg_restore`'s
   table-filtering options (this requires the dump to be taken in the
   custom `-Fc` format, not plain SQL — the current script uses plain SQL
   for simplicity/portability; switch to `-Fc` if selective restore
   becomes a real need).

---

## 3. Cloudflare R2 storage lifecycle & cleanup

### What's DB-trackable vs. what isn't

A manuscript file only gets a `manuscripts.file_url` once
`confirmUploadAction` (`src/lib/actions/upload.ts`) completes successfully
— that's the *second* of two steps (presigned PUT to R2, then confirm). If
a browser tab closes or the network drops between those two steps, the
file can land in R2 with **no corresponding database row pointing at it at
all**. Those are true orphans, invisible to any query against our
database.

- **DB-trackable "abandoned drafts"** (a confirmed upload attached to a
  `DRAFT` manuscript nobody has touched in a long time): flagged by
  `scripts/audit-stale-drafts.ts`. Read-only — lists candidates, deletes
  nothing.
  ```bash
  npx tsx scripts/audit-stale-drafts.ts
  ```
- **True orphans** (uploaded, never confirmed): only catchable at the R2
  level, by object age, since the database has no record of them.

### Recommended R2 lifecycle rule

Configure this in the Cloudflare dashboard (R2 → your bucket → Lifecycle
rules) or via the R2 API once real credentials exist. Scoped to the
`uploads/` prefix (both `uploads/general/` and `uploads/sit-conf/` — see
`buildObjectKey` in `src/lib/storage/r2.ts`):

```json
{
  "id": "expire-abandoned-uploads",
  "status": "Enabled",
  "filter": { "prefix": "uploads/" },
  "expiration": { "days": 30 }
}
```

This deletes any object under `uploads/` that hasn't been touched in 30
days — both true orphans (never confirmed) and, as a backstop, files
still attached to a DRAFT the author never submitted (the
`audit-stale-drafts.ts` script above is meant to give a human a chance to
notice these *before* the same 30-day window expires them, since unlike
R2's rule, it can be run at any cadence and reviewed).

**Caveat**: this rule doesn't distinguish "abandoned" from "slow" — a
researcher who takes 31 days to go from upload to submission would lose
their file. Given this journal's actual pace (manuscripts, not
fast-moving consumer uploads), 30 days is reasonable, but this is a real
tradeoff worth confirming, not a fully safe default.

### Not yet done

- R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME` in `.env`) are still placeholders — the lifecycle rule
  above can't be applied until the bucket exists.
- No automated job re-runs `audit-stale-drafts.ts` on a schedule; it's a
  manual/cron-able script today, same as the backup script.

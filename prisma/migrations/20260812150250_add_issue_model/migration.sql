-- Phase 6.4: real Volume/Issue data model backing the public archive.
--
-- Hand-written rather than generated via `prisma migrate dev`: this repo's
-- migration history has a pre-existing checksum mismatch on
-- 20260812033822_add_publication_fee_settings (that migration file was
-- manually rewritten during Phase 3's incident recovery, after Prisma had
-- already recorded a checksum for it via `migrate resolve --applied`).
-- `migrate dev`'s shadow-database drift detection refuses to proceed past
-- that mismatch without first running `prisma migrate reset`, which would
-- drop the entire database — not something to do to reach an unrelated,
-- purely additive change. This file was written by hand, applied directly,
-- then marked resolved via `prisma migrate resolve --applied`, mirroring
-- exactly how that earlier incident was itself recovered.
--
-- Purely additive: one new table, one new nullable column + FK + index on
-- an existing table. Does not touch manuscripts_search_vector_idx,
-- manuscripts_title_trgm_idx, manuscripts_institution_trgm_idx, or any
-- other existing column/index/constraint. Verified against pg_indexes both
-- before and after applying.

CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "volume_number" INTEGER NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "issues_volume_number_issue_number_key" ON "issues"("volume_number", "issue_number");

ALTER TABLE "manuscripts" ADD COLUMN "issue_id" UUID;

CREATE INDEX "manuscripts_issue_id_idx" ON "manuscripts"("issue_id");

ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

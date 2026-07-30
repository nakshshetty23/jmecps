-- CreateEnum
CREATE TYPE "EditorialDecision" AS ENUM ('APPROVED', 'REJECTED', 'REVISION_REQUIRED');

-- AlterTable
ALTER TABLE "manuscripts" ADD COLUMN     "review_lock_at" TIMESTAMP(3),
ADD COLUMN     "review_lock_by" UUID;

-- CreateTable
CREATE TABLE "editorial_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manuscript_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "author_notes" TEXT NOT NULL DEFAULT '',
    "rubric_scores" JSONB NOT NULL DEFAULT '{}',
    "decision" "EditorialDecision",
    "revision_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorial_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "editorial_reviews_manuscript_id_idx" ON "editorial_reviews"("manuscript_id");

-- AddForeignKey
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_manuscript_id_fkey" FOREIGN KEY ("manuscript_id") REFERENCES "manuscripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

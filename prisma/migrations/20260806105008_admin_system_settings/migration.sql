-- CreateTable
CREATE TABLE "category_settings" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "category_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "journal_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "journal_title" TEXT NOT NULL DEFAULT 'Journal of Mechanical, Electronics and Cyber Physical Systems',
    "issn" TEXT NOT NULL DEFAULT '',
    "contact_email" TEXT NOT NULL DEFAULT '',
    "publisher_name" TEXT NOT NULL DEFAULT '',
    "abstract_word_limit" INTEGER NOT NULL DEFAULT 300,
    "stale_review_threshold_days" INTEGER NOT NULL DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_user_id" UUID NOT NULL,
    "previous_role" "UserRole" NOT NULL,
    "new_role" "UserRole" NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_audit_log_target_user_id_idx" ON "user_role_audit_log"("target_user_id");

-- Seed the 7 existing categories from src/lib/validations/submission.ts as enabled by default.
INSERT INTO "category_settings" ("key", "enabled") VALUES
  ('MECHANICAL_ENGINEERING', true),
  ('ELECTRONICS_ENGINEERING', true),
  ('CYBER_PHYSICAL_SYSTEMS', true),
  ('ROBOTICS_AUTOMATION', true),
  ('INDUSTRIAL_ENGINEERING', true),
  ('SMART_MANUFACTURING', true),
  ('OTHER', true)
ON CONFLICT DO NOTHING;

-- Seed the singleton journal settings row with current hardcoded defaults
-- (WORD_LIMIT from SubmissionForm.tsx, UNASSIGNED_ALERT_THRESHOLD_DAYS from editorial.ts).
INSERT INTO "journal_settings" ("id", "abstract_word_limit", "stale_review_threshold_days", "updated_at")
VALUES ('singleton', 300, 5, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

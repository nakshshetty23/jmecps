-- RenameEnumValue
ALTER TYPE "ManuscriptStatus" RENAME VALUE 'REVISION_REQUESTED' TO 'REVISION_REQUIRED';

-- AlterEnum
ALTER TYPE "ManuscriptStatus" ADD VALUE 'WITHDRAWN';

-- CreateTable
CREATE TABLE "manuscript_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manuscript_id" UUID NOT NULL,
    "from_state" "ManuscriptStatus" NOT NULL,
    "to_state" "ManuscriptStatus" NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manuscript_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manuscript_audit_log_manuscript_id_idx" ON "manuscript_audit_log"("manuscript_id");

-- AddForeignKey
ALTER TABLE "manuscript_audit_log" ADD CONSTRAINT "manuscript_audit_log_manuscript_id_fkey" FOREIGN KEY ("manuscript_id") REFERENCES "manuscripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manuscript_audit_log" ADD CONSTRAINT "manuscript_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "manuscripts" ADD COLUMN     "assigned_editor_id" UUID;

-- AddForeignKey
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_assigned_editor_id_fkey" FOREIGN KEY ("assigned_editor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

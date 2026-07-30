-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VISITOR', 'RESEARCHER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ManuscriptStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'RESUBMITTED', 'APPROVED', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutional_affiliation" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manuscripts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "keywords" TEXT[],
    "primary_author_id" UUID NOT NULL,
    "co_authors" JSONB NOT NULL,
    "institution" TEXT NOT NULL,
    "subject_category" TEXT NOT NULL,
    "references" JSONB NOT NULL,
    "file_url" TEXT,
    "file_hash" TEXT,
    "sit_conference_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" "ManuscriptStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manuscripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_ref" TEXT NOT NULL,
    "manuscript_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "gateway_log" JSONB NOT NULL,
    "invoice_url" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "manuscripts_file_hash_idx" ON "manuscripts"("file_hash");

-- CreateIndex
CREATE INDEX "manuscripts_status_idx" ON "manuscripts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_ref_key" ON "payments"("transaction_ref");

-- CreateIndex
CREATE INDEX "payments_transaction_ref_idx" ON "payments"("transaction_ref");

-- AddForeignKey
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_primary_author_id_fkey" FOREIGN KEY ("primary_author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_manuscript_id_fkey" FOREIGN KEY ("manuscript_id") REFERENCES "manuscripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

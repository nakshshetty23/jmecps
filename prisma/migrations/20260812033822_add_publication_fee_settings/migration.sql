-- AlterTable
-- Prisma's auto-generated diff for this migration also proposed dropping
-- manuscripts_search_vector_idx/manuscripts_title_trgm_idx/
-- manuscripts_institution_trgm_idx and altering the search_vector generated
-- column (a known Prisma limitation: it doesn't understand generated
-- columns/expression indexes created via raw SQL, see the trigram/search
-- migrations). Those statements have been removed from this file — they
-- were never an intended change, only Prisma's diff engine misreading
-- schema drift it doesn't have full context for. Only the actual intended
-- change (the two new JournalSettings columns) is applied here.
ALTER TABLE "journal_settings" ADD COLUMN     "publication_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "publication_fee_currency" TEXT NOT NULL DEFAULT 'INR';

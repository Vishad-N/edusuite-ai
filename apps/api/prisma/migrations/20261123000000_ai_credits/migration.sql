-- AI credits (DN-053): operator role, per-institute balance, ledger and price overrides.
-- Generated with `prisma migrate diff`; the CHECK constraints at the end are hand-written.

-- CreateEnum
CREATE TYPE "CreditKind" AS ENUM ('grant', 'adjust', 'job_charge', 'job_refund');

-- CreateEnum
CREATE TYPE "CreditUnit" AS ENUM ('job', 'item');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'platform_admin';

-- AlterEnum
ALTER TYPE "AiJobType" ADD VALUE 'deck_quiz';

-- AlterTable
ALTER TABLE "institutes" ADD COLUMN     "credit_balance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ai_jobs" ADD COLUMN     "credits_charged" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" UUID NOT NULL,
    "institute_id" UUID NOT NULL,
    "kind" "CreditKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "note" TEXT,
    "ai_job_id" UUID,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credit_prices" (
    "job_type" "AiJobType" NOT NULL,
    "credits" INTEGER NOT NULL,
    "unit" "CreditUnit" NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_credit_prices_pkey" PRIMARY KEY ("job_type")
);

-- CreateIndex
CREATE INDEX "credit_ledger_institute_id_created_at_idx" ON "credit_ledger"("institute_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_ai_job_id_kind_key" ON "credit_ledger"("ai_job_id", "kind");

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_ai_job_id_fkey" FOREIGN KEY ("ai_job_id") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_credit_prices" ADD CONSTRAINT "ai_credit_prices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Balances and charges can never go below zero, whatever code path writes them.
ALTER TABLE "institutes" ADD CONSTRAINT "institutes_credit_balance_nonnegative" CHECK ("credit_balance" >= 0);
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_balance_after_nonnegative" CHECK ("balance_after" >= 0);
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_delta_nonzero" CHECK ("delta" <> 0);
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_credits_charged_nonnegative" CHECK ("credits_charged" >= 0);
ALTER TABLE "ai_credit_prices" ADD CONSTRAINT "ai_credit_prices_credits_nonnegative" CHECK ("credits" >= 0);

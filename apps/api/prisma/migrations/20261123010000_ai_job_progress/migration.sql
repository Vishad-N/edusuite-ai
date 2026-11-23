-- AI job progress, result and error code (DN-054).

-- AlterTable
ALTER TABLE "ai_jobs" ADD COLUMN     "error_code" TEXT,
ADD COLUMN     "fixture" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "progress_done" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "result" JSONB;


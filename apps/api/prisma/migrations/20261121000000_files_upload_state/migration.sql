-- AlterTable
ALTER TABLE "files" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'file',
ADD COLUMN     "uploaded_at" TIMESTAMPTZ;

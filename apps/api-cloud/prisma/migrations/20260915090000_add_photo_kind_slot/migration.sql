-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'composite',
ADD COLUMN     "slot_index" INTEGER;
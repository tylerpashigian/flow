/*
  Warnings:

  - Added the required column `updatedAt` to the `task_assignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "resource" ADD COLUMN     "capacityPercent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "workdayEndMinuteLocal" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "workdayStartMinuteLocal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "task" ADD COLUMN     "estimatedEffortDays" INTEGER;

-- AlterTable
ALTER TABLE "task_assignment" ADD COLUMN     "progressPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

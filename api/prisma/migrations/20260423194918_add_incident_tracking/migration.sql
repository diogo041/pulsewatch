/*
  Warnings:

  - You are about to drop the column `endedAt` on the `Incident` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Incident` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Incident_monitorId_startedAt_idx";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "endedAt",
DROP COLUMN "reason",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastErrorMessage" TEXT,
ADD COLUMN     "lastStatusCode" INTEGER,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "startedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Monitor" ALTER COLUMN "intervalSecs" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Incident_monitorId_status_idx" ON "Incident"("monitorId", "status");

-- CreateIndex
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");

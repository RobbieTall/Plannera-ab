-- CreateEnum
CREATE TYPE "LgaCoverageMaturity" AS ENUM ('NOT_STARTED', 'QUEUED', 'PROCESSING', 'SEARCHABLE_READY', 'STRUCTURED_PARTIAL', 'VERIFIED');

-- CreateEnum
CREATE TYPE "LgaPreparationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "LgaCoverageState" (
    "id" TEXT NOT NULL,
    "lgaCode" TEXT NOT NULL,
    "state" "LgaCoverageMaturity" NOT NULL DEFAULT 'NOT_STARTED',
    "activePreparationId" TEXT,
    "lastPreparedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LgaCoverageState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LgaPreparationJob" (
    "id" TEXT NOT NULL,
    "lgaCode" TEXT NOT NULL,
    "status" "LgaPreparationStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedByProjectId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LgaPreparationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LgaCoverageState_lgaCode_key" ON "LgaCoverageState"("lgaCode");

-- CreateIndex
CREATE INDEX "LgaCoverageState_state_idx" ON "LgaCoverageState"("state");

-- CreateIndex
CREATE UNIQUE INDEX "LgaPreparationJob_dedupeKey_key" ON "LgaPreparationJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "LgaPreparationJob_lgaCode_status_idx" ON "LgaPreparationJob"("lgaCode", "status");

-- AddForeignKey
ALTER TABLE "LgaPreparationJob" ADD CONSTRAINT "LgaPreparationJob_lgaCode_fkey" FOREIGN KEY ("lgaCode") REFERENCES "LgaCoverageState"("lgaCode") ON DELETE CASCADE ON UPDATE CASCADE;

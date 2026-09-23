-- CreateTable
CREATE TABLE "ConsultantReturnedReportBinding" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "referralScopeKey" TEXT NOT NULL,
    "packageDigest" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "evidencePackageBoundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantReturnedReportBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantReturnedReportBinding_evidenceRef_key"
ON "ConsultantReturnedReportBinding"("evidenceRef");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantReturnedReportBinding_referralId_evidenceRef_key"
ON "ConsultantReturnedReportBinding"("referralId", "evidenceRef");

-- CreateIndex
CREATE INDEX "ConsultantReturnedReportBinding_projectId_createdAt_idx"
ON "ConsultantReturnedReportBinding"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultantReturnedReportBinding_referralId_createdAt_idx"
ON "ConsultantReturnedReportBinding"("referralId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConsultantReturnedReportBinding"
ADD CONSTRAINT "ConsultantReturnedReportBinding_referralId_fkey"
FOREIGN KEY ("referralId") REFERENCES "ConsultantReferral"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReturnedReportBinding"
ADD CONSTRAINT "ConsultantReturnedReportBinding_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

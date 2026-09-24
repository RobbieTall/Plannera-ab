-- CreateEnum
CREATE TYPE "EvidenceOcrStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'REVIEW_REQUIRED',
  'FAILED',
  'REJECTED',
  'PROMOTED'
);

-- CreateTable
CREATE TABLE "WorkspaceUploadOcrAttempt" (
  "id" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "sourceContentHash" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "providerKey" TEXT NOT NULL,
  "status" "EvidenceOcrStatus" NOT NULL DEFAULT 'QUEUED',
  "resultText" TEXT,
  "resultSegments" JSONB,
  "resultContentHash" TEXT,
  "pageCount" INTEGER,
  "errorCode" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewerRef" TEXT,
  "reviewNote" TEXT,
  "promotedAt" TIMESTAMP(3),
  "requestHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkspaceUploadOcrAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUploadOcrAttempt_requestHash_key"
ON "WorkspaceUploadOcrAttempt"("requestHash");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUploadOcrAttempt_upload_attempt_key"
ON "WorkspaceUploadOcrAttempt"("uploadId", "attempt");

-- CreateIndex
CREATE INDEX "WorkspaceUploadOcrAttempt_upload_status_idx"
ON "WorkspaceUploadOcrAttempt"("uploadId", "status");

-- AddForeignKey
ALTER TABLE "WorkspaceUploadOcrAttempt"
ADD CONSTRAINT "WorkspaceUploadOcrAttempt_uploadId_fkey"
FOREIGN KEY ("uploadId") REFERENCES "WorkspaceUpload"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

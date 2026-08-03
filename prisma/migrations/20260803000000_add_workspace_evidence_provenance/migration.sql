CREATE TYPE "EvidenceReadabilityStatus" AS ENUM (
  'READY',
  'PARTIALLY_READABLE',
  'IMAGE_ONLY',
  'NEEDS_REVIEW'
);

CREATE TYPE "EvidenceIndexingStatus" AS ENUM (
  'READY',
  'PENDING',
  'FAILED',
  'NOT_APPLICABLE'
);

ALTER TABLE "WorkspaceUpload"
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "extractionMethod" TEXT,
  ADD COLUMN "extractionMetadata" JSONB,
  ADD COLUMN "extractedAt" TIMESTAMP(3),
  ADD COLUMN "pageCount" INTEGER,
  ADD COLUMN "evidenceStatus" "EvidenceReadabilityStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "indexingStatus" "EvidenceIndexingStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "indexedAt" TIMESTAMP(3),
  ADD COLUMN "indexingError" TEXT;

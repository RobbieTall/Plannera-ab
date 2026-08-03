CREATE TYPE "EvidenceApplicabilityStatus" AS ENUM (
  'PENDING_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'CONFLICT',
  'SUPERSEDED'
);

CREATE TYPE "EvidenceApplicabilityDecision" AS ENUM (
  'ACCEPT',
  'REJECT',
  'MARK_CONFLICT',
  'SUPERSEDE'
);

ALTER TABLE "WorkspaceUpload"
  ADD COLUMN "applicabilityStatus" "EvidenceApplicabilityStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN "applicabilityArtefactId" TEXT,
  ADD COLUMN "acceptedSiteFingerprint" TEXT,
  ADD COLUMN "acceptedProposalFingerprint" TEXT,
  ADD COLUMN "applicabilityTopics" JSONB,
  ADD COLUMN "sourceDocumentDate" TIMESTAMP(3),
  ADD COLUMN "validUntil" TIMESTAMP(3),
  ADD COLUMN "applicabilityReviewedAt" TIMESTAMP(3),
  ADD COLUMN "applicabilityReviewedById" TEXT,
  ADD COLUMN "applicabilityReviewNote" TEXT,
  ADD COLUMN "applicabilityVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "EvidenceApplicabilityReviewEvent" (
  "id" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "decision" "EvidenceApplicabilityDecision" NOT NULL,
  "previousStatus" "EvidenceApplicabilityStatus" NOT NULL,
  "resultingStatus" "EvidenceApplicabilityStatus" NOT NULL,
  "detailedPlanningPackId" TEXT,
  "siteFingerprint" TEXT,
  "proposalFingerprint" TEXT,
  "topics" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "sourceDocumentDate" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceApplicabilityReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceUpload_applicabilityStatus_idx" ON "WorkspaceUpload"("applicabilityStatus");
CREATE INDEX "WorkspaceUpload_applicabilityArtefactId_idx" ON "WorkspaceUpload"("applicabilityArtefactId");
CREATE UNIQUE INDEX "WorkspaceUpload_id_applicabilityVersion_key" ON "WorkspaceUpload"("id", "applicabilityVersion");
CREATE INDEX "EvidenceApplicabilityReviewEvent_uploadId_idx" ON "EvidenceApplicabilityReviewEvent"("uploadId");
CREATE INDEX "EvidenceApplicabilityReviewEvent_actorUserId_idx" ON "EvidenceApplicabilityReviewEvent"("actorUserId");

ALTER TABLE "WorkspaceUpload"
  ADD CONSTRAINT "WorkspaceUpload_applicabilityArtefactId_fkey" FOREIGN KEY ("applicabilityArtefactId") REFERENCES "Artefact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "WorkspaceUpload_applicabilityReviewedById_fkey" FOREIGN KEY ("applicabilityReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceApplicabilityReviewEvent"
  ADD CONSTRAINT "EvidenceApplicabilityReviewEvent_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "WorkspaceUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EvidenceApplicabilityReviewEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

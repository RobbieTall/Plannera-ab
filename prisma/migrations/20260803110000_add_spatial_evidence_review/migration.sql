CREATE TYPE "SpatialSourceAuthority" AS ENUM (
  'NSW_GOVERNMENT',
  'COUNCIL',
  'CONSULTANT',
  'SURVEYOR',
  'USER_PROVIDED',
  'OTHER'
);

CREATE TYPE "SpatialLegendStatus" AS ENUM (
  'CAPTURED',
  'SOURCE_LINKED',
  'NOT_AVAILABLE',
  'NOT_APPLICABLE'
);

CREATE TYPE "SpatialEvidenceStatus" AS ENUM (
  'PENDING_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'CONFLICT',
  'SUPERSEDED'
);

CREATE TYPE "SpatialEvidenceReviewDecision" AS ENUM (
  'ACCEPT',
  'REJECT',
  'MARK_CONFLICT',
  'SUPERSEDE'
);

CREATE TABLE "SpatialEvidence" (
  "id" TEXT NOT NULL,
  "artefactId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceAuthority" "SpatialSourceAuthority" NOT NULL,
  "contentHash" TEXT NOT NULL,
  "siteFingerprint" TEXT NOT NULL,
  "siteAddress" TEXT NOT NULL,
  "parcelId" TEXT,
  "lot" TEXT,
  "planNumber" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "layers" TEXT[] NOT NULL,
  "legendStatus" "SpatialLegendStatus" NOT NULL,
  "legendNotes" TEXT,
  "observation" TEXT NOT NULL,
  "limitation" TEXT NOT NULL,
  "observationConfirmedAt" TIMESTAMP(3) NOT NULL,
  "sourceEffectiveAt" TIMESTAMP(3),
  "sourceCheckedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "SpatialEvidenceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpatialEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpatialEvidenceReviewEvent" (
  "id" TEXT NOT NULL,
  "spatialEvidenceId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "decision" "SpatialEvidenceReviewDecision" NOT NULL,
  "previousStatus" "SpatialEvidenceStatus" NOT NULL,
  "resultingStatus" "SpatialEvidenceStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpatialEvidenceReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpatialEvidence_artefactId_key" ON "SpatialEvidence"("artefactId");
CREATE UNIQUE INDEX "SpatialEvidence_id_version_key" ON "SpatialEvidence"("id", "version");
CREATE INDEX "SpatialEvidence_projectId_idx" ON "SpatialEvidence"("projectId");
CREATE INDEX "SpatialEvidence_siteFingerprint_idx" ON "SpatialEvidence"("siteFingerprint");
CREATE INDEX "SpatialEvidence_status_idx" ON "SpatialEvidence"("status");
CREATE INDEX "SpatialEvidence_expiresAt_idx" ON "SpatialEvidence"("expiresAt");
CREATE INDEX "SpatialEvidenceReviewEvent_spatialEvidenceId_idx" ON "SpatialEvidenceReviewEvent"("spatialEvidenceId");
CREATE INDEX "SpatialEvidenceReviewEvent_actorUserId_idx" ON "SpatialEvidenceReviewEvent"("actorUserId");

ALTER TABLE "SpatialEvidence"
  ADD CONSTRAINT "SpatialEvidence_artefactId_fkey" FOREIGN KEY ("artefactId") REFERENCES "Artefact"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SpatialEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SpatialEvidence_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SpatialEvidenceReviewEvent"
  ADD CONSTRAINT "SpatialEvidenceReviewEvent_spatialEvidenceId_fkey" FOREIGN KEY ("spatialEvidenceId") REFERENCES "SpatialEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SpatialEvidenceReviewEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Item 74H protected Preview persistence.
-- Additive and replay-safe: no existing table, column, row, price, credit, or checkout setting is changed.
-- This migration is executed by the exact-branch Preview runner because the legacy Prisma
-- migration ledger is incomplete. General Vercel migrations remain disabled.

BEGIN;

CREATE TABLE IF NOT EXISTS "SiteSpatialProvenance" (
    "id" TEXT NOT NULL,
    "siteContextId" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "contentHash" TEXT NOT NULL,
    "matchMethod" TEXT NOT NULL,
    "parcelId" TEXT,
    "lot" TEXT,
    "planNumber" TEXT,
    "lgaCode" TEXT NOT NULL,
    "zoneCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "trustLevel" TEXT NOT NULL,
    "staleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSpatialProvenance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SiteSpatialProvenance_trustLevel_check"
      CHECK ("trustLevel" IN ('SITE_CONFIRMED', 'EVIDENCE_VERIFIED', 'OPERATOR_APPROVED')),
    CONSTRAINT "SiteSpatialProvenance_siteContextId_fkey"
      FOREIGN KEY ("siteContextId") REFERENCES "SiteContext"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PathwayDefinition" (
    "id" TEXT NOT NULL,
    "versionKey" TEXT NOT NULL,
    "lgaCode" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "proposalType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "graphHash" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayDefinition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayDefinition_status_check"
      CHECK ("status" IN ('DRAFT', 'ACTIVE', 'RETIRED'))
);

CREATE TABLE IF NOT EXISTS "PathwayAssessment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "siteContextId" TEXT NOT NULL,
    "spatialProvenanceId" TEXT NOT NULL,
    "pathwayDefinitionId" TEXT NOT NULL,
    "supersedesAssessmentId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'PREVIEW',
    "assessmentVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "evidenceDigest" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "trustLevel" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staleAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayAssessment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayAssessment_environment_check"
      CHECK ("environment" = 'PREVIEW'),
    CONSTRAINT "PathwayAssessment_decision_check"
      CHECK ("decision" IN ('STOP', 'PROCEED', 'MERIT_ASSESSMENT', 'MORE_EVIDENCE_REQUIRED')),
    CONSTRAINT "PathwayAssessment_trustLevel_check"
      CHECK ("trustLevel" IN ('GENERAL_GUIDANCE', 'SITE_CONFIRMED', 'EVIDENCE_VERIFIED', 'OPERATOR_APPROVED', 'SUBMISSION_READY')),
    CONSTRAINT "PathwayAssessment_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayAssessment_siteContextId_fkey"
      FOREIGN KEY ("siteContextId") REFERENCES "SiteContext"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayAssessment_spatialProvenanceId_fkey"
      FOREIGN KEY ("spatialProvenanceId") REFERENCES "SiteSpatialProvenance"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayAssessment_pathwayDefinitionId_fkey"
      FOREIGN KEY ("pathwayDefinitionId") REFERENCES "PathwayDefinition"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayAssessment_supersedesAssessmentId_fkey"
      FOREIGN KEY ("supersedesAssessmentId") REFERENCES "PathwayAssessment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PathwayEvidenceSnapshot" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "clauseId" TEXT,
    "dcpClauseId" TEXT,
    "workspaceUploadId" TEXT,
    "evidenceKind" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "citation" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "isCurrentAtAssessment" BOOLEAN NOT NULL,
    "staleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayEvidenceSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayEvidenceSnapshot_evidenceKind_check"
      CHECK ("evidenceKind" IN ('LEP', 'DCP', 'SPATIAL', 'UPLOAD', 'OPERATOR_NOTE')),
    CONSTRAINT "PathwayEvidenceSnapshot_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "PathwayAssessment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PathwayEvidenceSnapshot_clauseId_fkey"
      FOREIGN KEY ("clauseId") REFERENCES "Clause"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayEvidenceSnapshot_dcpClauseId_fkey"
      FOREIGN KEY ("dcpClauseId") REFERENCES "DCPClause"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayEvidenceSnapshot_workspaceUploadId_fkey"
      FOREIGN KEY ("workspaceUploadId") REFERENCES "WorkspaceUpload"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PathwayControlSnapshot" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "evidenceSnapshotId" TEXT NOT NULL,
    "controlKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "applicabilityHash" TEXT NOT NULL,
    "operator" TEXT,
    "numericValue" DECIMAL(18,6),
    "lowerBound" DECIMAL(18,6),
    "upperBound" DECIMAL(18,6),
    "textValue" TEXT,
    "unit" TEXT,
    "landAreaMinSqm" DECIMAL(18,3),
    "landAreaMaxSqm" DECIMAL(18,3),
    "applicability" JSONB NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "isCurrentAtAssessment" BOOLEAN NOT NULL,
    "staleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayControlSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayControlSnapshot_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "PathwayAssessment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PathwayControlSnapshot_evidenceSnapshotId_fkey"
      FOREIGN KEY ("evidenceSnapshotId") REFERENCES "PathwayEvidenceSnapshot"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PathwayGateSnapshot" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "gateKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "evidenceRefs" JSONB NOT NULL,
    "controlRefs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayGateSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayGateSnapshot_outcome_check"
      CHECK ("outcome" IN ('STOP', 'PROCEED', 'MERIT_ASSESSMENT', 'MORE_EVIDENCE_REQUIRED')),
    CONSTRAINT "PathwayGateSnapshot_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "PathwayAssessment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PathwayArtefactBinding" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "artefactId" TEXT NOT NULL,
    "commercialStage" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "evidenceDigest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayArtefactBinding_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayArtefactBinding_stage_check"
      CHECK ("commercialStage" IN ('FREE_PATHWAY_CHECK', 'PLANNING_CONTROLS_PACK', 'SUBMISSION_SEE')),
    CONSTRAINT "PathwayArtefactBinding_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "PathwayAssessment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayArtefactBinding_artefactId_fkey"
      FOREIGN KEY ("artefactId") REFERENCES "Artefact"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteSpatialProvenance_siteContextId_contentHash_key"
  ON "SiteSpatialProvenance"("siteContextId", "contentHash");
CREATE INDEX IF NOT EXISTS "SiteSpatialProvenance_siteContextId_idx"
  ON "SiteSpatialProvenance"("siteContextId");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayDefinition_versionKey_key"
  ON "PathwayDefinition"("versionKey");
CREATE INDEX IF NOT EXISTS "PathwayDefinition_lookup_idx"
  ON "PathwayDefinition"("lgaCode", "zoneCode", "proposalType", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayAssessment_idempotencyKey_key"
  ON "PathwayAssessment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "PathwayAssessment_project_current_idx"
  ON "PathwayAssessment"("projectId", "isCurrent");
CREATE INDEX IF NOT EXISTS "PathwayAssessment_siteContextId_idx"
  ON "PathwayAssessment"("siteContextId");
CREATE INDEX IF NOT EXISTS "PathwayAssessment_scopeKey_idx"
  ON "PathwayAssessment"("scopeKey");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayEvidenceSnapshot_assessment_kind_hash_key"
  ON "PathwayEvidenceSnapshot"("assessmentId", "evidenceKind", "contentHash");
CREATE INDEX IF NOT EXISTS "PathwayEvidenceSnapshot_assessmentId_idx"
  ON "PathwayEvidenceSnapshot"("assessmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayControlSnapshot_assessment_control_applicability_key"
  ON "PathwayControlSnapshot"("assessmentId", "controlKey", "applicabilityHash");
CREATE INDEX IF NOT EXISTS "PathwayControlSnapshot_assessmentId_idx"
  ON "PathwayControlSnapshot"("assessmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayGateSnapshot_assessment_gate_key"
  ON "PathwayGateSnapshot"("assessmentId", "gateKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayGateSnapshot_assessment_sequence_key"
  ON "PathwayGateSnapshot"("assessmentId", "sequence");
CREATE INDEX IF NOT EXISTS "PathwayGateSnapshot_assessmentId_idx"
  ON "PathwayGateSnapshot"("assessmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayArtefactBinding_artefactId_key"
  ON "PathwayArtefactBinding"("artefactId");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayArtefactBinding_assessment_stage_key"
  ON "PathwayArtefactBinding"("assessmentId", "commercialStage");
CREATE INDEX IF NOT EXISTS "PathwayArtefactBinding_assessmentId_idx"
  ON "PathwayArtefactBinding"("assessmentId");

COMMIT;

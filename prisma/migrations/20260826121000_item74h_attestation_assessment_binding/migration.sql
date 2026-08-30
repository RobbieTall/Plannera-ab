-- Item 74H protected Preview proposal-to-assessment binding.
-- Additive and replay-safe. This table records scope identity without promoting
-- user attestations into authoritative planning evidence.

BEGIN;

CREATE TABLE IF NOT EXISTS "PathwayAssessmentProposalAttestation" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "proposalAttestationId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'PREVIEW',
    "bindingVersion" TEXT NOT NULL,
    "bindingHash" TEXT NOT NULL,
    "attestationVersion" TEXT NOT NULL,
    "attestationInputHash" TEXT NOT NULL,
    "trust" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "paidArtefactsEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayAssessmentProposalAttestation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayAssessmentProposalAttestation_environment_check"
      CHECK ("environment" = 'PREVIEW'),
    CONSTRAINT "PathwayAssessmentProposalAttestation_bindingVersion_check"
      CHECK ("bindingVersion" = 'pathway-assessment-proposal-attestation.v1'),
    CONSTRAINT "PathwayAssessmentProposalAttestation_bindingHash_check"
      CHECK ("bindingHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayAssessmentProposalAttestation_inputHash_check"
      CHECK ("attestationInputHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayAssessmentProposalAttestation_trust_check"
      CHECK ("trust" = 'USER_ATTESTED'),
    CONSTRAINT "PathwayAssessmentProposalAttestation_decision_check"
      CHECK ("decision" = 'MORE_EVIDENCE_REQUIRED'),
    CONSTRAINT "PathwayAssessmentProposalAttestation_paid_check"
      CHECK ("paidArtefactsEligible" = false),
    CONSTRAINT "PathwayAssessmentProposalAttestation_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "PathwayAssessment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PathwayAssessmentProposalAttestation_attestationId_fkey"
      FOREIGN KEY ("proposalAttestationId") REFERENCES "PathwayProposalAttestation"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayAssessmentProposalAttestation_assessmentId_key"
  ON "PathwayAssessmentProposalAttestation"("assessmentId");
CREATE INDEX IF NOT EXISTS "PathwayAssessmentProposalAttestation_attestationId_idx"
  ON "PathwayAssessmentProposalAttestation"("proposalAttestationId");
CREATE INDEX IF NOT EXISTS "PathwayAssessmentProposalAttestation_bindingHash_idx"
  ON "PathwayAssessmentProposalAttestation"("bindingHash");

COMMIT;

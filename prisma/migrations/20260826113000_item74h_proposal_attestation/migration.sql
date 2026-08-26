-- Item 74H protected Preview proposal-attestation persistence.
-- Additive and replay-safe. Executed only by the exact-branch Preview runner
-- against the approved isolated Neon endpoint.

BEGIN;

CREATE TABLE IF NOT EXISTS "PathwayProposalAttestation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'PREVIEW',
    "version" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "evaluation" JSONB NOT NULL,
    "trust" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "paidArtefactsEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayProposalAttestation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayProposalAttestation_projectId_key" UNIQUE ("projectId"),
    CONSTRAINT "PathwayProposalAttestation_environment_check"
      CHECK ("environment" = 'PREVIEW'),
    CONSTRAINT "PathwayProposalAttestation_trust_check"
      CHECK ("trust" = 'USER_ATTESTED'),
    CONSTRAINT "PathwayProposalAttestation_decision_check"
      CHECK ("decision" = 'MORE_EVIDENCE_REQUIRED'),
    CONSTRAINT "PathwayProposalAttestation_paid_check"
      CHECK ("paidArtefactsEligible" = false),
    CONSTRAINT "PathwayProposalAttestation_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PathwayProposalAttestation_inputHash_idx"
  ON "PathwayProposalAttestation"("inputHash");

COMMIT;

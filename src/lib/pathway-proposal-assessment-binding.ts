import { createHash, randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { isProtectedProposalAttestationPreview } from "./pathway-proposal-attestation-persistence";

export const PATHWAY_PROPOSAL_ASSESSMENT_BINDING_VERSION =
  "pathway-assessment-proposal-attestation.v1" as const;

export type PathwayProposalAssessmentBindingErrorCode =
  | "PREVIEW_ONLY"
  | "ASSESSMENT_NOT_FOUND"
  | "PROJECT_SCOPE_MISMATCH"
  | "ATTESTATION_NOT_FOUND"
  | "UNSAFE_ATTESTATION"
  | "UNSAFE_ASSESSMENT"
  | "BINDING_REPLAY_CONFLICT";

export class PathwayProposalAssessmentBindingError extends Error {
  constructor(
    public readonly code: PathwayProposalAssessmentBindingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PathwayProposalAssessmentBindingError";
  }
}

type AssessmentRow = {
  id: string;
  projectId: string;
  environment: string;
  scopeKey: string;
  evidenceDigest: string;
  decision: string;
  trustLevel: string;
};

type AttestationRow = {
  id: string;
  projectId: string;
  environment: string;
  version: string;
  inputHash: string;
  trust: string;
  decision: string;
  paidArtefactsEligible: boolean;
};

export type PersistedProposalAssessmentBinding = {
  assessmentId: string;
  proposalAttestationId: string;
  bindingVersion: typeof PATHWAY_PROPOSAL_ASSESSMENT_BINDING_VERSION;
  bindingHash: string;
  attestationVersion: string;
  attestationInputHash: string;
  trust: "USER_ATTESTED";
  decision: "MORE_EVIDENCE_REQUIRED";
  paidArtefactsEligible: false;
};

function fail(
  code: PathwayProposalAssessmentBindingErrorCode,
  message: string,
): never {
  throw new PathwayProposalAssessmentBindingError(code, message);
}

function computeBindingHash(input: {
  assessmentId: string;
  projectId: string;
  scopeKey: string;
  evidenceDigest: string;
  proposalAttestationId: string;
  attestationVersion: string;
  attestationInputHash: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        bindingVersion: PATHWAY_PROPOSAL_ASSESSMENT_BINDING_VERSION,
        assessmentId: input.assessmentId,
        projectId: input.projectId,
        scopeKey: input.scopeKey,
        evidenceDigest: input.evidenceDigest,
        proposalAttestationId: input.proposalAttestationId,
        attestationVersion: input.attestationVersion,
        attestationInputHash: input.attestationInputHash,
        trust: "USER_ATTESTED",
        decision: "MORE_EVIDENCE_REQUIRED",
        paidArtefactsEligible: false,
      }),
    )
    .digest("hex");
}

export async function bindProposalAttestationToPathwayAssessment(
  prisma: PrismaClient,
  input: { assessmentId: string; projectId: string },
): Promise<{
  binding: PersistedProposalAssessmentBinding;
  replayed: boolean;
}> {
  if (!isProtectedProposalAttestationPreview()) {
    fail(
      "PREVIEW_ONLY",
      "Proposal-to-assessment binding is restricted to the protected Preview.",
    );
  }

  const assessments = await prisma.$queryRaw<AssessmentRow[]>`
    SELECT
      "id",
      "projectId",
      "environment",
      "scopeKey",
      "evidenceDigest",
      "decision",
      "trustLevel"
    FROM "PathwayAssessment"
    WHERE "id" = ${input.assessmentId}
  `;
  const assessment = assessments[0];
  if (!assessment) {
    fail("ASSESSMENT_NOT_FOUND", "Pathway assessment was not found.");
  }
  if (assessment.projectId !== input.projectId) {
    fail(
      "PROJECT_SCOPE_MISMATCH",
      "Pathway assessment does not belong to the attested project.",
    );
  }
  if (
    assessment.environment !== "PREVIEW" ||
    assessment.decision !== "MORE_EVIDENCE_REQUIRED" ||
    !["GENERAL_GUIDANCE", "SITE_CONFIRMED"].includes(assessment.trustLevel)
  ) {
    fail(
      "UNSAFE_ASSESSMENT",
      "A user attestation may bind only to an unresolved, non-paid Preview assessment.",
    );
  }

  const attestations = await prisma.$queryRaw<AttestationRow[]>`
    SELECT
      "id",
      "projectId",
      "environment",
      "version",
      "inputHash",
      "trust",
      "decision",
      "paidArtefactsEligible"
    FROM "PathwayProposalAttestation"
    WHERE "projectId" = ${input.projectId}
  `;
  const attestation = attestations[0];
  if (!attestation) {
    fail(
      "ATTESTATION_NOT_FOUND",
      "A persisted proposal attestation is required for this project.",
    );
  }
  if (
    attestation.projectId !== assessment.projectId ||
    attestation.environment !== "PREVIEW" ||
    attestation.version !== "pathway-proposal-attestation.v1" ||
    !/^[a-f0-9]{64}$/.test(attestation.inputHash) ||
    attestation.trust !== "USER_ATTESTED" ||
    attestation.decision !== "MORE_EVIDENCE_REQUIRED" ||
    attestation.paidArtefactsEligible !== false
  ) {
    fail(
      "UNSAFE_ATTESTATION",
      "The proposal attestation failed its immutable safety contract.",
    );
  }

  const bindingHash = computeBindingHash({
    assessmentId: assessment.id,
    projectId: assessment.projectId,
    scopeKey: assessment.scopeKey,
    evidenceDigest: assessment.evidenceDigest,
    proposalAttestationId: attestation.id,
    attestationVersion: attestation.version,
    attestationInputHash: attestation.inputHash,
  });

  const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "PathwayAssessmentProposalAttestation" (
      "id",
      "assessmentId",
      "proposalAttestationId",
      "environment",
      "bindingVersion",
      "bindingHash",
      "attestationVersion",
      "attestationInputHash",
      "trust",
      "decision",
      "paidArtefactsEligible",
      "createdAt"
    ) VALUES (
      ${randomUUID()},
      ${assessment.id},
      ${attestation.id},
      'PREVIEW',
      ${PATHWAY_PROPOSAL_ASSESSMENT_BINDING_VERSION},
      ${bindingHash},
      ${attestation.version},
      ${attestation.inputHash},
      'USER_ATTESTED',
      'MORE_EVIDENCE_REQUIRED',
      false,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("assessmentId") DO NOTHING
    RETURNING "id"
  `;

  const rows = await prisma.$queryRaw<PersistedProposalAssessmentBinding[]>`
    SELECT
      "assessmentId",
      "proposalAttestationId",
      "bindingVersion",
      "bindingHash",
      "attestationVersion",
      "attestationInputHash",
      "trust",
      "decision",
      "paidArtefactsEligible"
    FROM "PathwayAssessmentProposalAttestation"
    WHERE "assessmentId" = ${assessment.id}
  `;
  const binding = rows[0];
  if (
    !binding ||
    binding.proposalAttestationId !== attestation.id ||
    binding.bindingVersion !==
      PATHWAY_PROPOSAL_ASSESSMENT_BINDING_VERSION ||
    binding.bindingHash !== bindingHash ||
    binding.attestationVersion !== attestation.version ||
    binding.attestationInputHash !== attestation.inputHash ||
    binding.trust !== "USER_ATTESTED" ||
    binding.decision !== "MORE_EVIDENCE_REQUIRED" ||
    binding.paidArtefactsEligible !== false
  ) {
    fail(
      "BINDING_REPLAY_CONFLICT",
      "The assessment already has a different proposal-attestation scope.",
    );
  }

  return { binding, replayed: inserted.length === 0 };
}

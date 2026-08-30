import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  type ProposalAttestationEvaluation,
  type ProposalAttestationInput,
} from "../src/lib/pathway-proposal-attestation";
import { createProjectWithProposalAttestationForRequester } from "../src/lib/pathway-proposal-attestation-persistence";
import { prisma } from "../src/lib/prisma";

type PersistedAttestation = {
  environment: string;
  version: string;
  inputHash: string;
  input: unknown;
  evaluation: unknown;
  trust: string;
  decision: string;
  paidArtefactsEligible: boolean;
};

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value ?? null;
};

const input = {
  proposalType: "RURAL_SHED",
  habitable: false,
  purpose: "MACHINERY_AND_AGRICULTURAL_GOODS_STORAGE",
  landAreaHectares: 3.2,
  proposedFootprintSquareMetres: 96,
  existingFarmBuildingFootprintSquareMetres: 0,
  buildingHeightMetres: 4.2,
  roadSetbackMetres: 72,
  sideBoundarySetbackMetres: 24,
  otherBoundarySetbackMetres: 35,
  roadClassification: "UNRESOLVED_ASSUMED_LOCAL",
} as unknown as ProposalAttestationInput;

const evaluation = {
  trust: "USER_ATTESTED",
  decision: "MORE_EVIDENCE_REQUIRED",
  paidArtefactsEligible: false,
  landAreaSquareMetres: 25_000,
  aggregateBuildingFootprintSquareMetres: 96,
  siteCoveragePercent: 0.32,
  unresolvedEvidence: [
    "AUTHORITATIVE_ADDRESS",
    "ROAD_CLASSIFICATION",
    "SURVEYED_DIMENSIONS_AND_SETBACKS",
  ],
} as unknown as ProposalAttestationEvaluation;

async function main() {
  const sessionId = `item74h-attestation-${randomUUID()}`;
  let projectId: string | undefined;
  let propertyId: string | undefined;

  try {
    const result = await createProjectWithProposalAttestationForRequester({
      sessionId,
      userId: null,
      title: "Item 74H synthetic proposal attestation acceptance",
      input,
      evaluation,
    });

    projectId = result.project.id;
    propertyId = result.project.propertyId;

    assert.equal(result.persistence, "PERSISTED_PROTECTED_PREVIEW");

    const rows = await prisma.$queryRaw<PersistedAttestation[]>`
      SELECT
        "environment",
        "version",
        "inputHash",
        "input",
        "evaluation",
        "trust",
        "decision",
        "paidArtefactsEligible"
      FROM "PathwayProposalAttestation"
      WHERE "projectId" = ${projectId}
    `;

    assert.equal(rows.length, 1);
    const [row] = rows;
    assert.equal(row.environment, "PREVIEW");
    assert.equal(row.version, "pathway-proposal-attestation.v1");
    assert.match(row.inputHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(canonical(row.input), canonical(input));
    assert.deepEqual(canonical(row.evaluation), canonical(evaluation));
    assert.equal(row.trust, "USER_ATTESTED");
    assert.equal(row.decision, "MORE_EVIDENCE_REQUIRED");
    assert.equal(row.paidArtefactsEligible, false);
  } finally {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    if (propertyId) {
      await prisma.property.deleteMany({ where: { id: propertyId } });
    }

    if (projectId) {
      const [projectCount, attestationRows] = await Promise.all([
        prisma.project.count({ where: { id: projectId } }),
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS "count"
          FROM "PathwayProposalAttestation"
          WHERE "projectId" = ${projectId}
        `,
      ]);
      assert.equal(projectCount, 0);
      assert.equal(attestationRows[0]?.count, 0n);
    }

    if (propertyId) {
      assert.equal(
        await prisma.property.count({ where: { id: propertyId } }),
        0,
      );
    }

    await prisma.$disconnect();
  }

  console.log(
    JSON.stringify({
      item: "74H",
      environment: "PREVIEW",
      syntheticWrite: "PASS",
      reload: "PASS",
      cleanup: "PASS",
      residualProjects: 0,
      residualProperties: 0,
      residualAttestations: 0,
      trust: "USER_ATTESTED",
      decision: "MORE_EVIDENCE_REQUIRED",
      paidArtefactsEligible: false,
      productionMutation: false,
    }),
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `[item74h:attestation-preview] ${error.message}`
      : "[item74h:attestation-preview] unknown failure",
  );
  process.exit(1);
});

import { createHash, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import {
  bindProposalAttestationToPathwayAssessment,
  PathwayProposalAssessmentBindingError,
} from "../src/lib/pathway-proposal-assessment-binding";
import { isProtectedProposalAttestationPreview } from "../src/lib/pathway-proposal-attestation-persistence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectedBlock(error: unknown, code: string): boolean {
  return (
    error instanceof PathwayProposalAssessmentBindingError &&
    error.code === code
  );
}

async function main(): Promise<void> {
  assert(
    isProtectedProposalAttestationPreview(),
    "Binding acceptance requires the exact protected Preview.",
  );

  const prisma = new PrismaClient();
  const prefix = `item74h-attested-assessment-${randomUUID()}-`;
  const ids = {
    user: prefix + "user",
    property: prefix + "property",
    project: prefix + "project",
    site: prefix + "site",
    spatial: prefix + "spatial",
    definition: prefix + "definition",
    assessment: prefix + "assessment",
    unsafeAssessment: prefix + "unsafe-assessment",
    attestation: prefix + "attestation",
  };
  const now = new Date();
  const attestationInput = {
    proposalPurpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
    landAreaHectares: 2.5,
    proposedBuildingFootprintSquareMetres: 80,
    existingFarmBuildingFootprintSquareMetres: 0,
    proposedBuildingHeightMetres: 3.5,
    roadSetbackMetres: 100,
    sideSetbackMetres: 10,
    otherBoundarySetbackMetres: 50,
    roadCategory: "UNRESOLVED",
  };
  const attestationEvaluation = {
    trust: "USER_ATTESTED",
    decision: "MORE_EVIDENCE_REQUIRED",
    paidArtefactsEligible: false,
    landAreaSquareMetres: 25_000,
    aggregateFarmBuildingFootprintSquareMetres: 80,
    siteCoveragePercent: 0.32,
    preliminaryRoadSetbackOutcome: "MEETS_BOTH_POSSIBLE_MINIMUMS",
    roadDistanceRobustToUnresolvedCategory: true,
    unresolvedEvidence: [
      "AUTHORITATIVE_ADDRESS",
      "ROAD_CLASSIFICATION",
      "SURVEYED_DIMENSIONS_AND_SETBACKS",
    ],
  };
  const inputJson = JSON.stringify(attestationInput);
  const inputHash = createHash("sha256").update(inputJson).digest("hex");

  try {
    await prisma.user.create({
      data: {
        id: ids.user,
        email: prefix + "preview@example.invalid",
        name: "Item 74H synthetic proposal-assessment binding",
      },
    });
    await prisma.property.create({
      data: {
        id: ids.property,
        name: "Synthetic Byron RU2 property",
        address: "SYNTHETIC - NOT A REAL ADDRESS",
        state: "NSW",
        country: "AU",
      },
    });
    await prisma.project.create({
      data: {
        id: ids.project,
        name: "Item 74H synthetic attested assessment",
        title: "Synthetic shed pathway",
        description: "Non-authoritative acceptance fixture",
        propertyId: ids.property,
        userId: ids.user,
        createdById: ids.user,
        zoningCode: "RU2",
        zoning: "RU2",
        address: "SYNTHETIC - NOT A REAL ADDRESS",
        isDemo: true,
      },
    });
    await prisma.siteContext.create({
      data: {
        id: ids.site,
        projectId: ids.project,
        addressInput: "SYNTHETIC - NOT A REAL ADDRESS",
        formattedAddress: "SYNTHETIC - NOT A REAL ADDRESS",
        lgaName: "Byron Shire",
        lgaCode: "BYRON",
        parcelId: "SYNTHETIC",
        lot: "SYNTHETIC",
        planNumber: "SYNTHETIC",
        zone: "RU2",
      },
    });
    await prisma.siteSpatialProvenance.create({
      data: {
        id: ids.spatial,
        siteContextId: ids.site,
        authority: "NSW Spatial Services",
        datasetName: "Synthetic acceptance stand-in",
        sourceUrl:
          "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer",
        sourceVersion: "synthetic-preview-v1",
        retrievedAt: now,
        contentHash: prefix + "spatial-hash",
        matchMethod: "SYNTHETIC",
        parcelId: "SYNTHETIC",
        lot: "SYNTHETIC",
        planNumber: "SYNTHETIC",
        lgaCode: "BYRON",
        zoneCode: "RU2",
        payload: { fixture: true, authoritative: false },
        trustLevel: "SITE_CONFIRMED",
      },
    });
    await prisma.pathwayDefinition.create({
      data: {
        id: ids.definition,
        versionKey: prefix + "byron-ru2-shed-v1",
        lgaCode: "BYRON",
        zoneCode: "RU2",
        proposalType: "SHED_OUTBUILDING",
        status: "ACTIVE",
        effectiveFrom: now,
        graphHash: prefix + "graph-hash",
        graph: { fixture: true, authoritative: false },
      },
    });
    await prisma.pathwayAssessment.createMany({
      data: [
        {
          id: ids.assessment,
          projectId: ids.project,
          siteContextId: ids.site,
          spatialProvenanceId: ids.spatial,
          pathwayDefinitionId: ids.definition,
          environment: "PREVIEW",
          assessmentVersion: "item74h-attested-assessment-v1",
          idempotencyKey: prefix + "assessment-idempotency",
          scopeKey: prefix + "scope",
          inputHash: prefix + "assessment-input-hash",
          evidenceDigest: prefix + "evidence-digest",
          decision: "MORE_EVIDENCE_REQUIRED",
          trustLevel: "GENERAL_GUIDANCE",
          input: { fixture: true, proposalTrust: "USER_ATTESTED" },
          result: {
            fixture: true,
            decision: "MORE_EVIDENCE_REQUIRED",
            paidArtefactsEligible: false,
          },
          assessedAt: now,
        },
        {
          id: ids.unsafeAssessment,
          projectId: ids.project,
          siteContextId: ids.site,
          spatialProvenanceId: ids.spatial,
          pathwayDefinitionId: ids.definition,
          environment: "PREVIEW",
          assessmentVersion: "item74h-attested-assessment-v1",
          idempotencyKey: prefix + "unsafe-idempotency",
          scopeKey: prefix + "unsafe-scope",
          inputHash: prefix + "unsafe-input-hash",
          evidenceDigest: prefix + "unsafe-evidence-digest",
          decision: "PROCEED",
          trustLevel: "EVIDENCE_VERIFIED",
          input: { fixture: true },
          result: { fixture: true, decision: "PROCEED" },
          assessedAt: now,
        },
      ],
    });

    await prisma.$executeRaw`
      INSERT INTO "PathwayProposalAttestation" (
        "id",
        "projectId",
        "environment",
        "version",
        "inputHash",
        "input",
        "evaluation",
        "trust",
        "decision",
        "paidArtefactsEligible",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${ids.attestation},
        ${ids.project},
        'PREVIEW',
        'pathway-proposal-attestation.v1',
        ${inputHash},
        CAST(${inputJson} AS JSONB),
        CAST(${JSON.stringify(attestationEvaluation)} AS JSONB),
        'USER_ATTESTED',
        'MORE_EVIDENCE_REQUIRED',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    const first = await bindProposalAttestationToPathwayAssessment(prisma, {
      assessmentId: ids.assessment,
      projectId: ids.project,
    });
    const replay = await bindProposalAttestationToPathwayAssessment(prisma, {
      assessmentId: ids.assessment,
      projectId: ids.project,
    });

    assert(!first.replayed, "First binding must create one durable link.");
    assert(replay.replayed, "Second binding must replay the original link.");
    assert(
      first.binding.bindingHash === replay.binding.bindingHash,
      "Replay must preserve the exact binding hash.",
    );
    assert(
      first.binding.attestationInputHash === inputHash,
      "Binding must preserve the proposal input hash.",
    );
    assert(
      first.binding.trust === "USER_ATTESTED" &&
        first.binding.decision === "MORE_EVIDENCE_REQUIRED" &&
        first.binding.paidArtefactsEligible === false,
      "Binding must preserve the non-paid attestation boundary.",
    );

    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "PathwayAssessmentProposalAttestation"
      WHERE "assessmentId" = ${ids.assessment}
    `;
    assert(rows[0]?.count === 1n, "Exactly one durable link is required.");

    let unsafeAssessmentBlocked = false;
    try {
      await bindProposalAttestationToPathwayAssessment(prisma, {
        assessmentId: ids.unsafeAssessment,
        projectId: ids.project,
      });
    } catch (error) {
      unsafeAssessmentBlocked = expectedBlock(error, "UNSAFE_ASSESSMENT");
    }
    assert(
      unsafeAssessmentBlocked,
      "An attestation must not bind to a paid-trust PROCEED assessment.",
    );

    let crossProjectBlocked = false;
    try {
      await bindProposalAttestationToPathwayAssessment(prisma, {
        assessmentId: ids.assessment,
        projectId: prefix + "different-project",
      });
    } catch (error) {
      crossProjectBlocked = expectedBlock(error, "PROJECT_SCOPE_MISMATCH");
    }
    assert(
      crossProjectBlocked,
      "An assessment must not bind to another project scope.",
    );

    console.log(
      JSON.stringify({
        item: "74H",
        environment: "PREVIEW",
        proposalAssessmentBinding: "PASS",
        replay: "PASS",
        crossProjectBindingBlocked: true,
        paidTrustAssessmentBlocked: true,
        trust: "USER_ATTESTED",
        decision: "MORE_EVIDENCE_REQUIRED",
        paidArtefactsEligible: false,
        productionCheckoutEnabled: false,
        productionMutationPerformed: false,
      }),
    );
  } finally {
    await prisma.pathwayAssessment.deleteMany({
      where: { projectId: ids.project },
    });
    await prisma.pathwayDefinition.deleteMany({
      where: { id: ids.definition },
    });
    await prisma.siteSpatialProvenance.deleteMany({
      where: { id: ids.spatial },
    });
    await prisma.siteContext.deleteMany({ where: { id: ids.site } });
    await prisma.project.deleteMany({ where: { id: ids.project } });
    await prisma.property.deleteMany({ where: { id: ids.property } });
    await prisma.user.deleteMany({ where: { id: ids.user } });

    const [attestationRows, bindingRows, assessmentCount, projectCount] =
      await Promise.all([
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS "count"
          FROM "PathwayProposalAttestation"
          WHERE "projectId" = ${ids.project}
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS "count"
          FROM "PathwayAssessmentProposalAttestation"
          WHERE "assessmentId" IN (${ids.assessment}, ${ids.unsafeAssessment})
        `,
        prisma.pathwayAssessment.count({
          where: { projectId: ids.project },
        }),
        prisma.project.count({ where: { id: ids.project } }),
      ]);
    assert(attestationRows[0]?.count === 0n, "Attestation cleanup left residue.");
    assert(bindingRows[0]?.count === 0n, "Binding cleanup left residue.");
    assert(assessmentCount === 0, "Assessment cleanup left residue.");
    assert(projectCount === 0, "Project cleanup left residue.");

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `[item74h:proposal-assessment-preview] ${error.message}`
      : "[item74h:proposal-assessment-preview] unknown failure",
  );
  process.exit(1);
});

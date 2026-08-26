import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  DEV_BYPASS_USER_ID,
  requireSessionUser,
} from "@/lib/artefact-service";
import {
  toPathwayCustomerResult,
  unavailablePathwayCustomerResult,
} from "@/lib/pathway-customer-result";
import { prisma } from "@/lib/prisma";
import { findProjectByExternalId } from "@/lib/project-identifiers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json(unavailablePathwayCustomerResult("PREVIEW_ONLY"));
  }

  try {
    const { userId } = await requireSessionUser();
    const project = await findProjectByExternalId(prisma, params.projectId);
    if (!project) {
      throw new ArtefactAccessError("Project not found or access denied", 404);
    }
    const hasAccess = await prisma.project.findFirst({
      where:
        userId === DEV_BYPASS_USER_ID
          ? { id: project.id }
          : {
              id: project.id,
              OR: [
                { createdById: userId },
                { userId },
                { collaborators: { some: { userId } } },
              ],
            },
      select: { id: true },
    });
    if (!hasAccess) {
      throw new ArtefactAccessError("Project not found or access denied");
    }

    const assessment = await prisma.pathwayAssessment.findFirst({
      where: { projectId: project.id },
      orderBy: { assessedAt: "desc" },
      select: {
        id: true,
        decision: true,
        trustLevel: true,
        isCurrent: true,
        assessedAt: true,
        staleAt: true,
        result: true,
        pathwayDefinition: {
          select: {
            versionKey: true,
            status: true,
          },
        },
        spatialProvenance: {
          select: {
            authority: true,
            datasetName: true,
            sourceUrl: true,
            sourceVersion: true,
            retrievedAt: true,
            effectiveAt: true,
            trustLevel: true,
            staleAt: true,
          },
        },
        evidenceSnapshots: {
          select: {
            evidenceKind: true,
            authority: true,
            sourceUrl: true,
            sourceVersion: true,
            retrievedAt: true,
            effectiveFrom: true,
            staleAt: true,
            isCurrentAtAssessment: true,
          },
        },
        controlSnapshots: {
          select: {
            label: true,
            operator: true,
            numericValue: true,
            lowerBound: true,
            upperBound: true,
            textValue: true,
            unit: true,
            sourceReference: true,
            isCurrentAtAssessment: true,
            staleAt: true,
          },
        },
        gateSnapshots: {
          select: {
            sequence: true,
            question: true,
            outcome: true,
            reason: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        unavailablePathwayCustomerResult("NO_PERSISTED_ASSESSMENT"),
      );
    }

    const proposalRows = await prisma.$queryRaw<
      Array<{
        input: unknown;
        trust: string;
        decision: string;
        paidArtefactsEligible: boolean;
      }>
    >`
      SELECT
        proposal."input",
        binding."trust",
        binding."decision",
        binding."paidArtefactsEligible"
      FROM "PathwayAssessmentProposalAttestation" binding
      INNER JOIN "PathwayProposalAttestation" proposal
        ON proposal."id" = binding."proposalAttestationId"
      WHERE binding."assessmentId" = ${assessment.id}
      LIMIT 1
    `;

    return NextResponse.json(
      toPathwayCustomerResult({
        ...assessment,
        proposalAttestation: proposalRows[0] ?? null,
      }),
    );
  } catch (error) {
    if (error instanceof ArtefactAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Unable to load the evidence pathway" },
      { status: 500 },
    );
  }
}

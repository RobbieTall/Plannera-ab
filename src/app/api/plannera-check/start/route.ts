import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordCommercialFunnelEventSafely } from "@/lib/commercial-funnel-events";
import { getUserContext } from "@/lib/getUserContext";
import { evaluateProposalAttestation } from "@/lib/pathway-proposal-attestation";
import {
  createProjectWithProposalAttestationForRequester,
  type ProposalAttestationPersistence,
} from "@/lib/pathway-proposal-attestation-persistence";
import { createProjectForRequester } from "@/lib/projects";

const proposalAttestationSchema = z
  .object({
    proposalPurpose: z.literal(
      "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
    ),
    landAreaHectares: z.number().finite().positive(),
    proposedBuildingFootprintSquareMetres: z.number().finite().positive(),
    existingFarmBuildingFootprintSquareMetres: z
      .number()
      .finite()
      .nonnegative(),
    proposedBuildingHeightMetres: z.number().finite().positive(),
    roadSetbackMetres: z.number().finite().nonnegative(),
    sideSetbackMetres: z.number().finite().nonnegative(),
    otherBoundarySetbackMetres: z.number().finite().nonnegative(),
    roadCategory: z.literal("UNRESOLVED"),
  })
  .strict();

const requestSchema = z
  .object({
    title: z.string().trim().min(3).max(300),
    proposalAttestation: proposalAttestationSchema.optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_check_start" }, { status: 400 });
  }

  let proposalAttestation = null;
  if (parsed.data.proposalAttestation) {
    try {
      proposalAttestation = evaluateProposalAttestation(
        parsed.data.proposalAttestation,
      );
    } catch {
      return NextResponse.json(
        { error: "invalid_proposal_attestation" },
        { status: 400 },
      );
    }
  }

  const requester = await getUserContext();
  let project;
  let proposalAttestationPersistence: ProposalAttestationPersistence | null =
    null;

  if (parsed.data.proposalAttestation && proposalAttestation) {
    const creation = await createProjectWithProposalAttestationForRequester({
      sessionId: requester.sessionId,
      userId: requester.userId,
      title: parsed.data.title,
      input: parsed.data.proposalAttestation,
      evaluation: proposalAttestation,
    });
    project = creation.project;
    proposalAttestationPersistence = creation.persistence;
  } else {
    project = await createProjectForRequester(
      requester.sessionId,
      requester.userId,
      parsed.data.title,
    );
  }

  await recordCommercialFunnelEventSafely({
    eventName: "CHECK_STARTED",
    projectId: project.id,
    sourceRecordId: project.id,
    actorUserId: requester.userId,
  });

  return NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
    },
    proposalAttestation,
    proposalAttestationPersistence,
  });
}

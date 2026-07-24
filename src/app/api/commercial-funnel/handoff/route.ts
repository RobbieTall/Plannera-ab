import { NextResponse } from "next/server";
import { z } from "zod";

import { recordCommercialFunnelEvent } from "@/lib/commercial-funnel-events";
import { getUserContext } from "@/lib/getUserContext";
import { prisma } from "@/lib/prisma";
import { getProjectForRequester } from "@/lib/projects";

export const dynamic = "force-dynamic";

const interactionSchema = z
  .object({
    projectId: z.string().trim().min(1).max(200),
    artefactId: z.string().trim().min(1).max(200),
    action: z.enum(["copied", "downloaded"]),
  })
  .strict();

export async function POST(request: Request) {
  const parsed = interactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_interaction" }, { status: 400 });
  }

  const requester = await getUserContext();
  const project = await getProjectForRequester(
    parsed.data.projectId,
    requester.sessionId,
    requester.userId,
  );
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const artefact = await prisma.artefact.findFirst({
    where: {
      id: parsed.data.artefactId,
      projectId: project.id,
      type: "review_request",
    },
    select: { id: true, projectId: true },
  });
  if (!artefact) {
    return NextResponse.json({ error: "review_package_not_found" }, { status: 404 });
  }

  await recordCommercialFunnelEvent({
    eventName: parsed.data.action === "copied" ? "HANDOFF_COPIED" : "HANDOFF_DOWNLOADED",
    projectId: artefact.projectId,
    artefactId: artefact.id,
    sourceRecordId: artefact.id,
    actorUserId: requester.userId,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

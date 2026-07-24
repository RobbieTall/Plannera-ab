import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordCommercialFunnelEventSafely } from "@/lib/commercial-funnel-events";
import { getUserContext } from "@/lib/getUserContext";
import { createProjectForRequester } from "@/lib/projects";

const requestSchema = z
  .object({
    title: z.string().trim().min(3).max(300),
  })
  .strict();

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_check_start" }, { status: 400 });
  }

  const requester = await getUserContext();
  const project = await createProjectForRequester(
    requester.sessionId,
    requester.userId,
    parsed.data.title,
  );
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
  });
}

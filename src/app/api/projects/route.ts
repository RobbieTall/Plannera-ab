import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateCurrentProject } from "@/lib/projects";
import { getSessionFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  title: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsedBody.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  try {
    const project = await getOrCreateCurrentProject(session.sessionId, session.userId, parsedBody.data.title);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    console.error("[projects-create]", error);
    return NextResponse.json({ ok: false, error: "Unable to resolve project" }, { status: 500 });
  }
}

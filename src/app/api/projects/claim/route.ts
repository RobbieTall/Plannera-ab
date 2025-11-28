import { NextRequest, NextResponse } from "next/server";

import { claimProjectsForUser } from "@/lib/projects";
import { getSessionFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!session.userId) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 400 });
  }

  try {
    const projects = await claimProjectsForUser(session.sessionId, session.userId);
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    console.error("[projects-claim]", error);
    return NextResponse.json({ ok: false, error: "Unable to claim projects" }, { status: 500 });
  }
}

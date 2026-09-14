import { NextResponse } from "next/server";

import { getUserContext } from "@/lib/getUserContext";
import { claimProjectsForUser } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getUserContext();

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

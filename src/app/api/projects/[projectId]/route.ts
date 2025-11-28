import { NextRequest, NextResponse } from "next/server";

import { getProjectForRequester } from "@/lib/projects";
import { getSessionFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { projectId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await getProjectForRequester(params.projectId, session.sessionId, session.userId);

  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : 404;
    return NextResponse.json({ ok: false, error: "Project not accessible" }, { status });
  }

  return NextResponse.json({ ok: true, project: result.project });
}

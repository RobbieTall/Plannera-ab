import { NextResponse } from "next/server";

import { createFeasibilityArtefact } from "@/lib/artefact-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { projectId, address, developmentType, siteContext } = await request.json();
    if (!projectId || !address || !developmentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await createFeasibilityArtefact(projectId, address, developmentType, siteContext ?? {});
    return NextResponse.json(result);
  } catch (err) {
    console.error("[generate-feasibility]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildQuickSiteCheckReport } from "@/lib/quick-site-check";
import { findProjectByExternalId, normalizeProjectId } from "@/lib/project-identifiers";
import type { QuickSiteCheckResponse } from "@/types/quick-site-check";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  try {
    const normalizedId = normalizeProjectId(params.projectId);
    const project = await findProjectByExternalId(prisma, normalizedId);

    if (!project) {
      return NextResponse.json({ ok: false, message: "Project not found" } satisfies QuickSiteCheckResponse, {
        status: 404,
      });
    }

    const projectWithContext = await prisma.project.findUnique({
      where: { id: project.id },
      include: { siteContext: true },
    });

    if (!projectWithContext) {
      return NextResponse.json({ ok: false, message: "Project context unavailable" }, { status: 404 });
    }

    const report = await buildQuickSiteCheckReport(projectWithContext);

    return NextResponse.json({ ok: true, report } satisfies QuickSiteCheckResponse);
  } catch (error) {
    console.error("[quick-site-check] failed to build report", error);
    return NextResponse.json(
      { ok: false, message: "Unable to build Quick Site Check at this time" } satisfies QuickSiteCheckResponse,
      { status: 500 },
    );
  }
}

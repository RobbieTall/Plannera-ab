import { NextResponse } from "next/server";

import type { DcpParseResult } from "@/lib/dcp/types";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId query param" },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json(
      { error: `Project not found for id ${projectId}` },
      { status: 404 },
    );
  }

  const dcpData = project.dcpData as DcpParseResult | null;

  if (!dcpData) {
    return NextResponse.json({
      projectId,
      dcpPresent: false,
    });
  }

  const sectionHeadings = Array.isArray(dcpData.sections)
    ? (dcpData.sections
        .map((section) =>
          section && typeof section === "object" && typeof section.heading === "string"
            ? section.heading
            : null,
        )
        .filter(Boolean) as string[])
    : [];

  return NextResponse.json({
    projectId,
    dcpPresent: true,
    instrumentName: dcpData.instrumentName ?? "Development Control Plan",
    sectionCount: sectionHeadings.length,
    sections: sectionHeadings,
  });
}

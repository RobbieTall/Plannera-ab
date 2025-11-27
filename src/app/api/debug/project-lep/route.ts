import { NextResponse } from "next/server";

import { findLepZoneForZoningCode } from "@/lib/lep/lep-lookup";
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

  const lepData = project.lepData as any | null;

  const zoningCode = project.zoningCode ?? null;
  const zoningName = project.zoningName ?? null;

  const lepZoneMatch = lepData
    ? findLepZoneForZoningCode({
        lepData,
        zoningCode,
      })
    : null;

  return NextResponse.json({
    projectId,
    zoning: {
      code: zoningCode,
      name: zoningName,
    },
    lepPresent: !!lepData,
    lepMetadata: lepData
      ? {
          lgaName: lepData.metadata?.lgaName ?? null,
          instrumentName: lepData.metadata?.instrumentName ?? null,
          instrumentType: lepData.metadata?.instrumentType ?? null,
        }
      : null,
    lepZoneCodes: lepData
      ? (lepData.zones ?? []).map((z: any) => ({
          zoneCode: z.zoneCode ?? null,
          zoneName: z.zoneName ?? null,
        }))
      : [],
    lepZoneMatch: lepZoneMatch
      ? {
          metadata: lepZoneMatch.metadata,
          zone: {
            zoneCode: lepZoneMatch.zone.zoneCode,
            zoneName: lepZoneMatch.zone.zoneName,
          },
        }
      : null,
  });
}

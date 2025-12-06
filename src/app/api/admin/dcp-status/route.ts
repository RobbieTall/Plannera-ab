import { NextResponse } from "next/server";

import { WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;
const COUNCIL_DCP_TYPES: WorkspaceSourceType[] = [
  WorkspaceSourceType.council_dcp,
  WorkspaceSourceType.dcp,
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
    const lgaCode = url.searchParams.get("lgaCode");

    if (!accessToken) {
      return NextResponse.json({ error: "admin_token_missing" }, { status: 401 });
    }

    if (!token || token !== accessToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const canonicalLgaCode = normalizeCouncilLgaCode(lgaCode);
    if (!canonicalLgaCode) {
      return NextResponse.json({ error: "lga_required" }, { status: 400 });
    }

    const where = { lgaCode: canonicalLgaCode, sourceType: { in: COUNCIL_DCP_TYPES } } as const;
    const [councilChunks, chunkCount] = await Promise.all([
      prisma.workspaceSourceChunk.findMany({
        where,
        select: { heading: true },
        take: 10,
      }),
      prisma.workspaceSourceChunk.count({ where }),
    ]);

    return NextResponse.json({
      canonicalLgaCode,
      councilDcp: {
        chunkCount,
        sampleHeadings: councilChunks
          .map((chunk) => chunk.heading)
          .filter((heading): heading is string => Boolean(heading))
          .slice(0, 5),
      },
    });
  } catch (error) {
    console.error("[dcp-status-admin]", error);
    return NextResponse.json({ error: "dcp_status_failed" }, { status: 500 });
  }
}

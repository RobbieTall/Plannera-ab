import { NextResponse } from "next/server";

import { WorkspaceSourceType } from "@prisma/client";

import { resolveCouncilLgaCode } from "@/lib/dcp/council-lga-codes";
import { prisma } from "@/lib/prisma";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;

const buildSampleHeadings = (rows: { heading: string | null; metadata: unknown }[]) => {
  const headings = new Set<string>();

  rows.forEach((row) => {
    const metadataHeading =
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Record<string, unknown>).heading
        : undefined;

    const values = [metadataHeading, row.heading];

    values.forEach((value) => {
      if (typeof value === "string" && value.trim()) {
        headings.add(value.trim());
      }
    });
  });

  return Array.from(headings).slice(0, 5);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
  const rawLgaCode = url.searchParams.get("lgaCode");

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "admin_token_missing" }, { status: 401 });
  }

  if (!token || token !== accessToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (rawLgaCode) {
    const canonicalLgaCode = resolveCouncilLgaCode(rawLgaCode);
    if (!canonicalLgaCode) {
      return NextResponse.json({ ok: false, error: "invalid_lga" }, { status: 400 });
    }

    const totalCouncilDcpChunks = await prisma.workspaceSourceChunk.count({
      where: { lgaCode: canonicalLgaCode, sourceType: WorkspaceSourceType.council_dcp },
    });

    const sampleRows = await prisma.workspaceSourceChunk.findMany({
      where: { lgaCode: canonicalLgaCode, sourceType: WorkspaceSourceType.council_dcp },
      select: { heading: true, metadata: true },
      take: 25,
    });

    const sampleHeadings = buildSampleHeadings(sampleRows);

    console.log("[dcp-status]", { canonicalLgaCode, totalCouncilDcpChunks });

    return NextResponse.json({ ok: true, canonicalLgaCode, totalCouncilDcpChunks, sampleHeadings });
  }

  const grouped = await prisma.workspaceSourceChunk.groupBy({
    by: ["lgaCode"],
    where: { sourceType: WorkspaceSourceType.council_dcp, lgaCode: { not: null } },
    _count: { _all: true },
  });

  const summary = grouped.map((group) => ({
    canonicalLgaCode: group.lgaCode,
    totalCouncilDcpChunks: group._count._all,
  }));

  console.log("[dcp-status] summary", { total: summary.length });

  return NextResponse.json({ ok: true, summary });
}

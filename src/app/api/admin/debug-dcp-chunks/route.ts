import { InstrumentType, WorkspaceSourceType } from "@prisma/client";
import { NextResponse } from "next/server";

import { BYRON_DCP_CONSTANTS } from "@/lib/dcp/byron-ingestion";
import { prisma } from "@/lib/prisma";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
  const lga = (url.searchParams.get("lga") || "").toUpperCase();

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "admin_token_missing" }, { status: 401 });
  }

  if (!token || token !== accessToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!lga) {
    return NextResponse.json({ ok: false, error: "lga_required" }, { status: 400 });
  }

  const fallbackSlug = lga === BYRON_DCP_CONSTANTS.lga ? BYRON_DCP_CONSTANTS.slug : undefined;
  const clauseMatch = await prisma.dCPClause.findFirst({
    where: { lgaCode: lga, instrumentSlug: { not: null } },
    select: { instrumentSlug: true },
  });

  const instrumentSlug = clauseMatch?.instrumentSlug ?? fallbackSlug;

  const instrument = instrumentSlug
    ? await prisma.instrument.findFirst({ where: { slug: instrumentSlug, instrumentType: InstrumentType.DCP } })
    : null;

  if (!instrument) {
    return NextResponse.json({ ok: false, lga, error: "Instrument not found" }, { status: 404 });
  }

  const [clauseCount, dcpClauseCount, chunkCount, sampleChunks] = await Promise.all([
    prisma.clause.count({ where: { instrumentId: instrument.id, isCurrent: true } }),
    prisma.dCPClause.count({ where: { lgaCode: lga } }),
    prisma.workspaceSourceChunk.count({ where: { lgaCode: lga, sourceType: WorkspaceSourceType.council_dcp } }),
    prisma.workspaceSourceChunk.findMany({
      where: { lgaCode: lga, sourceType: WorkspaceSourceType.council_dcp },
      orderBy: { createdAt: "asc" },
      take: 3,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    lga,
    instrumentId: instrument.id,
    instrumentSlug: instrument.slug,
    clauseCount,
    dcpClauseCount,
    chunkCount,
    sampleChunks: sampleChunks.map((chunk) => ({
      id: chunk.id,
      len: chunk.content.length,
    })),
  });
}

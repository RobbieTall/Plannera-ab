import { NextResponse } from "next/server";

import { WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const toIsoOrNull = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!process.env.INGEST_ADMIN_SECRET || secret !== process.env.INGEST_ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [instruments, dcpGroups] = await Promise.all([
    prisma.instrument.findMany({
      select: {
        slug: true,
        name: true,
        shortName: true,
        instrumentType: true,
        _count: { select: { clauses: true } },
        clauses: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { slug: "asc" },
    }),
    prisma.workspaceSourceChunk.groupBy({
      by: ["lgaCode"],
      where: {
        sourceType: WorkspaceSourceType.council_dcp,
        lgaCode: { not: null },
      },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { lgaCode: "asc" },
    }),
  ]);

  const instrumentStatuses = instruments.map((instrument) => ({
    slug: instrument.slug,
    name: instrument.name,
    shortName: instrument.shortName,
    instrumentType: instrument.instrumentType,
    clauseCount: instrument._count.clauses,
    lastIngestedAt: toIsoOrNull(instrument.clauses[0]?.createdAt),
  }));

  const councilDcp = dcpGroups.map((group) => ({
    lgaCode: group.lgaCode ?? "",
    chunkCount: group._count._all,
    lastIngestedAt: toIsoOrNull(group._max.createdAt),
  }));

  const byronLepClauses = instrumentStatuses.find((instrument) => instrument.slug === "byron-lep-2014")?.clauseCount ?? 0;
  const kempseylLepClauses = instrumentStatuses.find((instrument) => instrument.slug === "kempsey-lep-2013")?.clauseCount ?? 0;
  const byronDcpChunks = councilDcp.find((entry) => entry.lgaCode === "BYRON")?.chunkCount ?? 0;
  const kempseylDcpChunks = councilDcp.find((entry) => entry.lgaCode === "KEMPSEY")?.chunkCount ?? 0;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    instruments: instrumentStatuses,
    councilDcp,
    summary: {
      totalInstruments: instrumentStatuses.length,
      instrumentsWithClauses: instrumentStatuses.filter((instrument) => instrument.clauseCount > 0).length,
      totalClauses: instrumentStatuses.reduce((total, instrument) => total + instrument.clauseCount, 0),
      totalDcpChunks: councilDcp.reduce((total, entry) => total + entry.chunkCount, 0),
      byronLepClauses,
      kempseylLepClauses,
      seppCount: instrumentStatuses.filter(
        (instrument) => instrument.instrumentType === "SEPP" && instrument.clauseCount > 0,
      ).length,
      byronDcpChunks,
      kempseylDcpChunks,
    },
  });
}

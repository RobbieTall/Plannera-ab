import { LgaCoverageMaturity } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lgaCode = url.searchParams.get("lgaCode")?.trim().toUpperCase();

  if (!lgaCode) {
    return NextResponse.json({ error: "missing_lga_code" }, { status: 400 });
  }

  const coverage = await prisma.lgaCoverageState.findUnique({
    where: { lgaCode },
    select: { lgaCode: true, state: true, activePreparationId: true, updatedAt: true },
  });

  return NextResponse.json({
    lgaCode,
    state: coverage?.state ?? LgaCoverageMaturity.NOT_STARTED,
    activeJobId: coverage?.activePreparationId ?? null,
    lastUpdatedAt: coverage?.updatedAt?.toISOString() ?? null,
  });
}

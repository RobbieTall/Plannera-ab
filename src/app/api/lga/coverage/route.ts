import { LgaCoverageMaturity } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getLgaPreparationServiceTarget } from "@/lib/lga-preparation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lgaCode = (url.searchParams.get("lgaCode") ?? url.searchParams.get("lga"))?.trim().toUpperCase();

  if (!lgaCode) {
    return NextResponse.json({ error: "missing_lga_code" }, { status: 400 });
  }

  const coverage = await prisma.lgaCoverageState.findUnique({
    where: { lgaCode },
    select: { lgaCode: true, state: true, activePreparationId: true, updatedAt: true },
  });

  const preparationJob = coverage?.activePreparationId
    ? await prisma.lgaPreparationJob.findUnique({
        where: { id: coverage.activePreparationId },
        select: { createdAt: true, status: true },
      })
    : coverage?.state === LgaCoverageMaturity.FAILED_REVIEW_NEEDED
      ? await prisma.lgaPreparationJob.findFirst({
          where: { lgaCode, status: "FAILED" },
          orderBy: { finishedAt: "desc" },
          select: { createdAt: true, status: true },
        })
      : null;

  return NextResponse.json({
    lgaCode,
    state: coverage?.state ?? LgaCoverageMaturity.NOT_STARTED,
    activeJobId: coverage?.activePreparationId ?? null,
    activeJobStatus: preparationJob?.status ?? null,
    serviceTargetAt: preparationJob
      ? getLgaPreparationServiceTarget(preparationJob.createdAt).toISOString()
      : null,
    preparationResolution:
      coverage?.state === LgaCoverageMaturity.FAILED_REVIEW_NEEDED
        ? "OPERATOR_REVIEW_REQUIRED"
        : null,
    lastUpdatedAt: coverage?.updatedAt?.toISOString() ?? null,
  });
}

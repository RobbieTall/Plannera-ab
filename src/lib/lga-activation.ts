import { LgaCoverageMaturity, LgaPreparationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const ACTIVE_JOB_STATUSES: LgaPreparationStatus[] = [LgaPreparationStatus.QUEUED, LgaPreparationStatus.PROCESSING];

const toDedupeKey = (lgaCode: string) => `prepare_lga_pack:${lgaCode}`;

export const queueLgaPreparation = async (params: { lgaCode: string; projectId?: string | null }) => {
  const lgaCode = params.lgaCode.trim().toUpperCase();
  const dedupeKey = toDedupeKey(lgaCode);

  return prisma.$transaction(async (tx) => {
    const coverage = await tx.lgaCoverageState.upsert({
      where: { lgaCode },
      update: {},
      create: { lgaCode, state: LgaCoverageMaturity.QUEUED },
    });

    const existing = await tx.lgaPreparationJob.findFirst({
      where: { lgaCode, status: { in: ACTIVE_JOB_STATUSES } },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      if (coverage.state === LgaCoverageMaturity.NOT_STARTED) {
        await tx.lgaCoverageState.update({ where: { lgaCode }, data: { state: LgaCoverageMaturity.QUEUED } });
      }
      return { queued: false, deduped: true, jobId: existing.id, coverageState: coverage.state };
    }

    const job = await tx.lgaPreparationJob.create({
      data: {
        lgaCode,
        dedupeKey,
        status: LgaPreparationStatus.QUEUED,
        requestedByProjectId: params.projectId ?? null,
      },
    });

    await tx.lgaCoverageState.update({
      where: { lgaCode },
      data: { state: LgaCoverageMaturity.QUEUED, activePreparationId: job.id },
    });

    return { queued: true, deduped: false, jobId: job.id, coverageState: LgaCoverageMaturity.QUEUED };
  });
};

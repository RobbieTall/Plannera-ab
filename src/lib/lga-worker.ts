import { LgaCoverageMaturity, LgaPreparationStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { syncInstrument } from "@/lib/legislation/service";
import { getStaleArtefactsForLga, markArtefactStale } from "@/lib/artefact-regeneration";
import { ALL_INSTRUMENT_CONFIG } from "@/lib/legislation/config";
import type { InstrumentConfig } from "@/lib/legislation/types";
import { findLocalNswLepsByLga } from "@/lib/lep/nsw-lep-registry";
import { resolveCanonicalNswLga } from "@/lib/lep/nsw-lga-normaliser";

const FAILED_REVIEW_NEEDED = "FAILED_REVIEW_NEEDED" as LgaCoverageMaturity;

type ClaimedLgaJob = {
  id: string;
  lgaCode: string;
  requestedByProjectId: string | null;
};

export type ProcessLgaJobResult = {
  processed: boolean;
  lgaCode: string | null;
  jobId: string | null;
  result: {
    status: "completed" | "failed" | "idle";
    instrumentSlugs?: string[];
    clauseCount?: number;
    coverageState?: LgaCoverageMaturity;
    error?: string;
  };
};

const normalizeForMatch = (value: string | null | undefined) => resolveCanonicalNswLga(value) ?? "";

export const resolveApplicableInstrumentSlugsForLga = (lgaCode: string): string[] => {
  const localLepSlugs = findLocalNswLepsByLga(lgaCode).map((entry) => entry.config.slug);
  const canonicalLga = normalizeForMatch(lgaCode);

  const configMatches = ALL_INSTRUMENT_CONFIG.filter((config: InstrumentConfig) => {
    if (config.instrumentType !== "LEP") return false;
    const haystacks = [config.slug.replace(/[-_]+/g, " "), config.name, config.shortName];
    return haystacks.some((value) => normalizeForMatch(value).includes(canonicalLga));
  }).map((config) => config.slug);

  return Array.from(new Set([...localLepSlugs, ...configMatches]));
};

const claimNextQueuedJob = async (): Promise<ClaimedLgaJob | null> =>
  prisma.$transaction(async (tx) => {
    const job = await tx.lgaPreparationJob.findFirst({
      where: { status: LgaPreparationStatus.QUEUED },
      orderBy: { createdAt: "asc" },
      select: { id: true, lgaCode: true, requestedByProjectId: true },
    });

    if (!job) return null;

    const claimed = await tx.lgaPreparationJob.updateMany({
      where: { id: job.id, status: LgaPreparationStatus.QUEUED },
      data: { status: LgaPreparationStatus.PROCESSING, startedAt: new Date(), errorMessage: null },
    });

    if (claimed.count !== 1) return null;

    await tx.lgaCoverageState.upsert({
      where: { lgaCode: job.lgaCode },
      update: { state: LgaCoverageMaturity.PROCESSING, activePreparationId: job.id },
      create: {
        lgaCode: job.lgaCode,
        state: LgaCoverageMaturity.PROCESSING,
        activePreparationId: job.id,
      },
    });

    return job;
  });

const updateProjectPreparationNotice = async (projectId: string, notice: Prisma.InputJsonObject) => {
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { publicId: projectId }] },
    select: { id: true, dcpData: true },
  });
  if (!project) return;

  const existing =
    project.dcpData && typeof project.dcpData === "object" && !Array.isArray(project.dcpData)
      ? (project.dcpData as Prisma.JsonObject)
      : {};

  await prisma.project.update({
    where: { id: project.id },
    data: {
      dcpData: {
        ...existing,
        lgaPreparation: notice,
      },
    },
  });
};

const markJobFailed = async (job: ClaimedLgaJob, error: unknown): Promise<ProcessLgaJobResult> => {
  const errorMessage = error instanceof Error ? error.message : "Unknown LGA preparation failure";
  console.error("[lga-worker] Failed to prepare LGA", { lgaCode: job.lgaCode, jobId: job.id, error });

  await prisma.$transaction(async (tx) => {
    await tx.lgaPreparationJob.update({
      where: { id: job.id },
      data: { status: LgaPreparationStatus.FAILED, finishedAt: new Date(), errorMessage },
    });
    await tx.lgaCoverageState.update({
      where: { lgaCode: job.lgaCode },
      data: { state: FAILED_REVIEW_NEEDED, activePreparationId: null },
    });
  });

  if (job.requestedByProjectId) {
    await updateProjectPreparationNotice(job.requestedByProjectId, {
      lgaCode: job.lgaCode,
      status: "failed",
      errorMessage,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    processed: true,
    lgaCode: job.lgaCode,
    jobId: job.id,
    result: { status: "failed", coverageState: FAILED_REVIEW_NEEDED, error: errorMessage },
  };
};

export const processNextLgaJob = async (): Promise<ProcessLgaJobResult> => {
  const job = await claimNextQueuedJob();
  if (!job) {
    return { processed: false, lgaCode: null, jobId: null, result: { status: "idle" } };
  }

  try {
    const instrumentSlugs = resolveApplicableInstrumentSlugsForLga(job.lgaCode);

    for (const slug of instrumentSlugs) {
      const syncResult = await syncInstrument(slug);
      if (syncResult.status === "error") {
        throw syncResult.error;
      }
    }

    const clauseCount = instrumentSlugs.length
      ? await prisma.clause.count({
          where: {
            isCurrent: true,
            instrument: { slug: { in: instrumentSlugs } },
          },
        })
      : 0;

    const coverageState = clauseCount > 0 ? LgaCoverageMaturity.SEARCHABLE_READY : FAILED_REVIEW_NEEDED;
    const jobStatus = clauseCount > 0 ? LgaPreparationStatus.COMPLETED : LgaPreparationStatus.FAILED;
    const errorMessage = clauseCount > 0 ? null : "No current clauses found after syncing applicable instruments.";

    await prisma.$transaction(async (tx) => {
      await tx.lgaPreparationJob.update({
        where: { id: job.id },
        data: { status: jobStatus, finishedAt: new Date(), errorMessage },
      });
      await tx.lgaCoverageState.update({
        where: { lgaCode: job.lgaCode },
        data: {
          state: coverageState,
          activePreparationId: null,
          lastPreparedAt: clauseCount > 0 ? new Date() : undefined,
        },
      });
    });

    if (coverageState === LgaCoverageMaturity.SEARCHABLE_READY) {
      const staleArtefacts = await getStaleArtefactsForLga(job.lgaCode);
      await Promise.all(staleArtefacts.map((artefact) => markArtefactStale(artefact.artefactId)));
    }

    if (job.requestedByProjectId) {
      await updateProjectPreparationNotice(job.requestedByProjectId, {
        lgaCode: job.lgaCode,
        status: clauseCount > 0 ? "completed" : "failed",
        clauseCount,
        instrumentSlugs,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      processed: true,
      lgaCode: job.lgaCode,
      jobId: job.id,
      result: {
        status: clauseCount > 0 ? "completed" : "failed",
        instrumentSlugs,
        clauseCount,
        coverageState,
        ...(errorMessage ? { error: errorMessage } : {}),
      },
    };
  } catch (error) {
    return markJobFailed(job, error);
  }
};

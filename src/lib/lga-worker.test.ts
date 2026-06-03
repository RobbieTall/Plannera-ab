import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStaleArtefactsForLgaMock, markArtefactStaleMock, prismaMock, syncInstrumentMock } = vi.hoisted(() => ({
  getStaleArtefactsForLgaMock: vi.fn(),
  markArtefactStaleMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    lgaPreparationJob: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    lgaCoverageState: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    clause: {
      count: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  syncInstrumentMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/legislation/service", () => ({ syncInstrument: syncInstrumentMock }));

vi.mock("@/lib/artefact-regeneration", () => ({
  getStaleArtefactsForLga: getStaleArtefactsForLgaMock,
  markArtefactStale: markArtefactStaleMock,
}));

vi.mock("@/lib/legislation/config", () => ({
  ALL_INSTRUMENT_CONFIG: [
    {
      slug: "kempsey-lep-2013",
      name: "Kempsey Local Environmental Plan 2013",
      shortName: "Kempsey LEP 2013",
      instrumentType: "LEP",
      sourceUrl: "https://example.test/kempsey",
    },
  ],
}));

vi.mock("@/lib/lep/nsw-lep-registry", () => ({
  findLocalNswLepsByLga: vi.fn(() => [{ config: { slug: "kempsey-lep-2013" } }]),
}));

vi.mock("@/lib/lep/nsw-lga-normaliser", () => ({
  resolveCanonicalNswLga: vi.fn((value: string | null | undefined) => value?.toLowerCase().replace(/\s+shire$/, "") ?? null),
}));

vi.mock("@prisma/client", () => ({
  LgaCoverageMaturity: {
    NOT_STARTED: "NOT_STARTED",
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    SEARCHABLE_READY: "SEARCHABLE_READY",
    STRUCTURED_PARTIAL: "STRUCTURED_PARTIAL",
    VERIFIED: "VERIFIED",
    FAILED_REVIEW_NEEDED: "FAILED_REVIEW_NEEDED",
  },
  LgaPreparationStatus: {
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  },
  Prisma: {},
}));

import { processNextLgaJob } from "./lga-worker";

describe("processNextLgaJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.project.findFirst.mockResolvedValue(null);
    getStaleArtefactsForLgaMock.mockResolvedValue([]);
  });

  it("claims the oldest queued job, syncs applicable instruments, counts clauses, and completes it", async () => {
    prismaMock.lgaPreparationJob.findFirst.mockResolvedValue({
      id: "job-1",
      lgaCode: "KEMPSEY",
      requestedByProjectId: null,
    });
    prismaMock.lgaPreparationJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.lgaCoverageState.upsert.mockResolvedValue({});
    syncInstrumentMock.mockResolvedValue({ status: "ok", config: { slug: "kempsey-lep-2013" } });
    prismaMock.clause.count.mockResolvedValue(12);
    getStaleArtefactsForLgaMock.mockResolvedValue([{ artefactId: "artefact-1" }]);
    markArtefactStaleMock.mockResolvedValue(undefined);
    prismaMock.lgaPreparationJob.update.mockResolvedValue({});
    prismaMock.lgaCoverageState.update.mockResolvedValue({});

    const result = await processNextLgaJob();

    expect(result).toMatchObject({
      processed: true,
      lgaCode: "KEMPSEY",
      jobId: "job-1",
      result: { status: "completed", clauseCount: 12, coverageState: "SEARCHABLE_READY" },
    });
    expect(prismaMock.lgaPreparationJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job-1", status: "QUEUED" },
      data: expect.objectContaining({ status: "PROCESSING", errorMessage: null }),
    });
    expect(prismaMock.lgaCoverageState.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { lgaCode: "KEMPSEY" },
      update: expect.objectContaining({ state: "PROCESSING", activePreparationId: "job-1" }),
    }));
    expect(syncInstrumentMock).toHaveBeenCalledWith("kempsey-lep-2013");
    expect(getStaleArtefactsForLgaMock).toHaveBeenCalledWith("KEMPSEY");
    expect(markArtefactStaleMock).toHaveBeenCalledWith("artefact-1");
    expect(prismaMock.lgaPreparationJob.update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: "job-1" },
      data: expect.objectContaining({ status: "COMPLETED", errorMessage: null }),
    }));
  });

  it("marks the job and coverage failed when instrument sync fails", async () => {
    prismaMock.lgaPreparationJob.findFirst.mockResolvedValue({
      id: "job-2",
      lgaCode: "KEMPSEY",
      requestedByProjectId: null,
    });
    prismaMock.lgaPreparationJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.lgaCoverageState.upsert.mockResolvedValue({});
    syncInstrumentMock.mockRejectedValue(new Error("network down"));
    prismaMock.lgaPreparationJob.update.mockResolvedValue({});
    prismaMock.lgaCoverageState.update.mockResolvedValue({});

    const result = await processNextLgaJob();

    expect(result).toMatchObject({
      processed: true,
      lgaCode: "KEMPSEY",
      jobId: "job-2",
      result: { status: "failed", coverageState: "FAILED_REVIEW_NEEDED", error: "network down" },
    });
    expect(prismaMock.lgaPreparationJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-2" },
      data: expect.objectContaining({ status: "FAILED", errorMessage: "network down" }),
    }));
    expect(prismaMock.lgaCoverageState.update).toHaveBeenCalledWith({
      where: { lgaCode: "KEMPSEY" },
      data: { state: "FAILED_REVIEW_NEEDED", activePreparationId: null },
    });
  });

  it("returns idle when no queued job is available", async () => {
    prismaMock.lgaPreparationJob.findFirst.mockResolvedValue(null);

    await expect(processNextLgaJob()).resolves.toEqual({
      processed: false,
      lgaCode: null,
      jobId: null,
      result: { status: "idle" },
    });
  });
});

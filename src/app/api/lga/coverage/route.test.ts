import { beforeEach, describe, expect, it, vi } from "vitest";

const { lgaCoverageFindUniqueMock, lgaPreparationFindUniqueMock, lgaPreparationFindFirstMock } = vi.hoisted(() => ({
  lgaCoverageFindUniqueMock: vi.fn(),
  lgaPreparationFindUniqueMock: vi.fn(),
  lgaPreparationFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lgaCoverageState: {
      findUnique: lgaCoverageFindUniqueMock,
    },
    lgaPreparationJob: {
      findUnique: lgaPreparationFindUniqueMock,
      findFirst: lgaPreparationFindFirstMock,
    },
  },
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
}));

import { GET } from "./route";

describe("GET /api/lga/coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lgaPreparationFindUniqueMock.mockResolvedValue(null);
    lgaPreparationFindFirstMock.mockResolvedValue(null);
  });

  it("returns the stored coverage state for an LGA", async () => {
    lgaCoverageFindUniqueMock.mockResolvedValue({
      lgaCode: "PARRAMATTA",
      state: "PROCESSING",
      activePreparationId: "job-123",
      updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    });

    lgaPreparationFindUniqueMock.mockResolvedValue({
      createdAt: new Date("2026-06-02T00:00:00.000Z"),
      status: "PROCESSING",
    });

    const response = await GET(new Request("http://localhost/api/lga/coverage?lgaCode=parramatta"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(lgaCoverageFindUniqueMock).toHaveBeenCalledWith({
      where: { lgaCode: "PARRAMATTA" },
      select: { lgaCode: true, state: true, activePreparationId: true, updatedAt: true },
    });
    expect(payload).toEqual({
      lgaCode: "PARRAMATTA",
      state: "PROCESSING",
      activeJobId: "job-123",
      activeJobStatus: "PROCESSING",
      serviceTargetAt: "2026-06-04T00:00:00.000Z",
      preparationResolution: null,
      lastUpdatedAt: "2026-06-02T00:00:00.000Z",
    });
  });

  it("returns NOT_STARTED when no coverage record exists", async () => {
    lgaCoverageFindUniqueMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/lga/coverage?lgaCode=PARRAMATTA"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      lgaCode: "PARRAMATTA",
      state: "NOT_STARTED",
      activeJobId: null,
      activeJobStatus: null,
      serviceTargetAt: null,
      preparationResolution: null,
      lastUpdatedAt: null,
    });
  });

  it("accepts the lga query alias used by the workspace status panel", async () => {
    lgaCoverageFindUniqueMock.mockResolvedValue({
      lgaCode: "BYRON",
      state: "QUEUED",
      activePreparationId: "job-456",
      updatedAt: new Date("2026-06-02T01:00:00.000Z"),
    });

    lgaPreparationFindUniqueMock.mockResolvedValue({
      createdAt: new Date("2026-06-02T01:00:00.000Z"),
      status: "QUEUED",
    });

    const response = await GET(new Request("http://localhost/api/lga/coverage?lga=byron"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(lgaCoverageFindUniqueMock).toHaveBeenCalledWith({
      where: { lgaCode: "BYRON" },
      select: { lgaCode: true, state: true, activePreparationId: true, updatedAt: true },
    });
    expect(payload).toEqual({
      lgaCode: "BYRON",
      state: "QUEUED",
      activeJobId: "job-456",
      activeJobStatus: "QUEUED",
      serviceTargetAt: "2026-06-04T01:00:00.000Z",
      preparationResolution: null,
      lastUpdatedAt: "2026-06-02T01:00:00.000Z",
    });
  });

  it("returns a failed preparation error only when review is needed", async () => {
    lgaCoverageFindUniqueMock.mockResolvedValue({
      lgaCode: "BYRON",
      state: "FAILED_REVIEW_NEEDED",
      activePreparationId: null,
      updatedAt: new Date("2026-06-05T01:00:00.000Z"),
    });
    lgaPreparationFindFirstMock.mockResolvedValue({
      createdAt: new Date("2026-06-02T01:00:00.000Z"),
      status: "FAILED",
    });

    const response = await GET(new Request("http://localhost/api/lga/coverage?lga=byron"));
    const payload = await response.json();

    expect(payload.preparationResolution).toBe("OPERATOR_REVIEW_REQUIRED");
    expect(payload.activeJobStatus).toBe("FAILED");
    expect(payload.serviceTargetAt).toBe("2026-06-04T01:00:00.000Z");
    expect(payload).not.toHaveProperty("errorMessage");
    expect(lgaPreparationFindFirstMock).toHaveBeenCalledWith({
      where: { lgaCode: "BYRON", status: "FAILED" },
      orderBy: { finishedAt: "desc" },
      select: { createdAt: true, status: true },
    });
  });

  it("rejects missing LGA codes", async () => {
    const response = await GET(new Request("http://localhost/api/lga/coverage"));
    expect(response.status).toBe(400);
  });
});

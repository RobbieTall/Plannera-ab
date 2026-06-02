import { beforeEach, describe, expect, it, vi } from "vitest";

const { lgaCoverageFindUniqueMock } = vi.hoisted(() => ({
  lgaCoverageFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lgaCoverageState: {
      findUnique: lgaCoverageFindUniqueMock,
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
  });

  it("returns the stored coverage state for an LGA", async () => {
    lgaCoverageFindUniqueMock.mockResolvedValue({
      lgaCode: "PARRAMATTA",
      state: "PROCESSING",
      activePreparationId: "job-123",
      updatedAt: new Date("2026-06-02T00:00:00.000Z"),
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
      lastUpdatedAt: null,
    });
  });

  it("rejects missing LGA codes", async () => {
    const response = await GET(new Request("http://localhost/api/lga/coverage"));
    expect(response.status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistSiteContextFromCandidate } from "../../../lib/site-context";
import { candidateSchema } from "./schema";

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteContext: {
      upsert: upsertMock,
    },
  },
}));

beforeEach(() => {
  upsertMock.mockReset();
});

describe("site-context api validation", () => {
  it("accepts Google candidates with pending LGA data", () => {
    const parsed = candidateSchema.parse({
      id: "place-123",
      formattedAddress: "22 Campbell Parade, Bondi Beach NSW 2026",
      provider: "google",
      latitude: -33.8915,
      longitude: 151.2767,
      lgaName: null,
    });

    expect(parsed.lgaName).toBeNull();
    expect(parsed.provider).toEqual("google");
  });

  it("persists Google candidates without LGA data", async () => {
    const candidate = {
      id: "place-456",
      formattedAddress: "22 Campbell Parade, Bondi Beach NSW 2026",
      provider: "google" as const,
      latitude: "-33.8915",
      longitude: "151.2767",
      lgaName: null,
    };

    const mockSite = {
      id: "ctx-1",
      projectId: "proj-1",
      addressInput: "22 campbell",
      formattedAddress: candidate.formattedAddress,
      lgaName: null,
      lgaCode: null,
      parcelId: null,
      lot: null,
      planNumber: null,
      latitude: -33.8915,
      longitude: 151.2767,
      zone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    upsertMock.mockResolvedValue(mockSite);

    const result = await persistSiteContextFromCandidate({
      projectId: "proj-1",
      addressInput: "22 campbell",
      candidate: candidateSchema.parse(candidate),
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      update: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        lgaName: null,
        latitude: candidateSchema.parse(candidate).latitude,
        longitude: candidateSchema.parse(candidate).longitude,
      }),
      create: expect.objectContaining({ formattedAddress: candidate.formattedAddress }),
    });
    expect(result).toEqual(mockSite);
  });
});

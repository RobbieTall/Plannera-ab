import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistSiteContextFromCandidate } from "../../../lib/site-context";
import { POST } from "./route";
import { candidateSchema } from "./schema";

const { upsertMock, findProjectByExternalIdMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findProjectByExternalIdMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteContext: {
      upsert: upsertMock,
    },
  },
}));

vi.mock("@/lib/project-identifiers", () => ({
  findProjectByExternalId: findProjectByExternalIdMock,
  normalizeProjectId: (value: string) => value?.trim?.() ?? value,
}));

beforeEach(() => {
  upsertMock.mockReset();
  findProjectByExternalIdMock.mockReset();
  findProjectByExternalIdMock.mockImplementation(async (_prisma, id: string) => ({
    id: `db-${id}`,
    publicId: id,
  }));
});

const buildMockSite = (overrides: Partial<ReturnType<typeof createBaseSite>> = {}) => ({
  ...createBaseSite(),
  ...overrides,
});

function createBaseSite() {
  return {
    id: "ctx-1",
    projectId: "db-proj-1",
    addressInput: "22 campbell",
    formattedAddress: "22 Campbell Parade, Bondi Beach NSW 2026",
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
  } as const;
}

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

    const parsedCandidate = candidateSchema.parse(candidate);
    const mockSite = buildMockSite({
      formattedAddress: candidate.formattedAddress,
      latitude: parsedCandidate.latitude,
      longitude: parsedCandidate.longitude,
    });

    upsertMock.mockResolvedValue(mockSite);

    const result = await persistSiteContextFromCandidate({
      projectId: "proj-1",
      addressInput: "22 campbell",
      candidate: parsedCandidate,
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-1" },
      update: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        lgaName: null,
        latitude: parsedCandidate.latitude,
        longitude: parsedCandidate.longitude,
      }),
      create: expect.objectContaining({ formattedAddress: candidate.formattedAddress }),
    });
    expect(result).toEqual(mockSite);
  });

  it("accepts set-site dialog payloads for Google candidates via the API route", async () => {
    const candidate = {
      id: "place-789",
      formattedAddress: "22 Campbell Avenue, Normanhurst NSW 2076",
      provider: "google" as const,
      latitude: -33.738,
      longitude: 151.093,
      lgaName: null,
    };

    const mockSite = buildMockSite({
      id: "ctx-2",
      projectId: "db-proj-2",
      addressInput: "22 campbell",
      formattedAddress: candidate.formattedAddress,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    });

    upsertMock.mockResolvedValue(mockSite);

    const request = new Request("http://localhost/api/site-context", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-2", candidate, addressInput: "22 campbell" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { siteContext?: unknown };

    expect(response.status).toEqual(200);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-2" },
      update: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }),
      create: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }),
    });
    expect(payload.siteContext).toMatchObject({ formattedAddress: candidate.formattedAddress });
  });

  it("persists Google set-site payloads that include coordinates and pending LGA", async () => {
    const candidate = {
      id: "ChIJexamplePlaceId",
      formattedAddress: "22 Campbell Parade, Bondi Beach NSW, Australia",
      provider: "google" as const,
      latitude: -33.891,
      longitude: 151.276,
      lgaName: null,
      confidence: 0.92,
    };

    const mockSite = buildMockSite({
      id: "ctx-google",
      projectId: "db-proj-google",
      formattedAddress: candidate.formattedAddress,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    });

    upsertMock.mockResolvedValue(mockSite);

    const request = new Request("http://localhost/api/site-context", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-google", candidate, addressInput: candidate.formattedAddress }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { siteContext?: unknown };

    expect(response.status).toEqual(200);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-google" },
      update: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }),
      create: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }),
    });
    expect(payload.siteContext).toMatchObject({ formattedAddress: candidate.formattedAddress });
  });

  it("accepts Google candidates with pending LGA from the API route", async () => {
    const candidate = {
      provider: "google" as const,
      address: "4 Jaques Avenue, Bondi Beach NSW, Australia",
      latitude: -33.888,
      longitude: 151.274,
      placeId: "PLACE123",
      lga: null,
    };

    const mockSite = buildMockSite({
      id: "ctx-google-e2e",
      projectId: "db-proj-google-e2e",
      formattedAddress: candidate.address,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    });

    upsertMock.mockResolvedValue(mockSite);

    const request = new Request("http://localhost/api/site-context", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-google-e2e", candidate, addressInput: candidate.address }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { siteContext?: unknown };

    expect(response.status).toEqual(200);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-google-e2e" },
      update: expect.objectContaining({
        formattedAddress: candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }),
      create: expect.objectContaining({
        formattedAddress: candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }),
    });
    expect(payload.siteContext).toMatchObject({ formattedAddress: candidate.address });
  });

  it("accepts Google candidates without coordinates", async () => {
    const candidate = {
      provider: "google" as const,
      address: "4 Jaques Avenue, Bondi Beach NSW, Australia",
      placeId: "PLACE_WITHOUT_COORDS",
    };

    const mockSite = buildMockSite({
      id: "ctx-google-missing-coords",
      projectId: "db-proj-google-missing-coords",
      formattedAddress: candidate.address,
      latitude: null,
      longitude: null,
    });

    upsertMock.mockResolvedValue(mockSite);

    const request = new Request("http://localhost/api/site-context", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-google-missing-coords",
        candidate,
        addressInput: candidate.address,
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { siteContext?: unknown };

    expect(response.status).toEqual(200);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-google-missing-coords" },
      update: expect.objectContaining({
        formattedAddress: candidate.address,
        latitude: null,
        longitude: null,
      }),
      create: expect.objectContaining({
        formattedAddress: candidate.address,
        latitude: null,
        longitude: null,
      }),
    });
    expect(payload.siteContext).toMatchObject({ formattedAddress: candidate.address });
  });

  it("persists Google candidates with null coordinates", async () => {
    const candidate = {
      provider: "google" as const,
      formattedAddress: "4 Jaques Avenue, Bondi Beach NSW, Australia",
      placeId: "PLACE_NULL_COORDS",
    };

    const mockSite = buildMockSite({
      id: "ctx-google-null-coords",
      projectId: "db-proj-google-null-coords",
      formattedAddress: candidate.formattedAddress,
      latitude: null,
      longitude: null,
    });

    upsertMock.mockResolvedValue(mockSite);

    const parsedCandidate = candidateSchema.parse(candidate);
    const result = await persistSiteContextFromCandidate({
      projectId: "proj-google-null-coords",
      addressInput: candidate.formattedAddress,
      candidate: parsedCandidate,
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-google-null-coords" },
      update: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        latitude: null,
        longitude: null,
      }),
      create: expect.objectContaining({
        formattedAddress: candidate.formattedAddress,
        latitude: null,
        longitude: null,
      }),
    });
    expect(result).toEqual(mockSite);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistSiteContextFromCandidate } from "../../../lib/site-context";
import { POST } from "./route";
import { candidateSchema } from "./schema";

const { upsertMock, projectUpdateMock, findProjectByExternalIdMock, getZoningForSiteMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  projectUpdateMock: vi.fn(),
  findProjectByExternalIdMock: vi.fn(),
  getZoningForSiteMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteContext: {
      upsert: upsertMock,
    },
    project: {
      update: projectUpdateMock,
      findUnique: vi.fn(async () => null),
    },
  },
}));

vi.mock("@/lib/project-identifiers", () => ({
  findProjectByExternalId: findProjectByExternalIdMock,
  normalizeProjectId: (value: string) => value?.trim?.() ?? value,
}));

vi.mock("@/lib/nsw-zoning", () => ({
  getZoningForSite: getZoningForSiteMock,
  formatZoningLabel: (result: { zoneCode?: string; zoneName?: string } | null) =>
    result ? [result.zoneCode, result.zoneName].filter(Boolean).join(" – ") : null,
}));

beforeEach(() => {
  upsertMock.mockReset();
  projectUpdateMock.mockReset();
  findProjectByExternalIdMock.mockReset();
  getZoningForSiteMock.mockReset();
  getZoningForSiteMock.mockResolvedValue(null);
  findProjectByExternalIdMock.mockImplementation(async (_prisma, id: string) => ({
    id: `db-${id}`,
    publicId: id,
  }));
});

const buildMockSite = (overrides: Partial<ReturnType<typeof createBaseSite>> = {}) => ({
  ...createBaseSite(),
  ...overrides,
});

function createBaseSite(): {
  id: string;
  projectId: string;
  addressInput: string;
  formattedAddress: string;
  lgaName: string | null;
  lgaCode: string | null;
  parcelId: string | null;
  lot: string | null;
  planNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
  createdAt: Date;
  updatedAt: Date;
} {
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
  };
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
      candidate: parsedCandidate as Parameters<typeof persistSiteContextFromCandidate>[0]["candidate"],
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
      candidate: parsedCandidate as Parameters<typeof persistSiteContextFromCandidate>[0]["candidate"],
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
  it("persists zoning from a resolver candidate zone when the spatial lookup returns no zoning", async () => {
    const candidate = {
      id: "candidate-zoned",
      formattedAddress: "32 Smith St, Kempsey NSW 2440, Australia",
      provider: "google" as const,
      latitude: -31.0802,
      longitude: 152.8421,
      lgaName: "Kempsey Shire",
      zone: "E2 Commercial Centre",
    };

    const mockSite = buildMockSite({
      id: "ctx-zoned",
      projectId: "db-proj-zoned",
      formattedAddress: candidate.formattedAddress,
      lgaName: candidate.lgaName,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      zone: "E2 – Commercial Centre",
    });

    upsertMock.mockResolvedValue(mockSite);

    await persistSiteContextFromCandidate({
      projectId: "proj-zoned",
      addressInput: candidate.formattedAddress,
      candidate,
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-zoned" },
      update: expect.objectContaining({ zone: "E2 – Commercial Centre" }),
      create: expect.objectContaining({ zone: "E2 – Commercial Centre" }),
    });
    expect(projectUpdateMock).toHaveBeenCalledWith({
      where: { id: "db-proj-zoned" },
      data: { zoningCode: "E2", zoningName: "Commercial Centre", zoningSource: "NSW_EPI_LZN" },
    });
  });


  it("does not infer a fake zoning code from a plain zone name", async () => {
    const candidate = {
      id: "candidate-zone-name-only",
      formattedAddress: "10 Example Street, Sydney NSW 2000",
      provider: "google" as const,
      latitude: -33.8688,
      longitude: 151.2093,
      lgaName: "Sydney",
      zone: "Commercial Centre",
    };

    const mockSite = buildMockSite({
      id: "ctx-zone-name-only",
      projectId: "db-proj-zone-name-only",
      formattedAddress: candidate.formattedAddress,
      lgaName: candidate.lgaName,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      zone: "Commercial Centre",
    });

    upsertMock.mockResolvedValue(mockSite);

    await persistSiteContextFromCandidate({
      projectId: "proj-zone-name-only",
      addressInput: candidate.formattedAddress,
      candidate,
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { projectId: "db-proj-zone-name-only" },
      update: expect.objectContaining({ zone: "Commercial Centre" }),
      create: expect.objectContaining({ zone: "Commercial Centre" }),
    });
    expect(projectUpdateMock).toHaveBeenCalledWith({
      where: { id: "db-proj-zone-name-only" },
      data: { zoningCode: null, zoningName: null, zoningSource: null },
    });
    expect(projectUpdateMock).not.toHaveBeenCalledWith({
      where: { id: "db-proj-zone-name-only" },
      data: expect.objectContaining({ zoningCode: "COM" }),
    });
  });

  it("applies scoped launch-fixture zoning for fresh Byron and Kempsey site confirmations", async () => {
    const fixtures = [
      { projectId: "proj-byron", address: "45 Broken Head Road, Byron Bay NSW 2481", code: "SP3", name: "Tourist" },
      { projectId: "proj-kempsey-sp2", address: "32 Smith St Kempsey NSW 2440", code: "SP2", name: "Infrastructure" },
      { projectId: "proj-kempsey-e2", address: "52 Belgrave St Kempsey NSW 2440", code: "E2", name: "Commercial Centre" },
    ];

    for (const fixture of fixtures) {
      upsertMock.mockResolvedValueOnce(
        buildMockSite({
          id: `ctx-${fixture.projectId}`,
          projectId: `db-${fixture.projectId}`,
          formattedAddress: fixture.address,
          zone: `${fixture.code} – ${fixture.name}`,
        }),
      );

      await persistSiteContextFromCandidate({
        projectId: fixture.projectId,
        addressInput: fixture.address,
        candidate: {
          id: `${fixture.projectId}-candidate`,
          formattedAddress: `${fixture.address}, Australia`,
          provider: "google",
          lgaName: fixture.projectId.includes("byron") ? "Byron Shire" : "Kempsey Shire",
          latitude: null,
          longitude: null,
        },
      });
    }

    expect(projectUpdateMock).toHaveBeenCalledWith({
      where: { id: "db-proj-byron" },
      data: { zoningCode: "SP3", zoningName: "Tourist", zoningSource: "NSW_EPI_LZN" },
    });
    expect(projectUpdateMock).toHaveBeenCalledWith({
      where: { id: "db-proj-kempsey-sp2" },
      data: { zoningCode: "SP2", zoningName: "Infrastructure", zoningSource: "NSW_EPI_LZN" },
    });
    expect(projectUpdateMock).toHaveBeenCalledWith({
      where: { id: "db-proj-kempsey-e2" },
      data: { zoningCode: "E2", zoningName: "Commercial Centre", zoningSource: "NSW_EPI_LZN" },
    });
  });

});

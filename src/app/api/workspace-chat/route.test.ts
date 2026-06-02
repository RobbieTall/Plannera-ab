import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSiteContextForProjectMock,
  findProjectByExternalIdMock,
  getLepContextForProjectMock,
  getWorkspaceSourceContextMock,
  getDCPContextMock,
  callModelMock,
  hasPlanningChatProviderMock,
  searchClausesMock,
  resolveInstrumentsForSiteMock,
} = vi.hoisted(() => ({
  getSiteContextForProjectMock: vi.fn(),
  findProjectByExternalIdMock: vi.fn(),
  getLepContextForProjectMock: vi.fn(),
  getWorkspaceSourceContextMock: vi.fn(),
  getDCPContextMock: vi.fn(),
  callModelMock: vi.fn(),
  hasPlanningChatProviderMock: vi.fn(),
  searchClausesMock: vi.fn(),
  resolveInstrumentsForSiteMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lgaCoverageState: {
      findUnique: vi.fn(async () => ({ state: "QUEUED" })),
    },
    project: {
      findUnique: vi.fn(async () => null),
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
  },
  WorkspaceSourceType: {
    council_dcp: "council_dcp",
  },
}));

vi.mock("@/lib/site-context", () => ({
  getSiteContextForProject: getSiteContextForProjectMock,
  persistSiteContextFromCandidate: vi.fn(),
  resolveInstrumentsForSite: resolveInstrumentsForSiteMock,
  serializeSiteContext: vi.fn((site) => site),
}));

vi.mock("@/lib/project-identifiers", () => ({
  findProjectByExternalId: findProjectByExternalIdMock,
  normalizeProjectId: (value: string) => value,
}));

vi.mock("@/lib/lep/lep-context", () => ({
  buildLepPromptMessage: vi.fn(() => null),
  getLepContextForProject: getLepContextForProjectMock,
}));

vi.mock("@/lib/workspace-source-context", () => ({
  COUNCIL_DCP_TYPES: ["council_dcp"],
  buildWorkspaceSourcePrompt: vi.fn(() => null),
  getWorkspaceSourceContext: getWorkspaceSourceContextMock,
}));

vi.mock("@/lib/dcp/get-dcp-context", () => ({
  getDCPContext: getDCPContextMock,
}));

vi.mock("@/lib/modelRouter", () => ({
  callModel: callModelMock,
  hasPlanningChatProvider: hasPlanningChatProviderMock,
}));

vi.mock("@/lib/legislation", () => ({
  searchClauses: searchClausesMock,
}));

vi.mock("@/lib/lep/nsw-lep-registry", () => ({
  listNswLgaKeys: vi.fn(() => ["byron", "kempsey"]),
}));

vi.mock("@/lib/lga-activation", () => ({
  queueLgaPreparation: vi.fn(async () => ({ queued: true })),
}));

import { POST } from "./route";

describe("workspace-chat forced fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPlanningChatProviderMock.mockReturnValue(true);
    searchClausesMock.mockResolvedValue([]);
    resolveInstrumentsForSiteMock.mockReturnValue({ lepInstrumentSlug: null, seppInstrumentSlugs: [] });
    getSiteContextForProjectMock.mockResolvedValue({
      formattedAddress: "3 Garruka Way, South West Rocks NSW",
      lgaCode: "KEMPSEY",
      lgaName: "Kempsey Shire",
      zone: "R1",
    });
    findProjectByExternalIdMock.mockResolvedValue({
      id: "db-1",
      publicId: "proj-1",
      zoningCode: "R1",
      zoningName: "General Residential",
      zoningSource: "test",
      lepData: null,
      dcpData: null,
    });
    getLepContextForProjectMock.mockResolvedValue({ lepContext: null, usedFallback: false });
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: "KEMPSEY",
      hasCouncilDcp: false,
      perSourceTotals: {},
      councilDcpSampleHeadings: [],
      chunks: [],
    });
    getDCPContextMock.mockResolvedValue([]);
  });

  it("returns deterministic fallback and skips model for controls question when no local DCP excerpts exist", async () => {
    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message: "What are the front, side and rear setbacks for a dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain("I can’t confirm local numeric controls");
    expect(payload.reply).toContain("won’t provide indicative");
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("calls model when DCP excerpts are available for controls question", async () => {
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: "BYRON",
      hasCouncilDcp: true,
      perSourceTotals: { council_dcp: 1 },
      councilDcpSampleHeadings: ["Chapter D1 Dual Occupancy"],
      chunks: [
        {
          id: "chunk-1",
          lgaCode: "BYRON",
          sourceType: "council_dcp",
          heading: "Chapter D1 Dual Occupancy",
          content: "Front setback 4.5m. Side setback 1.5m. Rear setback 3m.",
          metadata: {},
        },
      ],
    });
    getDCPContextMock.mockResolvedValue([
      {
        ref: "D1.2",
        title: "Setbacks",
        headingPath: ["Chapter D1", "Dual Occupancy"],
        bodyText: "Minimum front setback 4.5m, side setback 1.5m, rear setback 3m.",
      },
    ]);
    callModelMock.mockResolvedValue("Front setback 4.5m (Chapter D1).");

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message: "What are the front, side and rear setbacks for dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(callModelMock).toHaveBeenCalledTimes(1);
    expect(payload.reply).toContain("4.5m");
  });

  it("returns fallback and skips model when retrieved excerpts lack setback evidence for setback question", async () => {
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: "BYRON",
      hasCouncilDcp: true,
      perSourceTotals: { council_dcp: 1 },
      councilDcpSampleHeadings: ["Chapter D1 Residential"],
      chunks: [
        {
          id: "chunk-2",
          lgaCode: "BYRON",
          sourceType: "council_dcp",
          heading: "Chapter D1 Residential",
          content: "Design objectives for streetscape and landscaping.",
          metadata: {},
        },
      ],
    });
    getDCPContextMock.mockResolvedValue([
      {
        ref: "D1.3",
        title: "Streetscape",
        headingPath: ["Chapter D1", "Residential"],
        bodyText: "Provide articulated façades and passive surveillance.",
      },
    ]);

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message: "What are the front, side and rear setbacks for dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain("can’t confirm dual occupancy setback requirements");
    expect(payload.reply).toContain("Available retrieved sections right now");
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("returns fallback when excerpts mention setbacks but only contain unrelated numeric controls", async () => {
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: "BYRON",
      hasCouncilDcp: true,
      perSourceTotals: { council_dcp: 1 },
      councilDcpSampleHeadings: ["Chapter D1 General Residential"],
      chunks: [
        {
          id: "chunk-3",
          lgaCode: "BYRON",
          sourceType: "council_dcp",
          heading: "Chapter D1 General Residential",
          content: "Deep soil in front setback must include one contiguous area of 20m2.",
          metadata: {},
        },
      ],
    });
    getDCPContextMock.mockResolvedValue([
      {
        ref: "D1.5.2",
        title: "Deep soil zones",
        headingPath: ["Chapter D1", "General Residential"],
        bodyText: "Provide minimum 25% deep soil area and one contiguous 20m2 area in front setback.",
      },
    ]);

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message: "What are the front, side and rear setbacks for dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain("can’t confirm dual occupancy setback requirements");
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("searches resolved LEP and SEPP instruments when the user names an LGA in the question", async () => {
    getSiteContextForProjectMock.mockResolvedValue(null);
    resolveInstrumentsForSiteMock.mockReturnValue({
      lepInstrumentSlug: "byron-lep-2014",
      seppInstrumentSlugs: ["sepp-housing-2021"],
    });
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: "BYRON",
      hasCouncilDcp: true,
      perSourceTotals: { council_dcp: 1 },
      councilDcpSampleHeadings: ["Chapter D1 Dual Occupancy"],
      chunks: [
        {
          id: "chunk-lgatest",
          lgaCode: "BYRON",
          sourceType: "council_dcp",
          heading: "Chapter D1 Dual Occupancy",
          content: "Front setback 4.5m. Side setback 1.5m. Rear setback 3m.",
          metadata: {},
        },
      ],
    });
    getDCPContextMock.mockResolvedValue([
      {
        ref: "D1.2",
        title: "Setbacks",
        headingPath: ["Chapter D1", "Dual Occupancy"],
        bodyText: "Minimum front setback 4.5m, side setback 1.5m, rear setback 3m for dual occupancy development.",
      },
    ]);
    searchClausesMock.mockResolvedValue([
      {
        instrumentId: "instrument-1",
        instrumentName: "Byron Local Environmental Plan 2014",
        instrumentType: "LEP",
        clauseId: "clause-1",
        clauseKey: "4.1C",
        title: "Dual occupancies",
        snippet: "Development consent may be granted for dual occupancy development.",
        isCurrent: true,
        currentAsAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    callModelMock.mockResolvedValue("Clause-based answer.");

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        message: "What are the setbacks for dual occupancy in Byron Shire?",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(resolveInstrumentsForSiteMock).toHaveBeenCalledWith({ lgaName: "byron" });
    expect(searchClausesMock).toHaveBeenCalledWith({
      query: "What are the setbacks for dual occupancy in Byron Shire?",
      instrumentSlugs: ["byron-lep-2014", "sepp-housing-2021"],
      instrumentTypes: ["LEP", "SEPP"],
      limit: 12,
    });
    expect(callModelMock).toHaveBeenCalledTimes(1);
  });

});

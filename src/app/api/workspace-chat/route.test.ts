import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSiteContextForProjectMock,
  findProjectByExternalIdMock,
  getLepContextForProjectMock,
  getWorkspaceSourceContextMock,
  getDCPContextMock,
  searchClausesMock,
  resolveInstrumentsForSiteMock,
  callModelMock,
  hasPlanningChatProviderMock,
} = vi.hoisted(() => ({
  getSiteContextForProjectMock: vi.fn(),
  findProjectByExternalIdMock: vi.fn(),
  getLepContextForProjectMock: vi.fn(),
  getWorkspaceSourceContextMock: vi.fn(),
  getDCPContextMock: vi.fn(),
  searchClausesMock: vi.fn(),
  resolveInstrumentsForSiteMock: vi.fn(),
  callModelMock: vi.fn(),
  hasPlanningChatProviderMock: vi.fn(),
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

vi.mock("@/lib/lga-activation", () => ({
  queueLgaPreparation: vi.fn(async () => ({ queued: true })),
}));

import { POST } from "./route";

describe("workspace-chat forced fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPlanningChatProviderMock.mockReturnValue(true);
    resolveInstrumentsForSiteMock.mockReturnValue({
      lepInstrumentSlug: null,
      seppInstrumentSlugs: [],
    });
    searchClausesMock.mockResolvedValue([]);
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
    getLepContextForProjectMock.mockResolvedValue({
      lepContext: null,
      usedFallback: false,
    });
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
        message:
          "What are the front, side and rear setbacks for a dual occupancy?",
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
        bodyText:
          "Minimum front setback 4.5m, side setback 1.5m, rear setback 3m.",
      },
    ]);
    callModelMock.mockResolvedValue("Front setback 4.5m (Chapter D1).");

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message:
          "What are the front, side and rear setbacks for dual occupancy?",
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
        message:
          "What are the front, side and rear setbacks for dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain(
      "can’t confirm dual occupancy setback requirements",
    );
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
          content:
            "Deep soil in front setback must include one contiguous area of 20m2.",
          metadata: {},
        },
      ],
    });
    getDCPContextMock.mockResolvedValue([
      {
        ref: "D1.5.2",
        title: "Deep soil zones",
        headingPath: ["Chapter D1", "General Residential"],
        bodyText:
          "Provide minimum 25% deep soil area and one contiguous 20m2 area in front setback.",
      },
    ]);

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message:
          "What are the front, side and rear setbacks for dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain(
      "can’t confirm dual occupancy setback requirements",
    );
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("keeps statutory clause context available when DCP controls are missing", async () => {
    resolveInstrumentsForSiteMock.mockReturnValue({
      lepInstrumentSlug: "kempsey-local-environmental-plan-2013",
      seppInstrumentSlugs: ["state-environmental-planning-policy-housing-2021"],
    });
    searchClausesMock.mockResolvedValue([
      {
        instrumentId: "inst-1",
        instrumentName: "Kempsey Local Environmental Plan 2013",
        instrumentType: "LEP",
        clauseId: "clause-1",
        clauseKey: "2.3",
        title: "Zone objectives and Land Use Table",
        snippet:
          "Dual occupancies are listed with consent in Zone R1 General Residential.",
        isCurrent: true,
        currentAsAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        instrumentId: "inst-2",
        instrumentName: "State Environmental Planning Policy (Housing) 2021",
        instrumentType: "SEPP",
        clauseId: "clause-2",
        clauseKey: "division-dual-occupancies",
        title: "Dual occupancies",
        snippet:
          "This Division contains standards for dual occupancies where the policy applies.",
        isCurrent: true,
        currentAsAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message:
          "What are the front, side and rear setbacks for a dual occupancy?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain("I can’t confirm local numeric controls");
    expect(payload.reply).toContain("Statutory context available now");
    expect(payload.reply).toContain(
      "Kempsey Local Environmental Plan 2013 2.3",
    );
    expect(payload.reply).toContain(
      "State Environmental Planning Policy (Housing) 2021",
    );
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("returns a source-backed controls inventory instead of generic controls guidance", async () => {
    resolveInstrumentsForSiteMock.mockReturnValue({
      lepInstrumentSlug: "kempsey-lep-2013",
      seppInstrumentSlugs: ["sepp-housing-2021"],
    });
    searchClausesMock.mockImplementation(
      async ({ query }: { query?: string }) => {
        if (query === "Zone R1" || query === "R1 land use table") {
          return [
            {
              instrumentId: "inst-1",
              instrumentName: "Kempsey Local Environmental Plan 2013",
              instrumentType: "LEP",
              clauseId: "clause-zone-r1",
              clauseKey: "2.3",
              title: "Zone objectives and Land Use Table",
              snippet:
                "Zone R1 General Residential permits dual occupancies with consent.",
              isCurrent: true,
              currentAsAt: new Date("2026-01-01T00:00:00Z"),
            },
          ];
        }
        if (query === "height of buildings") {
          return [
            {
              instrumentId: "inst-1",
              instrumentName: "Kempsey Local Environmental Plan 2013",
              instrumentType: "LEP",
              clauseId: "clause-height",
              clauseKey: "4.3",
              title: "Height of buildings",
              snippet:
                "The height of a building is not to exceed the maximum height shown for the land on the Height of Buildings Map.",
              isCurrent: true,
              currentAsAt: new Date("2026-01-01T00:00:00Z"),
            },
          ];
        }
        return [];
      },
    );

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message:
          "What controls can Plannera tell me about the land in question?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { reply: string };

    expect(response.status).toBe(200);
    expect(payload.reply).toContain("source-backed data right now");
    expect(payload.reply).toContain("**Confirmed site context**");
    expect(payload.reply).toContain(
      "Kempsey Local Environmental Plan 2013 2.3",
    );
    expect(payload.reply).toContain(
      "Kempsey Local Environmental Plan 2013 4.3",
    );
    expect(payload.reply).toContain("Council DCP controls");
    expect(payload.reply).toContain("will not provide indicative figures");
    expect(payload.reply.toLowerCase()).not.toContain("typically allows");
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("exposes a structured statutory baseline in debug output", async () => {
    resolveInstrumentsForSiteMock.mockReturnValue({
      lepInstrumentSlug: "kempsey-local-environmental-plan-2013",
      seppInstrumentSlugs: ["state-environmental-planning-policy-housing-2021"],
    });
    getLepContextForProjectMock.mockResolvedValue({
      lepContext: {
        lga: "KEMPSEY",
        instrumentName: "Kempsey Local Environmental Plan 2013",
        instrumentCode: "kempsey-local-environmental-plan-2013",
        clauses: [
          {
            ref: "2.3",
            title: "Zone objectives",
            text: "Zone R1 land use table.",
          },
        ],
      },
      usedFallback: false,
    });
    searchClausesMock.mockResolvedValue([
      {
        instrumentId: "inst-1",
        instrumentName: "Kempsey Local Environmental Plan 2013",
        instrumentType: "LEP",
        clauseId: "clause-1",
        clauseKey: "2.3",
        title: "Zone objectives and Land Use Table",
        snippet:
          "Dual occupancies are listed with consent in Zone R1 General Residential.",
        isCurrent: true,
        currentAsAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const request = new Request(
      "http://localhost/api/workspace-chat?debugSources=1",
      {
        method: "POST",
        body: JSON.stringify({
          projectId: "proj-1",
          message: "Can I do dual occupancy under the LEP?",
          debugSources: true,
        }),
      },
    );

    const response = await POST(request);
    const payload = (await response.json()) as {
      statutoryBaseline: {
        instruments: string[];
        lep: { matchedInstrument: string | null; clauseCount: number };
        clauseSearch: { count: number; clauses: { clauseKey: string }[] };
        confidenceTags: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.statutoryBaseline.instruments).toEqual([
      "kempsey-local-environmental-plan-2013",
      "state-environmental-planning-policy-housing-2021",
    ]);
    expect(payload.statutoryBaseline.lep.matchedInstrument).toBe(
      "kempsey-local-environmental-plan-2013",
    );
    expect(payload.statutoryBaseline.lep.clauseCount).toBe(1);
    expect(payload.statutoryBaseline.clauseSearch.count).toBe(1);
    expect(payload.statutoryBaseline.clauseSearch.clauses[0]?.clauseKey).toBe(
      "2.3",
    );
    expect(payload.statutoryBaseline.confidenceTags).toContain(
      "STATUTORY_CLAUSES_RETRIEVED",
    );
    expect(callModelMock).not.toHaveBeenCalled();
  });
});

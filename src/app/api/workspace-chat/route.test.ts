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
  lgaCoverageFindUniqueMock,
  queueLgaPreparationMock,
  buildStatutoryContextBlockMock,
  buildQuickSiteCheckLepMock,
  chatMessageCreateManyMock,
  projectFindUniqueMock,
  instrumentFindManyMock,
  resolveSiteInstrumentsMock,
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
  lgaCoverageFindUniqueMock: vi.fn(),
  queueLgaPreparationMock: vi.fn(),
  buildStatutoryContextBlockMock: vi.fn(),
  buildQuickSiteCheckLepMock: vi.fn(),
  chatMessageCreateManyMock: vi.fn(),
  projectFindUniqueMock: vi.fn(),
  instrumentFindManyMock: vi.fn(),
  resolveSiteInstrumentsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lgaCoverageState: {
      findUnique: lgaCoverageFindUniqueMock,
    },
    project: {
      findUnique: projectFindUniqueMock,
    },
    instrument: {
      findMany: instrumentFindManyMock,
    },
    chatMessage: {
      createMany: chatMessageCreateManyMock,
    },
  },
}));

vi.mock("@prisma/client", () => ({
  InstrumentType: {
    LEP: "LEP",
  },
  LgaCoverageMaturity: {
    NOT_STARTED: "NOT_STARTED",
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    SEARCHABLE_READY: "SEARCHABLE_READY",
    STRUCTURED_PARTIAL: "STRUCTURED_PARTIAL",
    VERIFIED: "VERIFIED",
    FAILED_REVIEW_NEEDED: "FAILED_REVIEW_NEEDED",
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

vi.mock("@/lib/legislation/site-resolution", () => ({
  resolveSiteInstruments: resolveSiteInstrumentsMock,
}));

vi.mock("@/lib/lep/nsw-lep-registry", () => ({
  listNswLgaKeys: vi.fn(() => ["byron", "kempsey"]),
}));

vi.mock("@/lib/lep/quick-site-check", () => ({
  buildQuickSiteCheckLep: buildQuickSiteCheckLepMock,
}));

vi.mock("@/lib/lga-activation", () => ({
  queueLgaPreparation: queueLgaPreparationMock,
}));

vi.mock("@/lib/statutory-context-builder", () => ({
  buildStatutoryContextBlock: buildStatutoryContextBlockMock,
}));

import { detectMessageTopic } from "./dcp-topic";
import { buildLepClausePrompt, shouldSearchLepClauses } from "./lep-clause-grounding";
import { POST } from "./route";

describe("detectMessageTopic", () => {
  it.each([
    ["what is the setback", "setbacks"],
    ["how tall can I build", "height"],
    ["parking spaces required", "parking"],
    ["landscaping requirements", "landscaping"],
    ["hello", null],
  ])("detects %s as %s", (message, expectedTopic) => {
    expect(detectMessageTopic(message)).toBe(expectedTopic);
  });
});


describe("workspace-chat LEP clause prompt helpers", () => {
  it("detects LEP clause search intent for planning questions", () => {
    expect(shouldSearchLepClauses("can I build a secondary dwelling")).toBe(true);
  });

  it("does not search LEP clauses for non-planning acknowledgements", () => {
    expect(shouldSearchLepClauses("thanks, that's helpful")).toBe(false);
  });

  it("returns an empty prompt for no LEP clauses", () => {
    expect(buildLepClausePrompt([])).toBe("");
  });

  it("formats LEP clause refs and headings", () => {
    const prompt = buildLepClausePrompt([
      {
        clauseNumber: "4.3",
        heading: "Height of buildings",
        zone: "RU5",
        content: "The height of a building on any land is not to exceed the maximum height shown for the land.",
      },
    ]);

    expect(prompt).toContain("cl. 4.3");
    expect(prompt).toContain("Height of buildings");
  });
});

describe("workspace-chat forced fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPlanningChatProviderMock.mockReturnValue(true);
    searchClausesMock.mockResolvedValue([]);
    resolveInstrumentsForSiteMock.mockReturnValue({
      lepInstrumentSlug: null,
      seppInstrumentSlugs: [],
    });
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
    lgaCoverageFindUniqueMock.mockResolvedValue({ state: "QUEUED" });
    queueLgaPreparationMock.mockResolvedValue({
      queued: true,
      coverageState: "QUEUED",
    });
    chatMessageCreateManyMock.mockResolvedValue({ count: 2 });
    projectFindUniqueMock.mockResolvedValue(null);
    instrumentFindManyMock.mockResolvedValue([]);
    resolveSiteInstrumentsMock.mockResolvedValue({
      address: "3 Garruka Way, South West Rocks NSW",
      localGovernmentArea: "Kempsey Shire",
      instrumentSlugs: [],
      rationale: [],
    });
    buildQuickSiteCheckLepMock.mockResolvedValue({
      ok: false,
      message: "No LEP zone summary",
    });
    buildStatutoryContextBlockMock.mockResolvedValue({
      dcpClauses: [],
      lepClauses: [],
      promptBlock:
        "--- RETRIEVED PLANNING CONTROLS FOR KEMPSEY ---\nLEP PROVISIONS:\nNo LEP clauses were found for this query in the retrieved planning controls.\nDCP PROVISIONS:\nNo DCP clauses were found for this query in the retrieved planning controls.\n--- END RETRIEVED PLANNING CONTROLS ---",
      sourceTypes: ["unresolved"],
    });
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
    expect(getDCPContextMock).toHaveBeenCalledWith(
      "BYRON",
      "setback building line street side rear boundary frontage",
    );
    expect(callModelMock).toHaveBeenCalledTimes(1);
    expect(payload.reply).toContain("4.5m");
  });

  it("injects retrieved statutory DCP clauses into the model context", async () => {
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: "BYRON",
      hasCouncilDcp: true,
      perSourceTotals: { council_dcp: 1 },
      councilDcpSampleHeadings: ["Chapter D1 Dual Occupancy"],
      chunks: [
        {
          id: "chunk-statutory",
          lgaCode: "BYRON",
          sourceType: "council_dcp",
          heading: "Chapter D1 Dual Occupancy",
          content: "Front setback 4.5m. Side setback 1.5m. Rear setback 3m.",
          metadata: {},
        },
      ],
    });
    chatMessageCreateManyMock.mockResolvedValue({ count: 2 });
    projectFindUniqueMock.mockResolvedValue(null);
    instrumentFindManyMock.mockResolvedValue([]);
    resolveSiteInstrumentsMock.mockResolvedValue({
      address: "3 Garruka Way, South West Rocks NSW",
      localGovernmentArea: "Kempsey Shire",
      instrumentSlugs: [],
      rationale: [],
    });
    buildQuickSiteCheckLepMock.mockResolvedValue({
      ok: false,
      message: "No LEP zone summary",
    });
    buildStatutoryContextBlockMock.mockResolvedValue({
      dcpClauses: [
        {
          clauseNumber: "D1.2",
          heading: "Setbacks",
          body: "Minimum front setback 4.5m, side setback 1.5m, rear setback 3m.",
        },
      ],
      lepClauses: [
        {
          clauseKey: "4.3",
          heading: "Height of buildings",
          value: "Maximum height must come from the Height of Buildings Map.",
        },
      ],
      promptBlock:
        "--- RETRIEVED PLANNING CONTROLS FOR BYRON ---\nLEP PROVISIONS:\n- [Byron LEP 2014 4.3]: Height of buildings — Maximum height must come from the Height of Buildings Map.\nDCP PROVISIONS:\n- [D1.2] Setbacks: Minimum front setback 4.5m, side setback 1.5m, rear setback 3m.\n--- END RETRIEVED PLANNING CONTROLS ---",
      sourceTypes: ["cited"],
    });
    callModelMock.mockResolvedValue("Clause-grounded answer.");

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message:
          "What are the front, side and rear setbacks for dual occupancy?",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(callModelMock).toHaveBeenCalledTimes(1);
    const messages = callModelMock.mock.calls[0]?.[1] as Array<{
      role: string;
      content: string;
    }>;
    expect(
      messages.some((message) => message.content.includes("[D1.2] Setbacks")),
    ).toBe(true);
    expect(
      messages.some((message) =>
        message.content.includes("Minimum front setback 4.5m"),
      ),
    ).toBe(true);
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
        bodyText:
          "Minimum front setback 4.5m, side setback 1.5m, rear setback 3m for dual occupancy development.",
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
        snippet:
          "Development consent may be granted for dual occupancy development.",
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
    expect(resolveInstrumentsForSiteMock).toHaveBeenCalledWith({
      lgaName: "byron",
    });
    expect(searchClausesMock).toHaveBeenCalledWith({
      query: "What are the setbacks for dual occupancy in Byron Shire?",
      instrumentSlugs: ["byron-lep-2014", "sepp-housing-2021"],
      instrumentTypes: ["LEP", "SEPP"],
      limit: 12,
    });
    expect(callModelMock).toHaveBeenCalledTimes(1);
  });

  it("injects a coverage notice, queues preparation, and still calls the model for preparing LGAs", async () => {
    callModelMock.mockResolvedValue("Baseline planning answer.");

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message: "Can you summarise the planning context for this site?",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      reply: string;
      coverageState: string;
      coverageNotice: string;
    };

    expect(response.status).toBe(200);
    expect(queueLgaPreparationMock).toHaveBeenCalledWith({
      lgaCode: "KEMPSEY",
      projectId: "proj-1",
    });
    expect(callModelMock).toHaveBeenCalledTimes(1);
    expect(payload.coverageState).toBe("QUEUED");
    expect(payload.coverageNotice).toContain(
      "local DCP controls are being prepared",
    );
    const messages = callModelMock.mock.calls[0]?.[1] as Array<{
      role: string;
      content: string;
    }>;
    expect(
      messages.some((message) =>
        message.content.includes("Do not fabricate or infer council-specific"),
      ),
    ).toBe(true);
  });

  it("resolves the workspace LGA from the project address and passes it into statutory context", async () => {
    projectFindUniqueMock.mockResolvedValueOnce({
      address: "1 River Street, Ballina NSW 2478",
    });
    resolveSiteInstrumentsMock.mockResolvedValueOnce({
      address: "1 River Street, Ballina NSW 2478",
      localGovernmentArea: "Ballina",
      instrumentSlugs: ["ballina-lep-2012"],
      rationale: [],
    });
    getWorkspaceSourceContextMock.mockResolvedValue({
      canonicalLgaCode: null,
      hasCouncilDcp: false,
      perSourceTotals: {},
      councilDcpSampleHeadings: [],
      chunks: [],
    });
    buildStatutoryContextBlockMock.mockResolvedValue({
      dcpClauses: [],
      lepClauses: [
        {
          clauseKey: "4.3",
          heading: "Height of buildings",
          value:
            "The height of a building is not to exceed the mapped maximum height.",
          instrumentName: "Ballina Local Environmental Plan 2012",
        },
      ],
      promptBlock:
        "--- RETRIEVED PLANNING CONTROLS FOR BALLINA ---\nLEP PROVISIONS:\n- [Ballina Local Environmental Plan 2012 4.3]: Height of buildings — The height of a building is not to exceed the mapped maximum height.\nDCP PROVISIONS:\nNo DCP clauses were found for this query in the retrieved planning controls.\n--- END RETRIEVED PLANNING CONTROLS ---",
      sourceTypes: ["cited"],
    });
    callModelMock.mockResolvedValue("Ballina LEP clause-grounded answer.");

    const request = new Request("http://localhost/api/workspace-chat", {
      method: "POST",
      body: JSON.stringify({
        projectId: "proj-1",
        message: "What height control applies to this site?",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(projectFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      select: { address: true },
    });
    expect(resolveSiteInstrumentsMock).toHaveBeenCalledWith({
      address: "1 River Street, Ballina NSW 2478",
    });
    expect(buildStatutoryContextBlockMock).toHaveBeenCalledWith({
      lgaCode: "BALLINA",
      query: "What height control applies to this site?",
      maxDcpClauses: 5,
      maxLepClauses: 3,
      siteZone: "R1",
    });
    expect(callModelMock).toHaveBeenCalledTimes(1);
    const messages = callModelMock.mock.calls[0]?.[1] as Array<{
      role: string;
      content: string;
    }>;
    expect(
      messages.some((message) =>
        message.content.includes("Ballina Local Environmental Plan 2012 4.3"),
      ),
    ).toBe(true);
  });
});

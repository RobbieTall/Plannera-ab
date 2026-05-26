import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSiteContextForProjectMock,
  findProjectByExternalIdMock,
  getLepContextForProjectMock,
  getWorkspaceSourceContextMock,
  getDCPContextMock,
  callModelMock,
  hasPlanningChatProviderMock,
} = vi.hoisted(() => ({
  getSiteContextForProjectMock: vi.fn(),
  findProjectByExternalIdMock: vi.fn(),
  getLepContextForProjectMock: vi.fn(),
  getWorkspaceSourceContextMock: vi.fn(),
  getDCPContextMock: vi.fn(),
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
  resolveInstrumentsForSite: vi.fn(() => ({ lepInstrumentSlug: null, seppInstrumentSlugs: [] })),
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
  searchClauses: vi.fn(async () => []),
}));

vi.mock("@/lib/lga-activation", () => ({
  queueLgaPreparation: vi.fn(async () => ({ queued: true })),
}));

import { POST } from "./route";

describe("workspace-chat forced fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPlanningChatProviderMock.mockReturnValue(true);
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
});

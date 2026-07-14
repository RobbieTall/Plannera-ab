import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoredDcpClause } from "@/lib/dcp/search";

vi.mock("next/headers", () => ({
  cookies: () => ({ get: vi.fn() }),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  NEXT_AUTH_SESSION_COOKIE: { name: "next-auth.session-token" },
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artefact: { create: vi.fn(), findMany: vi.fn() },
    project: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

import {
  DEV_BYPASS_USER_ID,
  buildDcpSectionPromptBlock,
  createMapSnapshotArtefact,
  filterSiteApplicableDcpClauses,
  hasApplicableSeeReadinessEvidence,
  loadDcpClausesForSections,
  requireSessionUser,
} from "@/lib/artefact-service";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import { getServerSession } from "next-auth";


const originalAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED;
const getServerSessionMock = vi.mocked(getServerSession);

beforeEach(() => {
  vi.clearAllMocks();
  if (originalAuthEnabled === undefined) {
    delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = originalAuthEnabled;
  }

});
const makeClause = (
  overrides: Partial<ScoredDcpClause> = {},
): ScoredDcpClause =>
  ({
    id: "clause-1",
    lgaCode: "BYRON",
    instrumentSlug: "byron-dcp-2014",
    ref: "D1.2",
    title: "Setbacks",
    headingPath: ["Chapter D", "Residential controls", "Setbacks"],
    parentRef: null,
    depth: 3,
    bodyHtml: "",
    bodyText:
      "Front setbacks must be compatible with the streetscape and side setbacks must protect amenity.",
    topicTags: ["setbacks"],
    numericMeta: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    score: 42,
    ...overrides,
  }) as ScoredDcpClause;


describe("requireSessionUser", () => {
  it("returns a dev bypass user when auth is not explicitly enabled", async () => {
    delete process.env.NEXT_PUBLIC_AUTH_ENABLED;

    await expect(requireSessionUser()).resolves.toEqual({
      userId: "dev-bypass-user",
    });
    expect(getServerSessionMock).not.toHaveBeenCalled();
  });

  it("requires a real session when auth is explicitly enabled", async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
    getServerSessionMock.mockResolvedValueOnce(null);

    await expect(requireSessionUser()).rejects.toMatchObject({
      message: "Authentication required",
      status: 401,
    });
    expect(getServerSessionMock).toHaveBeenCalled();
  });
});


describe("dev bypass project access", () => {
  it("looks up projects by ID only for the dev bypass user", async () => {
    const project = { id: "project-db-id", publicId: "project-public-id" };
    const artefact = { id: "artefact-id" };
    const projectFindFirst = vi
      .fn()
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce({ id: project.id });
    const artefactCreate = vi.fn().mockResolvedValueOnce(artefact);
    const saveFile = vi.fn().mockResolvedValueOnce({ url: "/uploads/map.png" });
    const formData = new FormData();
    formData.set("file", new File(["image"], "map.png", { type: "image/png" }));
    formData.set("projectId", project.publicId);
    formData.set("title", "Map snapshot");
    formData.set("source", "Planning portal");

    await expect(
      createMapSnapshotArtefact({
        formData,
        projectId: project.publicId,
        userId: DEV_BYPASS_USER_ID,
        deps: {
          prisma: {
            project: { findFirst: projectFindFirst, findUnique: vi.fn() },
            artefact: { create: artefactCreate, findMany: vi.fn() },
          },
          saveFile,
        },
      }),
    ).resolves.toBe(artefact);

    expect(projectFindFirst).toHaveBeenNthCalledWith(1, {
      where: { OR: [{ publicId: project.publicId }, { id: project.publicId }] },
    });
    expect(projectFindFirst).toHaveBeenNthCalledWith(2, {
      where: { id: project.id },
      select: { id: true },
    });
    expect(artefactCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: project.id }),
      }),
    );
  });
});

describe("buildDcpSectionPromptBlock", () => {
  it("formats DCP clauses as inline DCP sources with source titles", () => {
    const block = buildDcpSectionPromptBlock([makeClause()], "Setbacks");

    expect(block).toBe(
      "## Retrieved DCP source text for Setbacks\n" +
        "DCP Source — [Setbacks]: Front setbacks must be compatible with the streetscape and side setbacks must protect amenity.",
    );
  });

  it("returns an empty string when no clauses are provided", () => {
    expect(buildDcpSectionPromptBlock([], "Parking")).toBe("");
  });
});

describe("loadDcpClausesForSections", () => {
  it("returns DCP clauses keyed by SEE section id", async () => {
    const setbacksClause = makeClause({ id: "setbacks-clause", ref: "D1.2" });
    const parkingClause = makeClause({
      id: "parking-clause",
      ref: "B4.1",
      title: "Car parking",
      topicTags: ["parking"],
    });
    const mockGetDCPContext = vi
      .fn<typeof getDCPContext>()
      .mockResolvedValueOnce([setbacksClause])
      .mockResolvedValueOnce([parkingClause]);

    const result = await loadDcpClausesForSections(mockGetDCPContext, "BYRON", [
      { id: "setbacks", label: "Setbacks", query: "setback building line" },
      { id: "parking", label: "Car Parking", query: "parking car space" },
    ]);

    expect(mockGetDCPContext).toHaveBeenCalledWith(
      "BYRON",
      "setback building line",
    );
    expect(mockGetDCPContext).toHaveBeenCalledWith(
      "BYRON",
      "parking car space",
    );
    expect(result.get("setbacks")).toEqual([setbacksClause]);
    expect(result.get("parking")).toEqual([parkingClause]);
  });

  it("returns an empty map when DCP lookup fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const mockGetDCPContext = vi
      .fn<typeof getDCPContext>()
      .mockRejectedValue(new Error("DCP unavailable"));

    const result = await loadDcpClausesForSections(mockGetDCPContext, "BYRON", [
      { id: "height", label: "Building Height", query: "height storey" },
    ]);

    expect(result.size).toBe(0);
    expect(consoleError).toHaveBeenCalledWith(
      "[artefact-service] failed to load section DCP clauses",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});


describe("SEE DCP applicability and readiness evidence", () => {
  it("excludes Byron SP3 residential D1 controls and rejects readiness from irrelevant citations", () => {
    const residentialClauses = [
      makeClause({ ref: "D1.4.6", title: "D1.4.6 Residential setbacks", headingPath: ["Chapter D1", "Residential D1.4.6"], bodyText: "Residential D1 controls for secondary dwelling side setbacks in residential zones; this table cross-refers to nearby SP3 land but does not apply to it." }),
      makeClause({ ref: "D1.10", title: "D1.10 Private open space", headingPath: ["Chapter D1", "Residential D1.10"], bodyText: "Private open space controls for residential accommodation." }),
      makeClause({ ref: "D1.10.2", title: "D1.10.2 Residential car parking", headingPath: ["Chapter D1", "Residential D1.10.2"], bodyText: "Residential parking for dwelling houses and secondary dwellings." }),
      makeClause({ ref: "D1.4.2", title: "D1.4.2 Top-up housing", headingPath: ["Chapter D1", "Top-up housing"], bodyText: "Top-up housing provisions for residential zones." }),
    ];

    expect(filterSiteApplicableDcpClauses(residentialClauses, { zoneCode: "SP3", zoneLabel: "SP3 Tourist" })).toEqual([]);
    expect(
      hasApplicableSeeReadinessEvidence({
        siteDescription: { address: "45 Broken Head Road", lga: "Byron Shire", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 Tourist" },
        applicableControls: {
          lepInstrument: null,
          permissibility: null,
          quickSiteControls: {} as never,
          dcpClauses: residentialClauses.map((clause) => ({ ref: clause.ref, title: clause.title, headingPath: clause.headingPath, bodyText: clause.bodyText, score: clause.score })),
          sourceExcerpts: [],
          statutoryContext: null,
          groundingInstructions: [],
        },
        consistencyAssessment: [{ topic: "DCP", assessment: "Residential D1 controls", citations: [{ ref: "D1.4.6 Residential setbacks", type: "DCP" }] }],
      }),
    ).toBe(false);
  });

  it("retains Kempsey E2 D4 evidence and genuinely general Part B support", () => {
    const clauses = [
      makeClause({ ref: "Part D-649", title: "D4 Business and Commercial Development", headingPath: ["Part D", "D4 Business and Commercial Development"], bodyText: "Zone E2 Commercial Centre built-form and active-frontage controls for business development." }),
      makeClause({ ref: "Part B-33", title: "Part B General access", headingPath: ["Part B", "General controls"], bodyText: "Part B general access and parking objectives apply to all development where relevant." }),
      makeClause({ ref: "Part D-653", title: "Residential side setbacks", headingPath: ["Part D", "Residential development"], bodyText: "Residential zones side setbacks for dwelling houses only." }),
    ];
    const applicable = filterSiteApplicableDcpClauses(clauses, { zoneCode: "E2", zoneLabel: "E2 Commercial Centre" });

    expect(applicable.map((clause) => clause.ref)).toEqual(["Part D-649", "Part B-33"]);
    expect(
      hasApplicableSeeReadinessEvidence({
        siteDescription: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneName: "Commercial Centre", zoneLabel: "E2 Commercial Centre" },
        applicableControls: {
          lepInstrument: null,
          permissibility: null,
          quickSiteControls: {} as never,
          dcpClauses: applicable.map((clause) => ({ ref: clause.ref, title: clause.title, headingPath: clause.headingPath, bodyText: clause.bodyText, score: clause.score })),
          sourceExcerpts: [],
          statutoryContext: null,
          groundingInstructions: [],
        },
        consistencyAssessment: [{ topic: "DCP", assessment: "E2 controls", citations: [{ ref: "D4 Business and Commercial Development", type: "DCP" }] }],
      }),
    ).toBe(true);
  });
  it("uses title and hierarchy as authoritative DCP scope even when body mentions the current zone", () => {
    const clauses = [
      makeClause({ ref: "D1.4.2", title: "D1.4.2 Top-up housing", headingPath: ["Chapter D1", "Residential development"], bodyText: "Top-up housing applies in residential zones; nearby SP3 Tourist sites may need separate review." }),
      makeClause({ ref: "B-12", title: "Part B General design", headingPath: ["Part B", "General controls"], bodyText: "General design objectives apply across the LGA where relevant." }),
      makeClause({ ref: "SP3-1", title: "SP3 Tourist built form", headingPath: ["Chapter D", "SP3 Tourist"], bodyText: "Zone SP3 Tourist built-form guidance for tourist development." }),
    ];

    expect(filterSiteApplicableDcpClauses(clauses, { zoneCode: "SP3", zoneLabel: "SP3 Tourist" }).map((clause) => clause.ref)).toEqual(["B-12", "SP3-1"]);
  });

  it("does not count generic or unrelated LEP citations as readiness evidence", () => {
    expect(
      hasApplicableSeeReadinessEvidence({
        siteDescription: { address: "45 Broken Head Road", lga: "Byron Shire", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 Tourist" },
        applicableControls: {
          lepInstrument: { name: "Byron LEP 2014" },
          permissibility: null,
          quickSiteControls: {} as never,
          dcpClauses: [],
          sourceExcerpts: [],
          statutoryContext: null,
          groundingInstructions: [],
        },
        consistencyAssessment: [{ topic: "LEP", assessment: "Generic LEP citation only", citations: [{ ref: "BYRON_2014_1", type: "LEP" }] }],
      }),
    ).toBe(false);
  });

  it("counts an LEP citation only when it matches an applicable cited site control", () => {
    expect(
      hasApplicableSeeReadinessEvidence({
        siteDescription: { address: "45 Broken Head Road", lga: "Byron Shire", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 Tourist" },
        applicableControls: {
          lepInstrument: { name: "Byron LEP 2014" },
          permissibility: null,
          quickSiteControls: {
            heightOfBuilding: { label: "Height", value: "9m", present: true, source: "LEP", lepSource: true, clauseRef: "4.3", interpretation: "Height is 9m." },
          } as never,
          dcpClauses: [],
          sourceExcerpts: [],
          statutoryContext: null,
          groundingInstructions: [],
        },
        consistencyAssessment: [{ topic: "Height", assessment: "Height is supported", citations: [{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }] }],
      }),
    ).toBe(true);
  });

});

import { describe, expect, it, vi } from "vitest";

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
  ArtefactValidationError,
  createExpertReviewRequestArtefact,
  sanitiseQuickSiteLepControls,
} from "@/lib/artefact-service";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { DetailedPlanningPackContent, WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

const project = {
  id: "project-db-id",
  publicId: "project-public-id",
  title: "Byron review project",
  address: "45 Broken Head Road, Byron Bay NSW 2481",
  zoning: "SP3 – Tourist",
  zoningCode: "SP3",
  zoningName: "Tourist",
};

const projectWithSite = {
  ...project,
  siteContext: {
    formattedAddress: "45 Broken Head Road, Byron Bay NSW 2481",
    lgaName: "Byron Shire",
    lgaCode: "BYRON",
    zone: "SP3 – Tourist",
  },
};

const citedSummary = {
  label: "Cited" as const,
  sourceRef: "Byron LEP 2014 Zone SP3",
  detail: "LEP evidence is grounded in DB-backed zone data.",
  objectiveCount: 2,
  landUseEntryCount: 1,
  citedControlCount: 2,
  totalControlCount: 3,
};

const quickSiteCheckPayload: QuickSiteCheckReport = {
  projectId: project.id,
  generatedAt: "2026-07-10T01:00:00.000Z",
  site: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    zoneCode: "SP3",
    zoneName: "Tourist",
    zoneLabel: "SP3 – Tourist",
  },
  lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
  permissibility: {
    zoneLabel: "SP3 – Tourist",
    permittedWithoutConsent: [],
    permittedWithConsent: ["tourist and visitor accommodation"],
    prohibited: [],
    interpretation: "Tourist and visitor accommodation is permitted with consent in SP3.",
  },
  controls: {
    heightOfBuilding: {
      label: "Height of building",
      value: "9m",
      present: true,
      source: "Byron LEP 2014",
      lepSource: true,
      clauseRef: "4.3",
      interpretation: "Cited maximum building height is 9m.",
      confidence: "Cited",
    },
    floorSpaceRatio: {
      label: "Floor space ratio",
      value: null,
      present: false,
      interpretation: "No mapped FSR found yet.",
      confidence: "Unavailable",
    },
    minimumLotSize: {
      label: "Minimum lot size",
      value: "40ha",
      present: true,
      source: "Byron LEP 2014",
      lepSource: true,
      clauseRef: "4.1",
      interpretation: "Minimum lot size is mapped as 40ha.",
      confidence: "Cited",
    },
  },
  notes: [],
  nextSteps: [],
  lepEvidenceSummary: citedSummary,
};

const dppPayload = (overrides: Partial<DetailedPlanningPackContent> = {}): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt: "2026-07-10T01:03:00.000Z",
  projectId: project.id,
  site: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    lgaCode: "BYRON",
    zoneCode: "SP3",
    zoneName: "Tourist",
    zoneLabel: "SP3 – Tourist",
  },
  proposalBrief: "Alterations and additions to tourist accommodation.",
  sourceQuickSiteCheck: {
    artefactId: "quick-site-check-id",
    title: "Quick Site Check — 45 Broken Head Road",
    generatedAt: quickSiteCheckPayload.generatedAt,
    lepEvidenceSummary: citedSummary,
  },
  carriedLepEvidenceSummary: citedSummary,
  dcpEvidence: [
    {
      topicId: "tourist_setbacks",
      topicLabel: "Tourist setbacks",
      status: "Cited",
      reason: "SP3 tourist controls survived applicability filtering.",
      citations: [
        {
          ref: "Byron DCP 2014 D1.2",
          title: "Tourist setbacks",
          headingPath: ["Chapter D1", "SP3 tourist controls"],
          excerpt: "Setbacks for tourist accommodation must respond to the coastal character.",
          score: 12,
        },
      ],
    },
  ],
  topicMatrix: [
    {
      topicId: "tourist_setbacks",
      topicLabel: "Tourist setbacks",
      status: "Cited",
      summary: "SP3 tourist setbacks cited from the DCP.",
      sourceRefs: ["Byron DCP 2014 D1.2"],
    },
  ],
  unresolvedTopics: [],
  consultantReviewQuestions: ["Confirm coastal character controls."],
  nextAction: "Generate SEE.",
  commercialReady: true,
  ...overrides,
});

const seePayload = (overrides: Partial<WorkspacePreSeePlanningMemoContent> = {}): WorkspacePreSeePlanningMemoContent => ({
  memoType: "pre_see_planning_memo",
  generatedAt: "2026-07-10T01:05:00.000Z",
  projectId: project.id,
  siteDescription: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    zoneCode: "SP3",
    zoneName: "Tourist",
    zoneLabel: "SP3 – Tourist",
  },
  proposedWorksSummary: "Alterations and additions to tourist accommodation.",
  applicableControls: {
    lepInstrument: quickSiteCheckPayload.lepInstrument,
    permissibility: quickSiteCheckPayload.permissibility,
    quickSiteControls: sanitiseQuickSiteLepControls(quickSiteCheckPayload.controls),
    dcpClauses: [
      {
        ref: "Byron DCP 2014 D1.2",
        title: "Tourist setbacks",
        headingPath: ["Chapter D1", "SP3 tourist controls"],
        bodyText: "Setbacks for tourist accommodation must respond to the coastal character.",
        score: 12,
      },
    ],
    sourceExcerpts: [
      {
        id: "tourist_setbacks:Byron DCP 2014 D1.2",
        heading: "Tourist setbacks",
        sourceType: "detailed_planning_pack",
        content: "Setbacks for tourist accommodation must respond to the coastal character.",
        score: 12,
      },
    ],
  },
  consistencyAssessment: [
    {
      topic: "Land use permissibility",
      assessment: quickSiteCheckPayload.permissibility!.interpretation,
      citations: [{ ref: "Byron LEP 2014 cl. 2.3", type: "LEP" }],
    },
    {
      topic: "Height of building",
      assessment: quickSiteCheckPayload.controls.heightOfBuilding.interpretation,
      citations: [{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }],
    },
    {
      topic: "Floor space ratio",
      assessment: "Not found in retrieved LEP data",
      citations: [],
    },
    {
      topic: "Minimum lot size",
      assessment: quickSiteCheckPayload.controls.minimumLotSize.interpretation,
      citations: [{ ref: "Byron LEP 2014 cl. 4.1", type: "LEP" }],
    },
    {
      topic: "Tourist setbacks",
      assessment: "SP3 tourist setbacks cited from the DCP.",
      citations: [{ ref: "Byron DCP 2014 D1.2", type: "DCP" }],
    },
  ],
  limitations: ["Confirm survey levels before relying on building height compliance."],
  sourceDetailedPlanningPack: {
    artefactId: "dpp-id",
    title: "Detailed Planning Pack — 45 Broken Head Road",
    generatedAt: "2026-07-10T01:03:00.000Z",
    commercialReady: true,
    sourceQuickSiteCheckArtefactId: "quick-site-check-id",
  },
  ...overrides,
});

const makeArtefact = (overrides: Record<string, unknown>) => ({
  id: "artefact-id",
  projectId: project.id,
  title: "Artefact",
  source: null,
  sourceUrl: null,
  overlays: [],
  notes: null,
  imageUrl: null,
  capturedAt: new Date("2026-07-10T01:00:00.000Z"),
  staleAt: null,
  createdAt: new Date("2026-07-10T01:00:00.000Z"),
  updatedAt: new Date("2026-07-10T01:00:00.000Z"),
  createdById: "user-1",
  ...overrides,
});

const qscArtefact = (payload = quickSiteCheckPayload) => makeArtefact({
  id: "quick-site-check-id",
  type: "quick_site_check",
  title: "Quick Site Check — 45 Broken Head Road",
  payload,
});

const dppArtefact = (payload = dppPayload(), overrides: Record<string, unknown> = {}) => makeArtefact({
  id: "dpp-id",
  type: "detailed_planning_pack",
  title: "Detailed Planning Pack — 45 Broken Head Road",
  payload,
  capturedAt: new Date(payload.generatedAt),
  createdAt: new Date(payload.generatedAt),
  ...overrides,
});

const seeArtefact = (payload = seePayload(), overrides: Record<string, unknown> = {}) => makeArtefact({
  id: "see-draft-id",
  type: "pre_see_planning_memo",
  title: "Pre-SEE planning memo — 45 Broken Head Road",
  payload,
  capturedAt: new Date(payload.generatedAt),
  createdAt: new Date(payload.generatedAt),
  ...overrides,
});

const makeDeps = (savedArtefacts: Array<ReturnType<typeof makeArtefact>>) => {
  const createdReviewArtefact = makeArtefact({
    id: "review-request-id",
    type: "review_request",
    title: "Expert review request",
  });
  const artefactCreate = vi.fn(async ({ data }) => ({ ...createdReviewArtefact, ...data }));

  return {
    deps: {
      prisma: {
        project: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(project)
            .mockResolvedValueOnce({ id: project.id }),
          findUnique: vi.fn().mockResolvedValue(projectWithSite),
        },
        artefact: {
          findMany: vi.fn(async () => savedArtefacts),
          create: artefactCreate,
        },
      },
    },
    artefactCreate,
  };
};

describe("createExpertReviewRequestArtefact", () => {
  it("packages current-site QSC, DPP and matching SEE into a review request artefact", async () => {
    const { deps, artefactCreate } = makeDeps([qscArtefact(), dppArtefact(), seeArtefact()]);

    const result = await createExpertReviewRequestArtefact(
      { body: { projectId: project.publicId }, userId: "user-1" },
      deps,
    );

    expect(result.artefact.type).toBe("review_request");
    expect(result.content.site).toEqual({
      address: "45 Broken Head Road, Byron Bay NSW 2481",
      lga: "Byron Shire",
      zoneLabel: "SP3 – Tourist",
    });
    expect(result.content.includedArtefacts).toEqual([
      expect.objectContaining({ id: "quick-site-check-id", type: "quick_site_check" }),
      expect.objectContaining({ id: "dpp-id", type: "detailed_planning_pack" }),
      expect.objectContaining({ id: "see-draft-id", type: "pre_see_planning_memo" }),
    ]);
    expect(result.content.detailedPlanningPack).toEqual(expect.objectContaining({
      artefactId: "dpp-id",
      proposalBrief: "Alterations and additions to tourist accommodation.",
      commercialReady: true,
      sourceQuickSiteCheckArtefactId: "quick-site-check-id",
    }));
    expect(result.content.sourceSeeMemo).toEqual(expect.objectContaining({
      artefactId: "see-draft-id",
      sourceDetailedPlanningPackArtefactId: "dpp-id",
    }));
    expect(result.content.citedSources).toEqual(expect.arrayContaining([
      { ref: "4.3", type: "LEP" },
      { ref: "4.1", type: "LEP" },
      { ref: "Byron DCP 2014 D1.2", type: "DCP" },
    ]));
    expect(result.content.lepEvidenceSummary).toEqual(citedSummary);
    expect(result.content.assumptions).toEqual(expect.arrayContaining([
      "Proposed works from Detailed Planning Pack: Alterations and additions to tourist accommodation.",
      "Detailed Planning Pack is marked commercial-ready.",
    ]));
    expect(artefactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: project.id,
        createdById: "user-1",
        type: "review_request",
        payload: result.content,
      }),
    });
  });

  it("packages unresolved current-site DPP for referral without SEE or false readiness", async () => {
    const unresolvedPack = dppPayload({
      commercialReady: false,
      unresolvedTopics: ["Parking and access: no current DCP clause found."],
      consultantReviewQuestions: ["Confirm parking rates with council."],
      topicMatrix: [{ topicId: "parking", topicLabel: "Parking", status: "Unavailable", summary: "Needs expert review.", sourceRefs: [] }],
    });
    const matchingSee = seePayload({
      sourceDetailedPlanningPack: {
        artefactId: "dpp-id",
        title: "Detailed Planning Pack — 45 Broken Head Road",
        generatedAt: unresolvedPack.generatedAt,
        commercialReady: false,
        sourceQuickSiteCheckArtefactId: "quick-site-check-id",
      },
    });
    const { deps } = makeDeps([qscArtefact(), dppArtefact(unresolvedPack), seeArtefact(matchingSee)]);

    const result = await createExpertReviewRequestArtefact({ body: { projectId: project.publicId }, userId: "user-1" }, deps);

    expect(result.content.includedArtefacts.map((artefact) => artefact.type)).toEqual(["quick_site_check", "detailed_planning_pack"]);
    expect(result.content.sourceSeeMemo).toBeNull();
    expect(result.content.packageSummary).toContain("No SEE readiness is claimed");
    expect(result.content.detailedPlanningPack?.commercialReady).toBe(false);
    expect(result.content.detailedPlanningPack?.unresolvedTopics).toEqual(["Parking and access: no current DCP clause found."]);
    expect(result.content.confidenceGaps).toEqual(expect.arrayContaining([
      "Detailed Planning Pack unresolved topic: Parking and access: no current DCP clause found.",
    ]));
  });

  it("does not package a SEE from another DPP or site", async () => {
    const mismatchedSee = seePayload({
      siteDescription: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneName: "Commercial Centre", zoneLabel: "E2 – Commercial Centre" },
      sourceDetailedPlanningPack: {
        artefactId: "other-dpp-id",
        title: "Detailed Planning Pack — Kempsey",
        generatedAt: "2026-07-10T01:03:00.000Z",
        commercialReady: true,
        sourceQuickSiteCheckArtefactId: "quick-site-check-id",
      },
    });
    const { deps } = makeDeps([qscArtefact(), dppArtefact(), seeArtefact(mismatchedSee)]);

    const result = await createExpertReviewRequestArtefact({ body: { projectId: project.publicId }, userId: "user-1" }, deps);

    expect(result.content.includedArtefacts.map((artefact) => artefact.type)).toEqual(["quick_site_check", "detailed_planning_pack"]);
    expect(result.content.sourceSeeMemo).toBeNull();
    expect(result.content.missingInputs).toContain("Matching SEE generated from the current Detailed Planning Pack");
  });

  it("does not promote forged LEP controls or altered SEE snapshots into review evidence", async () => {
    const forgedQuickSiteCheck: QuickSiteCheckReport = {
      ...quickSiteCheckPayload,
      controls: {
        ...quickSiteCheckPayload.controls,
        heightOfBuilding: {
          ...quickSiteCheckPayload.controls.heightOfBuilding,
          value: "99m",
          present: true,
          lepSource: false,
          clauseRef: "FAKE 4.3",
          confidence: "Cited",
          interpretation: "Forged client height.",
        },
      },
    };
    const baseSee = seePayload();
    const alteredSee = seePayload({
      applicableControls: {
        ...baseSee.applicableControls,
        quickSiteControls: {
          ...baseSee.applicableControls.quickSiteControls,
          heightOfBuilding: {
            ...baseSee.applicableControls.quickSiteControls.heightOfBuilding,
            value: "99m",
          },
        },
      },
    });
    const { deps } = makeDeps([
      qscArtefact(forgedQuickSiteCheck),
      dppArtefact(),
      seeArtefact(alteredSee),
    ]);

    const result = await createExpertReviewRequestArtefact(
      { body: { projectId: project.publicId }, userId: "user-1" },
      deps,
    );

    expect(result.content.includedArtefacts.map((artefact) => artefact.type)).toEqual([
      "quick_site_check",
      "detailed_planning_pack",
    ]);
    expect(result.content.sourceSeeMemo).toBeNull();
    expect(result.content.citedSources).not.toContainEqual({ ref: "FAKE 4.3", type: "LEP" });
    expect(result.content.confidenceGaps).toContain(
      "Height of building: Not found in retrieved LEP data",
    );
    expect(result.content.missingInputs).toContain(
      "Matching SEE generated from the current Detailed Planning Pack",
    );
  });

  it("rejects legacy QSC plus SEE without DPP provenance and persists no review", async () => {
    const { deps, artefactCreate } = makeDeps([qscArtefact(), seeArtefact(seePayload({ sourceDetailedPlanningPack: undefined }))]);

    await expect(
      createExpertReviewRequestArtefact({ body: { projectId: project.publicId }, userId: "user-1" }, deps),
    ).rejects.toBeInstanceOf(ArtefactValidationError);
    expect(artefactCreate).not.toHaveBeenCalled();
  });

  it("rejects a DPP whose source QSC no longer exists", async () => {
    const { deps, artefactCreate } = makeDeps([dppArtefact()]);

    await expect(
      createExpertReviewRequestArtefact({ body: { projectId: project.publicId }, userId: "user-1" }, deps),
    ).rejects.toBeInstanceOf(ArtefactValidationError);
    expect(artefactCreate).not.toHaveBeenCalled();
  });
});

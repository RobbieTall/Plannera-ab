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
} from "@/lib/artefact-service";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

const project = {
  id: "project-db-id",
  publicId: "project-public-id",
  title: "Byron review project",
  address: "45 Broken Head Road, Byron Bay NSW 2481",
  zoning: null,
  zoningName: "RU2 Rural Landscape",
};

const quickSiteCheckPayload: QuickSiteCheckReport = {
  projectId: project.id,
  generatedAt: "2026-07-10T01:00:00.000Z",
  site: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    zoneCode: "RU2",
    zoneName: "Rural Landscape",
    zoneLabel: "RU2 – Rural Landscape",
  },
  lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
  permissibility: {
    zoneLabel: "RU2 – Rural Landscape",
    permittedWithoutConsent: [],
    permittedWithConsent: ["dwelling house"],
    prohibited: [],
    interpretation: "Dwelling houses are permitted with consent in RU2.",
  },
  controls: {
    heightOfBuilding: {
      label: "Height of building",
      value: "9m",
      present: true,
      source: "Byron LEP 2014",
      clauseRef: "Byron LEP 2014 cl. 4.3",
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
      clauseRef: "Byron LEP 2014 cl. 4.1",
      interpretation: "Minimum lot size is mapped as 40ha.",
      confidence: "Cited",
    },
  },
  notes: [],
  nextSteps: [],
};

const seePayload: WorkspacePreSeePlanningMemoContent = {
  memoType: "pre_see_planning_memo",
  generatedAt: "2026-07-10T01:05:00.000Z",
  projectId: project.id,
  siteDescription: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    zoneCode: "RU2",
    zoneName: "Rural Landscape",
    zoneLabel: "RU2 – Rural Landscape",
  },
  proposedWorksSummary: "Alterations and additions to an existing dwelling.",
  applicableControls: {
    lepInstrument: { name: "Byron LEP 2014" },
    permissibility: { landUse: "dwelling house", status: "permitted with consent", interpretation: "Consent required." },
    quickSiteControls: {},
    dcpClauses: [
      {
        ref: "Byron DCP 2014 D1.2",
        title: "Setbacks",
        headingPath: ["Chapter D1", "Setbacks"],
        bodyText: "Setbacks must respond to the streetscape.",
        score: 12,
      },
    ],
    sourceExcerpts: [],
  },
  consistencyAssessment: [
    {
      topic: "Building height",
      assessment: "The proposal should be checked against the 9m height control.",
      citations: [{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }],
    },
    {
      topic: "Setbacks",
      assessment: "Setbacks require planner review against the DCP.",
      citations: [{ ref: "Byron DCP 2014 D1.2", type: "DCP" }],
    },
  ],
  limitations: ["Confirm survey levels before relying on building height compliance."],
};

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
          findUnique: vi.fn(),
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
  it("packages saved Quick Site Check and SEE draft into a review request artefact", async () => {
    const quickSiteCheck = makeArtefact({
      id: "quick-site-check-id",
      type: "quick_site_check",
      title: "Quick Site Check — 45 Broken Head Road",
      payload: quickSiteCheckPayload,
    });
    const seeDraft = makeArtefact({
      id: "see-draft-id",
      type: "pre_see_planning_memo",
      title: "Pre-SEE planning memo — 45 Broken Head Road",
      payload: seePayload,
      capturedAt: new Date("2026-07-10T01:05:00.000Z"),
      createdAt: new Date("2026-07-10T01:05:00.000Z"),
    });
    const { deps, artefactCreate } = makeDeps([quickSiteCheck, seeDraft]);

    const result = await createExpertReviewRequestArtefact(
      { body: { projectId: project.publicId }, userId: "user-1" },
      deps,
    );

    expect(result.artefact.type).toBe("review_request");
    expect(result.content.site).toEqual({
      address: "45 Broken Head Road, Byron Bay NSW 2481",
      lga: "Byron Shire",
      zoneLabel: "RU2 – Rural Landscape",
    });
    expect(result.content.includedArtefacts).toEqual([
      expect.objectContaining({ id: "quick-site-check-id", type: "quick_site_check" }),
      expect.objectContaining({ id: "see-draft-id", type: "pre_see_planning_memo" }),
    ]);
    expect(result.content.citedSources).toEqual(
      expect.arrayContaining([
        { ref: "Byron LEP 2014 cl. 4.3", type: "LEP" },
        { ref: "Byron LEP 2014 cl. 4.1", type: "LEP" },
        { ref: "Byron DCP 2014 D1.2", type: "DCP" },
      ]),
    );
    expect(result.content.confidenceGaps).toEqual(
      expect.arrayContaining([
        "Floor space ratio: No mapped FSR found yet.",
        "Confirm survey levels before relying on building height compliance.",
      ]),
    );
    expect(result.content.missingInputs).toEqual(["No obvious missing inputs detected by Plannera."]);
    expect(result.content.assumptions).toEqual(
      expect.arrayContaining([
        "Proposed works: Alterations and additions to an existing dwelling.",
        "Dwelling houses are permitted with consent in RU2.",
      ]),
    );
    expect(artefactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: project.id,
        createdById: "user-1",
        type: "review_request",
        payload: result.content,
      }),
    });
  });

  it.each([
    ["Quick Site Check", [makeArtefact({ id: "see-draft-id", type: "pre_see_planning_memo", payload: seePayload })]],
    ["SEE draft", [makeArtefact({ id: "quick-site-check-id", type: "quick_site_check", payload: quickSiteCheckPayload })]],
  ])("rejects when the saved %s artefact is missing", async (_missingLabel, savedArtefacts) => {
    const { deps, artefactCreate } = makeDeps(savedArtefacts);

    await expect(
      createExpertReviewRequestArtefact(
        { body: { projectId: project.publicId }, userId: "user-1" },
        deps,
      ),
    ).rejects.toBeInstanceOf(ArtefactValidationError);
    expect(artefactCreate).not.toHaveBeenCalled();
  });
});

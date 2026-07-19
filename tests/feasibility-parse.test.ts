import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEV_BYPASS_USER_ID,
  ArtefactValidationError,
  createPlanningFeasibilitySummaryArtefact,
} from "../src/lib/artefact-service";
import type { QuickSiteCheckReport } from "../src/types/quick-site-check";
import type { DetailedPlanningPackContent } from "../src/types/workspace";

const generatedAt = "2026-07-19T00:00:00.000Z";
const artefactBase = (id: string, type: string, payload: unknown) => ({
  id,
  projectId: "db-project",
  createdById: null,
  type,
  title: id,
  source: "41 Julian Rocks Dr",
  sourceUrl: null,
  fileName: null,
  filePath: null,
  mimeType: null,
  sizeBytes: null,
  overlays: [],
  notes: null,
  payload,
  staleAt: null,
  staleReason: null,
  capturedAt: new Date(generatedAt),
  createdAt: new Date(generatedAt),
  updatedAt: new Date(generatedAt),
}) as any;

const qsc = (pathway: "permitted_with_consent" | "prohibited" = "permitted_with_consent"): QuickSiteCheckReport => ({
  projectId: "db-project",
  generatedAt,
  site: { address: "41 Julian Rocks Dr", lga: "Byron", zoneCode: "R2", zoneName: "Low Density Residential", zoneLabel: "R2 - Low Density Residential" },
  lepInstrument: { name: "Byron Local Environmental Plan 2014", code: "BYRON_LEP_2014", lga: "Byron", source: "ingestion" },
  permissibility: null,
  controls: {
    heightOfBuilding: { label: "Height", value: "9m", present: true, source: "Byron LEP 2014 Height of Buildings Map", lepSource: true, clauseRef: "Clause 4.3", detail: null, interpretation: "Maximum mapped height" },
    floorSpaceRatio: { label: "FSR", value: "0.5:1", present: true, source: "Byron LEP 2014 Floor Space Ratio Map", lepSource: true, clauseRef: "Clause 4.4", detail: null, interpretation: "Maximum mapped FSR" },
    minimumLotSize: { label: "Minimum lot size", value: "600 m2", present: true, source: "Byron LEP 2014 Lot Size Map", lepSource: true, clauseRef: "Clause 4.1", detail: null, interpretation: "Mapped minimum lot size" },
  },
  notes: [],
  nextSteps: [],
  lepEvidenceSummary: { label: "Cited", detail: "Cited LEP evidence", citedControlCount: 3, totalControlCount: 3, landUseEntryCount: 1, objectiveCount: 2, sourceRef: "Byron Local Environmental Plan 2014 Zone R2" },
  developmentIntent: {
    description: "Dwelling houses",
    status: "Cited",
    pathway,
    statutoryLandUse: "Dwelling houses",
    sourceRef: "Byron Local Environmental Plan 2014 Zone R2 Land Use Table",
    detail: pathway === "prohibited" ? "Dwelling houses are prohibited in Zone R2." : "Dwelling houses are permitted with consent in Zone R2.",
  },
});

const pack = (status: "Cited" | "Unavailable" = "Cited"): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt,
  projectId: "db-project",
  site: { address: "41 Julian Rocks Dr", lga: "Byron", lgaCode: "BYRON", zoneCode: "R2", zoneName: "Low Density Residential", zoneLabel: "R2 - Low Density Residential" },
  proposalBrief: "Dwelling houses",
  sourceQuickSiteCheck: { artefactId: "qsc-1", title: "Quick Site Check", generatedAt, lepEvidenceSummary: qsc().lepEvidenceSummary },
  carriedLepEvidenceSummary: qsc().lepEvidenceSummary ?? null,
  dcpEvidence: [{ topicId: "setbacks", topicLabel: "Setbacks", status, reason: status === "Cited" ? "Control found" : "No applicable clause found", citations: status === "Cited" ? [{ ref: "Byron DCP 2014 Part A", title: "Setbacks", headingPath: [], excerpt: "A setback applies.", score: 1 }] : [] }],
  topicMatrix: [{ topicId: "setbacks", topicLabel: "Setbacks", status, summary: status === "Cited" ? "Apply the cited setback control." : "Setback requirement remains unresolved.", sourceRefs: status === "Cited" ? ["Byron DCP 2014 Part A"] : [] }],
  unresolvedTopics: status === "Cited" ? [] : ["Setbacks"],
  consultantReviewQuestions: [],
  nextAction: "Review controls.",
  commercialReady: status === "Cited",
});

describe("createPlanningFeasibilitySummaryArtefact", () => {
  it("persists a server-derived summary bound to the exact current DCP pack", async () => {
    const report = qsc();
    const detailedPack = pack();
    const qscArtefact = artefactBase("qsc-1", "quick_site_check", report);
    const dppArtefact = artefactBase("dpp-1", "detailed_planning_pack", detailedPack);
    let savedPayload: unknown = null;
    const project = { id: "db-project", publicId: "public-project", title: "Test", address: "41 Julian Rocks Dr", siteContext: null };

    const result = await createPlanningFeasibilitySummaryArtefact({
      body: {
        projectId: "public-project",
        sourceDetailedPlanningPackArtefactId: "dpp-1",
        expectedProposalBrief: "Dwelling houses",
        overallVerdict: "proceed",
        address: "forged address",
      },
      userId: DEV_BYPASS_USER_ID,
      deps: {
        prisma: {
          project: {
            findFirst: async () => project,
            findUnique: async () => ({ ...project, siteContext: { formattedAddress: "41 Julian Rocks Dr", lgaName: "Byron", lgaCode: "BYRON", zone: "R2 - Low Density Residential" } }),
          },
          artefact: {
            findMany: async () => [dppArtefact, qscArtefact],
            create: async ({ data }: { data: { payload: unknown } }) => {
              savedPayload = data.payload;
              return artefactBase("feasibility-1", "feasibility", data.payload);
            },
          },
        } as any,
      },
    });

    assert.equal(result.artefact.id, "feasibility-1");
    assert.notEqual(result.content.overallVerdict, "proceed");
    assert.equal((savedPayload as { sourceDetailedPlanningPack?: { artefactId?: string } }).sourceDetailedPlanningPack?.artefactId, "dpp-1");
  });

  it("rejects a proposal brief that does not match the selected pack", async () => {
    const report = qsc();
    const detailedPack = pack();
    const project = { id: "db-project", publicId: "public-project", title: "Test", address: "41 Julian Rocks Dr" };

    await assert.rejects(
      createPlanningFeasibilitySummaryArtefact({
        body: { projectId: "public-project", sourceDetailedPlanningPackArtefactId: "dpp-1", expectedProposalBrief: "Dual occupancy" },
        userId: DEV_BYPASS_USER_ID,
        deps: {
          prisma: {
            project: {
              findFirst: async () => project,
              findUnique: async () => ({ ...project, siteContext: { formattedAddress: "41 Julian Rocks Dr", lgaName: "Byron", lgaCode: "BYRON", zone: "R2" } }),
            },
            artefact: {
              findMany: async () => [artefactBase("dpp-1", "detailed_planning_pack", detailedPack), artefactBase("qsc-1", "quick_site_check", report)],
              create: async () => artefactBase("never", "feasibility", {}),
            },
          } as any,
        },
      }),
      (error: unknown) => error instanceof ArtefactValidationError && /different proposed-works brief/i.test(error.message),
    );
  });
});

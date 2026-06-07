import assert from "node:assert/strict";
import test from "node:test";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createMapSnapshotArtefact,
  createPreSeePlanningMemoArtefact,
  createQuickSiteCheckArtefact,
} from "@/lib/artefact-service";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

class MockPrisma {
  artefacts: any[] = [];
  constructor(private projectMembers: Record<string, string[]>) {}

  project = {
    findUnique: async ({ where }: any) => ({
      id: where.id,
      publicId: where.id,
      title: "Test project",
      siteContext: {
        id: "site-1",
        projectId: where.id,
        addressInput: "123 Test St",
        formattedAddress: "123 Test St, Byron Bay NSW",
        lgaName: "Byron",
        lgaCode: "BYRON",
        parcelId: null,
        lot: null,
        planNumber: null,
        latitude: null,
        longitude: null,
        zone: "R2 Low Density Residential",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),
    findFirst: async ({ where }: any) => {
      const membershipCheck = where.OR?.some((clause: any) => clause.createdById || clause.collaborators);

      if (!membershipCheck) {
        const lookupId = where.id ?? where.OR?.[0]?.publicId ?? where.OR?.[1]?.id ?? where.publicId;
        return lookupId ? { id: lookupId, publicId: lookupId } : undefined;
      }

      const members = this.projectMembers[where.id] ?? [];
      const ownerId = where.OR?.find((clause: any) => clause.createdById)?.createdById;
      const collaboratorId = where.OR?.find((clause: any) => clause.collaborators)?.collaborators?.some?.userId;

      if ((ownerId && members.includes(ownerId)) || (collaboratorId && members.includes(collaboratorId))) {
        return { id: where.id, publicId: where.id };
      }

      return undefined;
    },
  };

  artefact = {
    create: async ({ data }: any) => {
      const artefact = { id: `art-${this.artefacts.length + 1}`, ...data };
      this.artefacts.push(artefact);
      return artefact;
    },
    findMany: async ({ where }: any) => this.artefacts.filter((item) => item.projectId === where.projectId),
  };
}

const mockSaveFile = async (file: File) => ({
  url: `/mock/${file.name}`,
  path: `/tmp/${file.name}`,
  mimeType: file.type,
  size: file.size,
});

test("creates a map_snapshot artefact with overlays and notes", async () => {
  const prisma = new MockPrisma({
    "proj-1": ["user-1"],
  });

  const formData = new FormData();
  formData.set("projectId", "proj-1");
  formData.set("title", "Flood overlays");
  formData.set("source", "NSW Spatial Viewer");
  formData.set("sourceUrl", "https://example.com/viewer");
  formData.append("overlays", "flood");
  formData.append("overlays", "bushfire");
  formData.set("notes", "Captured after latest council update");
  formData.set("file", new File(["image-bytes"], "snapshot.png", { type: "image/png" }));

  const artefact = await createMapSnapshotArtefact({
    formData,
    projectId: "proj-1",
    userId: "user-1",
    deps: { prisma: prisma as any, saveFile: mockSaveFile },
  });

  assert.equal(artefact.type, "map_snapshot");
  assert.equal(artefact.title, "Flood overlays");
  assert.deepEqual(artefact.overlays, ["flood", "bushfire"]);
  assert.equal(artefact.imageUrl, "/mock/snapshot.png");
  assert.ok(artefact.capturedAt instanceof Date);
});

test("rejects creation when project access is missing", async () => {
  const prisma = new MockPrisma({ "proj-1": ["different-user"] });
  const formData = new FormData();
  formData.set("projectId", "proj-1");
  formData.set("title", "Flood overlays");
  formData.set("source", "NSW Spatial Viewer");
  formData.set("file", new File(["image-bytes"], "snapshot.png", { type: "image/png" }));

  await assert.rejects(
    () =>
      createMapSnapshotArtefact({
        formData,
        projectId: "proj-1",
        userId: "user-1",
        deps: { prisma: prisma as any, saveFile: mockSaveFile },
      }),
    (error) => {
      assert.ok(error instanceof ArtefactAccessError);
      return true;
    },
  );
});

test("validates that an image file is required", async () => {
  const prisma = new MockPrisma({ "proj-1": ["user-1"] });
  const formData = new FormData();
  formData.set("projectId", "proj-1");
  formData.set("title", "Flood overlays");
  formData.set("source", "NSW Spatial Viewer");

  await assert.rejects(
    () =>
      createMapSnapshotArtefact({
        formData,
        projectId: "proj-1",
        userId: "user-1",
        deps: { prisma: prisma as any, saveFile: mockSaveFile },
      }),
    (error) => {
      assert.ok(error instanceof ArtefactValidationError);
      return true;
    },
  );
});

test("creates a quick_site_check artefact with the report payload", async () => {
  const prisma = new MockPrisma({ "proj-2": ["user-2"] });
  const report: QuickSiteCheckReport = {
    projectId: "proj-2",
    generatedAt: new Date().toISOString(),
    site: { address: "123 Test St" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: {
        label: "Height of building",
        value: "12m",
        present: true,
        interpretation: "Test interpretation",
      },
      floorSpaceRatio: {
        label: "FSR",
        value: "1:1",
        present: true,
        interpretation: "FSR interpretation",
      },
      minimumLotSize: {
        label: "MLS",
        value: "450sqm",
        present: true,
        interpretation: "MLS interpretation",
      },
    },
    notes: ["A note"],
    nextSteps: ["Do something"],
  };

  const artefact = await createQuickSiteCheckArtefact({
    body: { projectId: "proj-2", title: "Quick Site Check — 123 Test St", type: "quick_site_check", report },
    projectId: "proj-2",
    userId: "user-2",
    deps: {
      prisma: prisma as any,
      getLepContextForProject: async () => ({
        lepContext: null,
        rawLga: null,
        normalisedLga: null,
        instruments: [],
        chosenInstrumentId: null,
        lepClauseCount: 0,
        usedFallback: true,
      }),
      buildQuickSiteCheckLep: async () => ({ ok: false, message: "No LEP data" }),
    },
  });

  assert.equal(artefact.type, "quick_site_check");
  assert.equal(artefact.title, "Quick Site Check — 123 Test St");
  assert.deepEqual(artefact.payload, {
    ...report,
    controls: {
      heightOfBuilding: { ...report.controls.heightOfBuilding, lepSource: false },
      floorSpaceRatio: { ...report.controls.floorSpaceRatio, lepSource: false },
      minimumLotSize: { ...report.controls.minimumLotSize, lepSource: false },
    },
  });
  assert.equal(artefact.notes, "A note");
});

test("creates a quick_site_check artefact enriched with real LEP values", async () => {
  const prisma = new MockPrisma({ "proj-2": ["user-2"] });
  const report: QuickSiteCheckReport = {
    projectId: "proj-2",
    generatedAt: new Date().toISOString(),
    site: { address: "123 Test St", lga: "Byron", zoneCode: "R2", zoneName: "Low Density Residential" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: null, present: false, interpretation: "Fallback height" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Fallback FSR" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Fallback MLS" },
    },
    notes: [],
    nextSteps: [],
  };

  const artefact = await createQuickSiteCheckArtefact({
    body: { projectId: "proj-2", title: "Quick Site Check — 123 Test St", type: "quick_site_check", report },
    projectId: "proj-2",
    userId: "user-2",
    deps: {
      prisma: prisma as any,
      getLepContextForProject: async () => ({
        lepContext: {
          lga: "Byron",
          instrumentName: "Byron LEP 2014",
          instrumentCode: "byron-lep-2014",
          clauses: [
            { ref: "4.3", title: "Height of buildings", text: "The height of a building must not exceed 8.5m." },
            { ref: "4.4", title: "Floor space ratio", text: "The maximum floor space ratio for a building is 0.5:1." },
            { ref: "4.1", title: "Minimum subdivision lot size", text: "The minimum lot size shown for the land is 600 sqm." },
          ],
        },
        rawLga: "Byron",
        normalisedLga: "BYRON",
        instruments: [],
        chosenInstrumentId: "lep-1",
        lepClauseCount: 3,
        usedFallback: false,
      }),
      buildQuickSiteCheckLep: async () => ({
        ok: true,
        projectId: "proj-2",
        lga: "Byron",
        lepName: "Byron LEP 2014",
        zone: "R2",
        objectives: ["To provide for the housing needs of the community."],
        landUse: { withoutConsent: ["Home occupations"], withConsent: ["Dwelling houses"], prohibited: ["Industries"] },
        part4: [],
        part5: [],
        part6: [],
      }),
    },
  });

  const payload = artefact.payload as QuickSiteCheckReport;
  assert.equal(payload.lepInstrument?.name, "Byron LEP 2014");
  assert.equal(payload.permissibility?.permittedWithConsent[0], "Dwelling houses");
  assert.equal(payload.controls.heightOfBuilding.value, "8.5m");
  assert.equal(payload.controls.heightOfBuilding.source, "lep");
  assert.equal(payload.controls.heightOfBuilding.lepSource, true);
  assert.equal(payload.controls.floorSpaceRatio.value, "0.5:1");
  assert.equal(payload.controls.minimumLotSize.value, "600 sqm");
});

test("creates a quick_site_check artefact when LEP enrichment fails", async () => {
  const prisma = new MockPrisma({ "proj-2": ["user-2"] });
  const report: QuickSiteCheckReport = {
    projectId: "proj-2",
    generatedAt: new Date().toISOString(),
    site: { address: "123 Test St" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: "12m", present: true, interpretation: "Fallback height" },
      floorSpaceRatio: { label: "FSR", value: "1:1", present: true, interpretation: "Fallback FSR" },
      minimumLotSize: { label: "MLS", value: "450sqm", present: true, interpretation: "Fallback MLS" },
    },
    notes: [],
    nextSteps: [],
  };

  const artefact = await createQuickSiteCheckArtefact({
    body: { projectId: "proj-2", title: "Quick Site Check — 123 Test St", type: "quick_site_check", report },
    projectId: "proj-2",
    userId: "user-2",
    deps: {
      prisma: prisma as any,
      getLepContextForProject: async () => {
        throw new Error("LEP unavailable");
      },
      buildQuickSiteCheckLep: async () => ({ ok: false, message: "No LEP data" }),
    },
  });

  const payload = artefact.payload as QuickSiteCheckReport;
  assert.equal(payload.controls.heightOfBuilding.value, "12m");
  assert.equal(payload.controls.heightOfBuilding.lepSource, false);
  assert.equal(payload.controls.floorSpaceRatio.value, "1:1");
});

test("creates a pre_see_planning_memo artefact with structured content", async () => {
  const prisma = new MockPrisma({ "proj-3": ["user-3"] });
  const quickSiteCheck: QuickSiteCheckReport = {
    projectId: "proj-3",
    generatedAt: new Date().toISOString(),
    site: {
      address: "123 Test St, Byron Bay NSW",
      lga: "Byron",
      zoneCode: "R2",
      zoneName: "Low Density Residential",
      zoneLabel: "R2 – Low Density Residential",
    },
    lepInstrument: { name: "Byron LEP 2014", code: "byron-lep-2014", lga: "Byron", source: "ingestion" },
    permissibility: {
      zoneLabel: "R2 – Low Density Residential",
      permittedWithoutConsent: [],
      permittedWithConsent: ["Dwelling houses"],
      prohibited: [],
      interpretation: "Dwelling houses require consent in Zone R2.",
    },
    controls: {
      heightOfBuilding: { label: "Height of building", value: "9m", present: true, interpretation: "Height appears to be 9m." },
      floorSpaceRatio: { label: "Floor space ratio", value: null, present: false, interpretation: "No mapped FSR found." },
      minimumLotSize: { label: "Minimum lot size", value: "600sqm", present: true, interpretation: "Minimum lot size appears to be 600sqm." },
    },
    notes: [],
    nextSteps: [],
  };

  const { artefact, content } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-3", proposedWorksSummary: "Alterations and additions to a dwelling." },
    userId: "user-3",
    deps: {
      prisma: prisma as any,
      buildQuickSiteCheckReport: async () => quickSiteCheck,
      getDCPContext: async () => [
        {
          id: "dcp-1",
          lgaCode: "BYRON",
          instrumentSlug: "byron-dcp-2014",
          ref: "D1.1",
          title: "Built form",
          headingPath: ["Chapter D1", "Built form"],
          parentRef: null,
          depth: 2,
          bodyHtml: "<p>Controls</p>",
          bodyText: "Setbacks and built-form controls apply.",
          topicTags: [],
          numericMeta: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 12,
        },
      ],
      getWorkspaceSourceContext: async () => ({
        canonicalLgaCode: "BYRON",
        hasCouncilDcp: true,
        councilDcpSampleHeadings: ["Chapter D1"],
        perSourceTotals: { council_dcp: 1 },
        chunks: [
          {
            id: "chunk-1",
            heading: "Chapter D1",
            content: "Relevant Byron DCP excerpt.",
            lgaCode: "BYRON",
            sourceType: "council_dcp",
            score: 0.9,
          },
        ],
      }),
      getLepContextForProject: async () => ({
        lepContext: null,
        rawLga: null,
        normalisedLga: null,
        instruments: [],
        chosenInstrumentId: null,
        lepClauseCount: 0,
        usedFallback: true,
      }),
      buildQuickSiteCheckLep: async () => ({ ok: false, message: "No LEP data" }),
    },
  });

  assert.equal(artefact.type, "pre_see_planning_memo");
  assert.equal(content.memoType, "pre_see_planning_memo");
  assert.equal(content.siteDescription.lga, "Byron");
  assert.equal(content.applicableControls.dcpClauses[0].ref, "D1.1");
  assert.equal(content.applicableControls.sourceExcerpts[0].heading, "Chapter D1");
});

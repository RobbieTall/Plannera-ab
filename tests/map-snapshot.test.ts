import assert from "node:assert/strict";
import test from "node:test";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createDetailedPlanningPackArtefact,
  createMapSnapshotArtefact,
  createPreSeePlanningMemoArtefact,
  createQuickSiteCheckArtefact,
} from "@/lib/artefact-service";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

class MockPrisma {
  artefacts: any[] = [];
  constructor(private projectMembers: Record<string, string[]>, private siteContexts: Record<string, any> = {}) {}

  project = {
    findUnique: async ({ where }: any) => {
      const override = this.siteContexts[where.id];
      const savedQsc = this.artefacts.find((artefact) => artefact.projectId === where.id && artefact.type === "quick_site_check")?.payload?.site;
      const zoneLabel = override?.zone ?? savedQsc?.zoneLabel ?? ([savedQsc?.zoneCode, savedQsc?.zoneName].filter(Boolean).join(" ") || "R2 Low Density Residential");
      return {
        id: where.id,
        publicId: where.id,
        title: "Test project",
        zoningCode: override?.zoningCode ?? savedQsc?.zoneCode ?? "R2",
        zoningName: override?.zoningName ?? savedQsc?.zoneName ?? "Low Density Residential",
        zoning: zoneLabel,
        siteContext: override?.siteContext ?? {
          id: "site-1",
          projectId: where.id,
          addressInput: savedQsc?.address ?? "123 Test St",
          formattedAddress: savedQsc?.address ?? "123 Test St, Byron Bay NSW",
          lgaName: savedQsc?.lga ?? "Byron",
          lgaCode: savedQsc?.lga?.toUpperCase?.().includes("KEMPSEY") ? "KEMPSEY" : savedQsc?.lga?.toUpperCase?.().includes("BYRON") ? "BYRON" : "BYRON",
          parcelId: null,
          lot: null,
          planNumber: null,
          latitude: null,
          longitude: null,
          zone: zoneLabel,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    },
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


const citedEvidenceSummary = {
  label: "Cited" as const,
  detail: "Saved QSC has cited LEP evidence.",
  citedControlCount: 1,
  totalControlCount: 3,
  landUseEntryCount: 1,
  objectiveCount: 1,
  sourceRef: "Byron LEP 2014",
};

const seedSeeDppChain = (prisma: MockPrisma, projectId: string, quickSiteCheck: QuickSiteCheckReport, proposalBrief: string) => {
  const qsc = { ...quickSiteCheck, lepEvidenceSummary: quickSiteCheck.lepEvidenceSummary ?? citedEvidenceSummary };
  prisma.artefacts.push({
    id: `${projectId}-qsc`,
    projectId,
    type: "quick_site_check",
    title: "Quick Site Check",
    payload: qsc,
    capturedAt: new Date(qsc.generatedAt),
    createdAt: new Date(qsc.generatedAt),
  });
  prisma.artefacts.push({
    id: `${projectId}-dpp`,
    projectId,
    type: "detailed_planning_pack",
    title: "Detailed Planning Pack",
    payload: {
      packType: "detailed_planning_pack",
      generatedAt: new Date().toISOString(),
      projectId,
      site: {
        address: qsc.site.address ?? null,
        lga: qsc.site.lga ?? null,
        lgaCode: qsc.site.lga?.toUpperCase?.().includes("KEMPSEY") ? "KEMPSEY" : "BYRON",
        zoneCode: qsc.site.zoneCode ?? null,
        zoneName: qsc.site.zoneName ?? null,
        zoneLabel: qsc.site.zoneLabel ?? null,
      },
      proposalBrief,
      sourceQuickSiteCheck: { artefactId: `${projectId}-qsc`, title: "Quick Site Check", generatedAt: qsc.generatedAt, lepEvidenceSummary: qsc.lepEvidenceSummary },
      carriedLepEvidenceSummary: qsc.lepEvidenceSummary,
      dcpEvidence: [{
        topicId: "built_form",
        topicLabel: "Built form",
        status: "Cited",
        reason: "Fixture cited DCP evidence.",
        citations: [{ ref: "D1.1", title: "Built form", headingPath: ["Chapter D1", "Built form"], excerpt: "Setbacks and built-form controls apply.", score: 12 }],
      }],
      topicMatrix: [{ topicId: "built_form", topicLabel: "Built form", status: "Cited", summary: "Fixture cited DCP evidence.", sourceRefs: ["D1.1"] }],
      unresolvedTopics: [],
      consultantReviewQuestions: [],
      nextAction: "Generate SEE.",
      commercialReady: true,
    },
    capturedAt: new Date(),
    createdAt: new Date(),
  });
};


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
  const payload = artefact.payload as QuickSiteCheckReport;
  assert.equal(payload.lepEvidenceSummary, null);
  for (const control of [
    payload.controls.heightOfBuilding,
    payload.controls.floorSpaceRatio,
    payload.controls.minimumLotSize,
  ]) {
    assert.equal(control.value, null);
    assert.equal(control.present, false);
    assert.equal(control.source, "Not in retrieved data");
    assert.equal(control.lepSource, false);
    assert.equal(control.clauseRef, null);
    assert.equal(control.confidence, "Unavailable");
    assert.equal(control.interpretation, "Not found in retrieved LEP data");
  }
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
        controls: {
          heightOfBuilding: { value: "8.5m", clauseRef: "4.3", confidence: "Cited" },
          fsr: { value: "0.5:1", clauseRef: "4.4", confidence: "Cited" },
          minLotSize: { value: "600m²", clauseRef: "4.1", confidence: "Cited" },
          zoneObjectives: ["To provide for the housing needs of the community."],
        },
        permissibility: { permittedWithoutConsent: ["Home occupations"], permittedWithConsent: ["Dwelling houses"], prohibited: ["Industries"] },
        dataSource: "db_clauses",
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
  assert.equal(payload.lepEvidenceSummary?.label, "Cited");
  assert.equal(payload.lepEvidenceSummary?.sourceRef, "Byron LEP 2014 Zone R2");
  assert.equal(payload.lepEvidenceSummary?.objectiveCount, 1);
  assert.equal(payload.lepEvidenceSummary?.landUseEntryCount, 3);
  assert.equal(payload.lepEvidenceSummary?.citedControlCount, 3);
});

test("persists server-verified DCP controls without promoting them into the LEP summary", async () => {
  const prisma = new MockPrisma({ "proj-2": ["user-2"] });
  const report: QuickSiteCheckReport = {
    projectId: "proj-2",
    generatedAt: new Date().toISOString(),
    site: { address: "52 Belgrave St", lga: "Kempsey", zoneCode: "E2" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Not found" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Not found" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Not found" },
      setback: { label: "Setback", value: "Nil", present: true, clauseRef: "D4.2", interpretation: "DCP setback", confidence: "Cited" },
    },
    notes: [],
    nextSteps: [],
  };

  const artefact = await createQuickSiteCheckArtefact({
    body: { projectId: "proj-2", title: "Quick Site Check — Kempsey", type: "quick_site_check", report },
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
      buildQuickSiteCheckLep: async () => ({
        ok: true,
        projectId: "proj-2",
        lga: "Kempsey",
        lepName: "Kempsey LEP 2013",
        zone: "E2",
        objectives: ["Fallback objective"],
        controls: {
          heightOfBuilding: null,
          fsr: null,
          minLotSize: null,
          zoneObjectives: ["Fallback objective"],
          setback: {
            value: "Nil",
            clauseRef: "D4.2",
            sourceRef: "Kempsey DCP 2026 Part D > Commercial Centres > Setbacks",
            confidence: "Cited",
          },
        },
        permissibility: null,
        dataSource: "fallback",
        landUse: { withoutConsent: ["Environmental protection works"], withConsent: [], prohibited: [] },
        part4: [],
        part5: [],
        part6: [],
      }),
    },
  });

  const payload = artefact.payload as QuickSiteCheckReport;
  assert.equal(payload.lepEvidenceSummary?.label, "Unavailable");
  assert.equal(payload.lepEvidenceSummary?.sourceRef, "Kempsey LEP 2013 Zone E2");
  assert.equal(payload.lepEvidenceSummary?.citedControlCount, 0);
  assert.equal(payload.lepEvidenceSummary?.objectiveCount, 1);
  assert.equal(payload.lepEvidenceSummary?.landUseEntryCount, 1);
  assert.equal(payload.controls.setback?.value, "Nil");
  assert.equal(payload.controls.setback?.source, "dcp");
  assert.equal(payload.controls.setback?.lepSource, false);
  assert.equal(payload.controls.setback?.clauseRef, "D4.2");
  assert.equal(payload.controls.setback?.detail, "Kempsey DCP 2026 Part D > Commercial Centres > Setbacks");
  assert.equal(payload.controls.setback?.confidence, "Cited");
});

test("keeps cited zone-table evidence while clearing forged client numeric and DCP controls", async () => {
  const prisma = new MockPrisma({ "proj-2": ["user-2"] });
  const report: QuickSiteCheckReport = {
    projectId: "proj-2",
    generatedAt: new Date().toISOString(),
    site: { address: "45 Broken Head Road", lga: "Byron", zoneCode: "SP3" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: "99m", present: true, source: "client", lepSource: false, clauseRef: "4.3", interpretation: "Forged height.", confidence: "Cited" },
      floorSpaceRatio: { label: "FSR", value: "9:1", present: true, source: "client", lepSource: false, clauseRef: "4.4", interpretation: "Forged FSR.", confidence: "Cited" },
      minimumLotSize: { label: "MLS", value: "1sqm", present: true, source: "client", lepSource: false, clauseRef: "4.1", interpretation: "Forged lot size.", confidence: "Cited" },
      parking: { label: "Parking", value: "No parking required", present: true, source: "client", clauseRef: "FAKE DCP", interpretation: "Forged parking.", confidence: "Cited" },
    },
    notes: [],
    nextSteps: [],
  };

  const artefact = await createQuickSiteCheckArtefact({
    body: { projectId: "proj-2", title: "Quick Site Check — Forged controls", type: "quick_site_check", report },
    projectId: "proj-2",
    userId: "user-2",
    deps: {
      prisma: prisma as any,
      getLepContextForProject: async () => ({
        lepContext: {
          lga: "Byron",
          instrumentName: "Byron LEP 2014",
          instrumentCode: "byron-lep-2014",
          clauses: [{ ref: "2.3", title: "Zone objectives and land use table", text: "Zone SP3 Tourist." }],
        },
        rawLga: "Byron",
        normalisedLga: "BYRON",
        instruments: [],
        chosenInstrumentId: "lep-1",
        lepClauseCount: 1,
        usedFallback: false,
      }),
      buildQuickSiteCheckLep: async () => ({
        ok: true,
        projectId: "proj-2",
        lga: "Byron",
        lepName: "Byron LEP 2014",
        zone: "SP3",
        objectives: ["To provide for tourism development."],
        controls: { heightOfBuilding: null, fsr: null, minLotSize: null, zoneObjectives: ["To provide for tourism development."] },
        permissibility: { permittedWithoutConsent: [], permittedWithConsent: ["Tourist and visitor accommodation"], prohibited: [] },
        dataSource: "db_clauses",
        landUse: { withoutConsent: [], withConsent: ["Tourist and visitor accommodation"], prohibited: [] },
        part4: [],
        part5: [],
        part6: [],
      }),
    },
  });

  const payload = artefact.payload as QuickSiteCheckReport;
  assert.equal(payload.lepEvidenceSummary?.label, "Cited");
  assert.equal(payload.lepEvidenceSummary?.citedControlCount, 0);
  for (const control of [
    payload.controls.heightOfBuilding,
    payload.controls.floorSpaceRatio,
    payload.controls.minimumLotSize,
  ]) {
    assert.equal(control.value, null);
    assert.equal(control.present, false);
    assert.equal(control.clauseRef, null);
    assert.equal(control.lepSource, false);
    assert.equal(control.confidence, "Unavailable");
  }
  assert.equal(payload.controls.parking?.value, null);
  assert.equal(payload.controls.parking?.present, false);
  assert.equal(payload.controls.parking?.source, "Not in retrieved data");
  assert.equal(payload.controls.parking?.clauseRef, null);
  assert.equal(payload.controls.parking?.confidence, "Unavailable");
  assert.equal(payload.controls.parking?.interpretation, "Not found in retrieved DCP data");
});

test("does not persist a forged client LEP evidence summary when server LEP enrichment is unavailable", async () => {
  const prisma = new MockPrisma({ "proj-2": ["user-2"] });
  const report: QuickSiteCheckReport = {
    projectId: "proj-2",
    generatedAt: new Date().toISOString(),
    site: { address: "123 Test St", lga: "Byron", zoneCode: "SP3" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Not found" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Not found" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Not found" },
    },
    notes: [],
    nextSteps: [],
    lepEvidenceSummary: {
      label: "Cited",
      detail: "Forged client summary",
      citedControlCount: 99,
      totalControlCount: 99,
      landUseEntryCount: 99,
      objectiveCount: 99,
      sourceRef: "Forged LEP Zone SP3",
    },
  };

  const artefact = await createQuickSiteCheckArtefact({
    body: { projectId: "proj-2", title: "Quick Site Check — Forged", type: "quick_site_check", report },
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

  assert.equal((artefact.payload as QuickSiteCheckReport).lepEvidenceSummary, null);
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
  for (const control of [
    payload.controls.heightOfBuilding,
    payload.controls.floorSpaceRatio,
    payload.controls.minimumLotSize,
  ]) {
    assert.equal(control.value, null);
    assert.equal(control.present, false);
    assert.equal(control.clauseRef, null);
    assert.equal(control.lepSource, false);
    assert.equal(control.confidence, "Unavailable");
    assert.equal(control.interpretation, "Not found in retrieved LEP data");
  }
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

  seedSeeDppChain(prisma, "proj-3", quickSiteCheck, "Alterations and additions to a dwelling.");

  const { artefact, content } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-3", proposedWorksSummary: "Forged client summary ignored." },
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
  assert.equal(content.applicableControls.sourceExcerpts[0].heading, "Built form");
  assert.equal(content.proposedWorksSummary, "Alterations and additions to a dwelling.");
  assert.equal(content.sourceDetailedPlanningPack?.artefactId, "proj-3-dpp");
});

test("pre SEE clears legacy client controls that lack server LEP provenance", async () => {
  const prisma = new MockPrisma({ "proj-see-forged": ["user-1"] });
  const quickSiteCheck: QuickSiteCheckReport = {
    projectId: "proj-see-forged",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
    lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: "99m", present: true, source: "client", lepSource: false, clauseRef: "4.3", interpretation: "Forged client height.", confidence: "Cited" },
      floorSpaceRatio: { label: "Floor space ratio", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "Minimum lot size", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [],
    nextSteps: [],
    lepEvidenceSummary: citedEvidenceSummary,
  };
  seedSeeDppChain(prisma, "proj-see-forged", quickSiteCheck, "Persisted tourist accommodation alterations.");

  const { content: seeContent } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-see-forged" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      buildQuickSiteCheckReport: async () => quickSiteCheck,
      getDCPContext: async () => [],
      getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }),
    },
  });

  const savedHeight = seeContent.applicableControls.quickSiteControls.heightOfBuilding;
  assert.equal(savedHeight.value, null);
  assert.equal(savedHeight.present, false);
  assert.equal(savedHeight.lepSource, false);
  assert.equal(savedHeight.clauseRef, null);
  assert.equal(savedHeight.confidence, "Unavailable");
  const heightAssessment = seeContent.consistencyAssessment.find((item) => item.topic === "Height of building");
  assert.equal(heightAssessment?.assessment, "Not found in retrieved LEP data");
  assert.deepEqual(heightAssessment?.citations, []);
});

test("pre SEE cites clause 2.3 only with server-backed zone-table evidence", async () => {
  const prisma = new MockPrisma({ "proj-see-permissibility": ["user-1"] });
  const quickSiteCheck: QuickSiteCheckReport = {
    projectId: "proj-see-permissibility",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
    lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
    permissibility: {
      zoneLabel: "SP3 – Tourist",
      permittedWithoutConsent: [],
      permittedWithConsent: [],
      prohibited: [],
      interpretation: "No server-backed land-use rows were found.",
    },
    controls: {
      heightOfBuilding: { label: "Height", value: "9m", present: true, source: "lep", lepSource: true, clauseRef: "4.3", interpretation: "Height is 9m.", confidence: "Cited" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "No FSR." },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "No MLS." },
    },
    notes: [],
    nextSteps: [],
    lepEvidenceSummary: {
      label: "Cited",
      detail: "Numeric control only.",
      citedControlCount: 1,
      totalControlCount: 1,
      landUseEntryCount: 0,
      objectiveCount: 0,
      sourceRef: "Byron LEP 2014",
    },
  };
  seedSeeDppChain(prisma, "proj-see-permissibility", quickSiteCheck, "Persisted tourist accommodation alterations.");

  const { content: seeContent } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-see-permissibility" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      buildQuickSiteCheckReport: async () => quickSiteCheck,
      getDCPContext: async () => [],
      getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }),
    },
  });

  const permissibility = seeContent.consistencyAssessment.find((item) => item.topic === "Land use permissibility");
  assert.deepEqual(permissibility?.citations, []);
});

test("pre SEE key development standards use server-verified saved LEP values and citations", async () => {
  const prisma = new MockPrisma({ "proj-39": ["user-39"] });
  const quickSiteCheck: QuickSiteCheckReport = {
    projectId: "proj-39",
    generatedAt: new Date().toISOString(),
    site: { address: "1 Jonson St, Byron Bay NSW", lga: "Byron", zoneCode: "R2", zoneLabel: "R2 – Low Density Residential" },
    lepInstrument: { name: "Byron LEP 2014", code: "byron-lep-2014", lga: "Byron", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: null, present: false, interpretation: "No mapped height of building found yet. Check the LEP map layer or council GIS before progressing." },
      floorSpaceRatio: { label: "Floor space ratio", value: null, present: false, interpretation: "No mapped floor space ratio found yet. Check the LEP map layer or council GIS before progressing." },
      minimumLotSize: { label: "Minimum lot size", value: null, present: false, interpretation: "No mapped minimum lot size found yet. Check the LEP map layer or council GIS before progressing." },
    },
    notes: [],
    nextSteps: [],
  };

  Object.assign(quickSiteCheck.controls.heightOfBuilding, {
    value: "9 m",
    present: true,
    source: "lep",
    lepSource: true,
    clauseRef: "4.3",
    confidence: "Cited",
    interpretation: "Height appears to be 9 m.",
  });
  Object.assign(quickSiteCheck.controls.floorSpaceRatio, {
    value: "0.5:1",
    present: true,
    source: "lep",
    lepSource: true,
    clauseRef: "4.4",
    confidence: "Cited",
    interpretation: "Floor space ratio appears to be 0.5:1.",
  });
  Object.assign(quickSiteCheck.controls.minimumLotSize, {
    value: "600 m2",
    present: true,
    source: "lep",
    lepSource: true,
    clauseRef: "4.1",
    confidence: "Cited",
    interpretation: "Minimum lot size appears to be 600 m2.",
  });
  seedSeeDppChain(prisma, "proj-39", quickSiteCheck, "Dwelling alterations.");

  const { content } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-39", proposedWorksSummary: "Forged summary ignored." },
    userId: "user-39",
    deps: {
      prisma: prisma as any,
      buildQuickSiteCheckReport: async () => quickSiteCheck,
      getDCPContext: async () => [],
      getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }),
      getLepContextForProject: async () => ({
        lepContext: {
          lga: "Byron",
          instrumentName: "Byron LEP 2014",
          instrumentCode: "byron-lep-2014",
          clauses: [
            { ref: "4.3", title: "Height of buildings", text: "The maximum height of a building on the land is 9 m." },
            { ref: "4.4", title: "Floor space ratio", text: "The maximum floor space ratio for a building on the land is 0.5:1." },
            { ref: "4.1", title: "Minimum subdivision lot size", text: "The minimum lot size for this land is 600 m2." },
          ],
        },
        rawLga: "Byron",
        normalisedLga: "BYRON",
        instruments: [],
        chosenInstrumentId: "lep-1",
        lepClauseCount: 3,
        usedFallback: false,
      }),
      buildQuickSiteCheckLep: async () => ({ ok: false, message: "No LEP map API data" }),
    },
  });

  const height = content.consistencyAssessment.find((item) => item.topic === "Height of building");
  const fsr = content.consistencyAssessment.find((item) => item.topic === "Floor space ratio");
  const lotSize = content.consistencyAssessment.find((item) => item.topic === "Minimum lot size");

  assert.match(height?.assessment ?? "", /9 m/);
  assert.deepEqual(height?.citations, [{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }]);
  assert.match(fsr?.assessment ?? "", /0.5:1/);
  assert.deepEqual(fsr?.citations, [{ ref: "Byron LEP 2014 cl. 4.4", type: "LEP" }]);
  assert.match(lotSize?.assessment ?? "", /600 m2/);
  assert.deepEqual(lotSize?.citations, [{ ref: "Byron LEP 2014 cl. 4.1", type: "LEP" }]);
});

test("pre SEE key development standards sanitise unverified saved controls", async () => {
  const prisma = new MockPrisma({ "proj-40": ["user-40"] });
  const fallback = "No mapped height of building found yet. Check the LEP map layer or council GIS before progressing.";
  const quickSiteCheck: QuickSiteCheckReport = {
    projectId: "proj-40",
    generatedAt: new Date().toISOString(),
    site: { address: "1 Test St, Byron Bay NSW", lga: "Byron", zoneCode: "R2" },
    lepInstrument: { name: "Byron LEP 2014", code: "byron-lep-2014", lga: "Byron", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: null, present: false, interpretation: fallback },
      floorSpaceRatio: { label: "Floor space ratio", value: null, present: false, interpretation: "No mapped floor space ratio found yet. Check the LEP map layer or council GIS before progressing." },
      minimumLotSize: { label: "Minimum lot size", value: null, present: false, interpretation: "No mapped minimum lot size found yet. Check the LEP map layer or council GIS before progressing." },
    },
    notes: [],
    nextSteps: [],
  };

  seedSeeDppChain(prisma, "proj-40", quickSiteCheck, "Dwelling alterations.");

  const { content } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-40", proposedWorksSummary: "Forged summary ignored." },
    userId: "user-40",
    deps: {
      prisma: prisma as any,
      buildQuickSiteCheckReport: async () => quickSiteCheck,
      getDCPContext: async () => [],
      getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }),
      getLepContextForProject: async () => ({
        lepContext: { lga: "Byron", instrumentName: "Byron LEP 2014", instrumentCode: "byron-lep-2014", clauses: [{ ref: "4.3", title: "Height of buildings", text: "The maximum height is shown on the Height of Buildings Map." }] },
        rawLga: "Byron",
        normalisedLga: "BYRON",
        instruments: [],
        chosenInstrumentId: "lep-1",
        lepClauseCount: 1,
        usedFallback: false,
      }),
      buildQuickSiteCheckLep: async () => ({ ok: false, message: "No LEP map API data" }),
    },
  });

  const height = content.consistencyAssessment.find((item) => item.topic === "Height of building");
  assert.equal(height?.assessment, "Not found in retrieved LEP data");
  assert.deepEqual(height?.citations, []);
});


test("SEE Byron SP3 uses persisted DPP proposal, citations and provenance only", async () => {
  const prisma = new MockPrisma({ "proj-see-byron": ["user-1"] });
  const qsc: QuickSiteCheckReport = {
    projectId: "proj-see-byron",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 – Tourist" },
    lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: "9m", present: true, source: "lep", lepSource: true, clauseRef: "4.3", interpretation: "Height is 9m.", confidence: "Cited" },
      floorSpaceRatio: { label: "Floor space ratio", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "Minimum lot size", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [],
    nextSteps: [],
    lepEvidenceSummary: citedEvidenceSummary,
  };
  seedSeeDppChain(prisma, "proj-see-byron", qsc, "Persisted SP3 tourist accommodation alterations.");
  const dpp = prisma.artefacts.find((artefact) => artefact.id === "proj-see-byron-dpp");
  dpp.payload.dcpEvidence[0].citations = [
    { ref: "Byron DCP 2014 SP3", title: "SP3 tourist controls", headingPath: ["Chapter E", "SP3 Tourist"], excerpt: "Tourist accommodation in SP3 must address coastal character.", score: 20 },
  ];
  dpp.payload.topicMatrix[0].sourceRefs = ["Byron DCP 2014 SP3"];

  const { content } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-see-byron", proposedWorksSummary: "FORGED", site: { address: "Fake" }, citations: ["Fake"] },
    userId: "user-1",
    deps: { prisma: prisma as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) },
  });

  assert.equal(content.proposedWorksSummary, "Persisted SP3 tourist accommodation alterations.");
  assert.equal(content.applicableControls.dcpClauses[0].ref, "Byron DCP 2014 SP3");
  assert.equal(content.applicableControls.dcpClauses.some((clause) => /residential|rural/i.test(`${clause.title} ${clause.bodyText}`)), false);
  assert.equal(content.sourceDetailedPlanningPack?.artefactId, "proj-see-byron-dpp");
  assert.equal(content.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId, "proj-see-byron-qsc");
  assert.deepEqual(content.consistencyAssessment.find((item) => item.topic === "Height of building")?.citations, [{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }]);
});

test("SEE Kempsey E2 retains Part D nil evidence from persisted DPP", async () => {
  const prisma = new MockPrisma({ "proj-see-kempsey": ["user-1"] });
  const qsc: QuickSiteCheckReport = {
    projectId: "proj-see-kempsey",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneName: "Commercial Centre", zoneLabel: "E2 – Commercial Centre" },
    lepInstrument: { name: "Kempsey LEP 2013", code: "KEMPSEY_LEP_2013", lga: "KEMPSEY", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height of building", value: "0m", present: true, source: "lep", lepSource: true, clauseRef: "4.3", interpretation: "Nil/0m mapped control retained.", confidence: "Cited" },
      floorSpaceRatio: { label: "Floor space ratio", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "Minimum lot size", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [],
    nextSteps: [],
    lepEvidenceSummary: { ...citedEvidenceSummary, sourceRef: "Kempsey LEP 2013 Zone E2" },
  };
  seedSeeDppChain(prisma, "proj-see-kempsey", qsc, "Persisted E2 shopfront fitout.");
  const dpp = prisma.artefacts.find((artefact) => artefact.id === "proj-see-kempsey-dpp");
  dpp.payload.dcpEvidence[0].citations = [
    { ref: "Kempsey DCP 2013 Part D D4", title: "Part D4 Commercial Centres", headingPath: ["Part D", "D4 Commercial Centres"], excerpt: "Commercial centre controls include nil setback where active frontage is retained.", score: 18 },
  ];
  dpp.payload.topicMatrix[0].sourceRefs = ["Kempsey DCP 2013 Part D D4"];

  const { content } = await createPreSeePlanningMemoArtefact({
    body: { projectId: "proj-see-kempsey", proposedWorksSummary: "FORGED RESIDENTIAL" },
    userId: "user-1",
    deps: { prisma: prisma as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "KEMPSEY", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) },
  });

  assert.equal(content.proposedWorksSummary, "Persisted E2 shopfront fitout.");
  assert.match(content.applicableControls.dcpClauses[0].ref ?? "", /Part D D4/);
  assert.match(content.applicableControls.dcpClauses[0].bodyText, /nil setback/i);
  assert.equal(content.applicableControls.dcpClauses.some((clause) => /rural|residential/i.test(`${clause.title} ${clause.bodyText}`)), false);
});

test("SEE skips newer stale DPP for older current quality pack and stale-only rejects without persistence", async () => {
  const prisma = new MockPrisma({ "proj-see-stale": ["user-1"] });
  const qsc: QuickSiteCheckReport = {
    projectId: "proj-see-stale",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
    lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: "9m", present: true, interpretation: "Height.", confidence: "Cited" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [], nextSteps: [], lepEvidenceSummary: citedEvidenceSummary,
  };
  seedSeeDppChain(prisma, "proj-see-stale", qsc, "Older current pack brief.");
  const currentPack = prisma.artefacts.find((artefact) => artefact.id === "proj-see-stale-dpp");
  currentPack.payload.generatedAt = "2026-07-14T00:00:00.000Z";
  prisma.artefacts.push({ ...currentPack, id: "newer-stale-dpp", capturedAt: new Date("2026-07-15T00:00:00.000Z"), createdAt: new Date("2026-07-15T00:00:00.000Z"), payload: { ...currentPack.payload, generatedAt: "2026-07-15T00:00:00.000Z", site: { ...currentPack.payload.site, address: "1 Fake Street, Sydney NSW", lga: "Sydney", lgaCode: "SYDNEY" }, proposalBrief: "Stale forged pack." } });

  const { content } = await createPreSeePlanningMemoArtefact({ body: { projectId: "proj-see-stale" }, userId: "user-1", deps: { prisma: prisma as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) } });
  assert.equal(content.proposedWorksSummary, "Older current pack brief.");

  const staleOnly = new MockPrisma({ "proj-stale-only": ["user-1"] });
  seedSeeDppChain(staleOnly, "proj-stale-only", { ...qsc, projectId: "proj-stale-only" }, "Stale-only brief.");
  const stalePack = staleOnly.artefacts.find((artefact) => artefact.id === "proj-stale-only-dpp");
  stalePack.payload.site.address = "1 Fake Street, Sydney NSW";
  await assert.rejects(() => createPreSeePlanningMemoArtefact({ body: { projectId: "proj-stale-only" }, userId: "user-1", deps: { prisma: staleOnly as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) } }), ArtefactValidationError);
  assert.equal(staleOnly.artefacts.some((artefact) => artefact.type === "pre_see_planning_memo"), false);
});

test("SEE binds to explicit source DPP and expected proposal without falling back", async () => {
  const prisma = new MockPrisma({ "proj-see-bound": ["user-1"] });
  const qsc: QuickSiteCheckReport = {
    projectId: "proj-see-bound",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
    lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: "9m", present: true, interpretation: "Height.", confidence: "Cited" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [], nextSteps: [], lepEvidenceSummary: citedEvidenceSummary,
  };
  seedSeeDppChain(prisma, "proj-see-bound", qsc, "Older exact brief.");
  const selectedPack = prisma.artefacts.find((artefact) => artefact.id === "proj-see-bound-dpp");
  selectedPack.payload.generatedAt = "2026-07-15T00:10:00.000Z";
  selectedPack.capturedAt = new Date("2026-07-15T00:10:00.000Z");
  prisma.artefacts.push({
    ...selectedPack,
    id: "proj-see-bound-newer-dpp",
    capturedAt: new Date("2026-07-15T00:30:00.000Z"),
    createdAt: new Date("2026-07-15T00:30:00.000Z"),
    payload: { ...selectedPack.payload, generatedAt: "2026-07-15T00:30:00.000Z", proposalBrief: "Newer different brief." },
  });

  const deps = { prisma: prisma as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) };
  const { content } = await createPreSeePlanningMemoArtefact({ body: { projectId: "proj-see-bound", sourceDetailedPlanningPackArtefactId: "proj-see-bound-newer-dpp", expectedProposalBrief: " Newer   different brief. " }, userId: "user-1", deps });
  assert.equal(content.sourceDetailedPlanningPack?.artefactId, "proj-see-bound-newer-dpp");
  assert.equal(content.proposedWorksSummary, "Newer different brief.");

  await assert.rejects(
    () => createPreSeePlanningMemoArtefact({ body: { projectId: "proj-see-bound", sourceDetailedPlanningPackArtefactId: "proj-see-bound-newer-dpp", expectedProposalBrief: "Older exact brief." }, userId: "user-1", deps }),
    /different proposed-works brief/,
  );
  assert.equal(prisma.artefacts.filter((artefact) => artefact.type === "pre_see_planning_memo").length, 1);
});

test("unresolved DPP blocks SEE and persists no memo", async () => {
  const prisma = new MockPrisma({ "proj-see-unresolved": ["user-1"] });
  const qsc: QuickSiteCheckReport = {
    projectId: "proj-see-unresolved",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
    lepInstrument: null,
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "No height.", confidence: "Unavailable" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [], nextSteps: [], lepEvidenceSummary: citedEvidenceSummary,
  };
  seedSeeDppChain(prisma, "proj-see-unresolved", qsc, "Unresolved brief.");
  const dpp = prisma.artefacts.find((artefact) => artefact.id === "proj-see-unresolved-dpp");
  dpp.payload.commercialReady = false;
  dpp.payload.unresolvedTopics = ["Parking: unresolved."];

  await assert.rejects(() => createPreSeePlanningMemoArtefact({ body: { projectId: "proj-see-unresolved" }, userId: "user-1", deps: { prisma: prisma as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) } }), ArtefactValidationError);
  assert.equal(prisma.artefacts.some((artefact) => artefact.type === "pre_see_planning_memo"), false);
});

test("SEE rejects newer unresolved active DPP instead of falling back to older ready pack", async () => {
  const prisma = new MockPrisma({ "proj-see-active-unresolved": ["user-1"] });
  const qsc: QuickSiteCheckReport = {
    projectId: "proj-see-active-unresolved",
    generatedAt: "2026-07-15T00:00:00.000Z",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
    lepInstrument: { name: "Byron LEP 2014", code: "BYRON_LEP_2014", lga: "BYRON", source: "ingestion" },
    permissibility: null,
    controls: {
      heightOfBuilding: { label: "Height", value: "9m", present: true, interpretation: "Height.", confidence: "Cited" },
      floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "No FSR.", confidence: "Unavailable" },
      minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "No MLS.", confidence: "Unavailable" },
    },
    notes: [], nextSteps: [], lepEvidenceSummary: citedEvidenceSummary,
  };
  seedSeeDppChain(prisma, "proj-see-active-unresolved", qsc, "Older ready brief.");
  const olderReady = prisma.artefacts.find((artefact) => artefact.id === "proj-see-active-unresolved-dpp");
  olderReady.payload.generatedAt = "2026-07-15T00:10:00.000Z";
  olderReady.capturedAt = new Date("2026-07-15T00:10:00.000Z");
  prisma.artefacts.push({
    ...olderReady,
    id: "proj-see-active-unresolved-newer-dpp",
    capturedAt: new Date("2026-07-15T00:30:00.000Z"),
    createdAt: new Date("2026-07-15T00:30:00.000Z"),
    payload: {
      ...olderReady.payload,
      generatedAt: "2026-07-15T00:30:00.000Z",
      proposalBrief: "Newer unresolved brief.",
      commercialReady: false,
      unresolvedTopics: ["Parking: unresolved."],
    },
  });

  await assert.rejects(() => createPreSeePlanningMemoArtefact({ body: { projectId: "proj-see-active-unresolved" }, userId: "user-1", deps: { prisma: prisma as any, buildQuickSiteCheckReport: async () => qsc, getDCPContext: async () => [], getWorkspaceSourceContext: async () => ({ canonicalLgaCode: "BYRON", hasCouncilDcp: false, councilDcpSampleHeadings: [], perSourceTotals: {}, chunks: [] }) } }), ArtefactValidationError);
  assert.equal(prisma.artefacts.some((artefact) => artefact.type === "pre_see_planning_memo"), false);
});

test("creates a Detailed Planning Pack from server-side saved QSC and filtered DCP evidence", async () => {
  const prisma = new MockPrisma({ "proj-pack": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-1",
    projectId: "proj-pack",
    type: "quick_site_check",
    title: "Quick Site Check — 52 Belgrave St",
    capturedAt: new Date("2026-07-15T00:00:00Z"),
    createdAt: new Date("2026-07-15T00:00:00Z"),
    payload: {
      projectId: "proj-pack",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneName: "Commercial Centre", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  const { artefact, content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-pack", proposalBrief: "Commercial shopfront fitout with nil front setback retained" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      buildQuickSiteCheckReport: async () => { throw new Error("must use saved QSC"); },
      getWorkspaceSourceContext: async () => ({ chunks: [], summary: "" }) as any,
      getDCPContext: async () => ([{
        id: "dcp-1",
        lgaCode: "KEMPSEY",
        sourceDocId: "KEMPSEY_DCP_2026",
        ref: "D4.1",
        title: "D4 BUSINESS AND COMMERCIAL DEVELOPMENT",
        headingPath: ["Part D", "D4 BUSINESS AND COMMERCIAL DEVELOPMENT"],
        bodyText: "E2 Commercial Centre controls include nil/0m front setback where the existing street alignment is retained.",
        depth: 2,
        topicTags: ["parking"],
        numericMeta: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        score: 42,
      }]),
    } as any,
  });

  assert.equal(artefact.type, "detailed_planning_pack");
  assert.equal(content.site.address, "52 Belgrave St, Kempsey NSW 2440");
  assert.equal(content.sourceQuickSiteCheck.artefactId, "qsc-1");
  assert.ok(content.dcpEvidence.some((topic) => topic.status === "Cited"));
  assert.match(content.dcpEvidence.flatMap((topic) => topic.citations).map((citation) => citation.excerpt).join("\n"), /nil\/0m/);
});


test("Detailed Planning Pack leaves vague parking/access body unavailable despite topic and zone text", async () => {
  const prisma = new MockPrisma({ "proj-vague-parking": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-vague-parking",
    projectId: "proj-vague-parking",
    type: "quick_site_check",
    title: "Quick Site Check — 52 Belgrave St",
    payload: {
      projectId: "proj-vague-parking",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  const { content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-vague-parking", proposalBrief: "Commercial shopfront with parking and loading access" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      getDCPContext: async () => ([{
        id: "vague-parking",
        lgaCode: "KEMPSEY",
        sourceDocId: "KEMPSEY_DCP_2026",
        ref: "Part B Parking",
        title: "E2 parking, driveway access, loading and service access",
        headingPath: ["Kempsey DCP 2026", "Part B", "Parking and access"],
        bodyText: "Parking, driveway access, loading and service access controls apply where relevant.",
        depth: 2,
        topicTags: ["parking_access"],
        numericMeta: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        score: 80,
      }]),
    } as any,
  });

  const parking = content.dcpEvidence.find((topic) => topic.topicId === "parking_access");
  assert.equal(parking?.status, "Unavailable");
  assert.deepEqual(parking?.citations, []);
  assert.equal(content.commercialReady, false);
});

test("Detailed Planning Pack requires substantive body text rather than title heading or ref-only topic proof", async () => {
  const prisma = new MockPrisma({ "proj-ref-only": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-ref-only",
    projectId: "proj-ref-only",
    type: "quick_site_check",
    title: "Quick Site Check — 52 Belgrave St",
    payload: {
      projectId: "proj-ref-only",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  const { content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-ref-only", proposalBrief: "Commercial fitout with parking" },
    userId: "user-1",
    deps: { prisma: prisma as any, getDCPContext: async () => ([{
      id: "ref-only",
      lgaCode: "KEMPSEY",
      sourceDocId: "KEMPSEY_DCP_2026",
      ref: "D4 parking 1 space per 40m2",
      title: "Parking requirement 1 space per 40m2",
      headingPath: ["Parking and access", "1 space per 40m2"],
      bodyText: "This section provides an overview of parking controls.",
      depth: 2,
      topicTags: ["parking_access"],
      numericMeta: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      score: 90,
    }]) } as any,
  });

  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Unavailable");
});

test("Detailed Planning Pack qualifies quantitative parking requirement for parking/access only", async () => {
  const prisma = new MockPrisma({ "proj-quant-parking": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-quant-parking", projectId: "proj-quant-parking", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-quant-parking", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-quant-parking", proposalBrief: "Commercial parking" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "quant", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.5", title: "Parking and access", headingPath: ["Part D", "Parking"], bodyText: "Provide 1 parking space per 40m2 of gross floor area for commercial premises.", depth: 2, topicTags: ["parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  const parkingCitation = content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.citations[0];
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.equal(parkingCitation?.excerpt, "Provide 1 parking space per 40m2 of gross floor area for commercial premises.");
  assert.ok(content.dcpEvidence.filter((topic) => topic.topicId !== "parking_access").every((topic) => topic.status === "Unavailable"));
});

test("Detailed Planning Pack qualifies qualitative active-frontage requirement for built-form topic only", async () => {
  const prisma = new MockPrisma({ "proj-qual-frontage": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-qual-frontage", projectId: "proj-qual-frontage", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-qual-frontage", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-qual-frontage", proposalBrief: "Active frontage shopfront" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "frontage", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.6", title: "Built form and active frontage", headingPath: ["Part D", "Active frontage"], bodyText: "Active street frontage must be retained and shopfront glazing is to address the public street.", depth: 2, topicTags: ["built_form_active_frontage"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "built_form_active_frontage")?.status, "Cited");
  assert.ok(content.dcpEvidence.filter((topic) => topic.topicId !== "built_form_active_frontage").every((topic) => topic.status === "Unavailable"));
});



test("Detailed Planning Pack accepts checked-in Byron should-style parking/access control", async () => {
  const prisma = new MockPrisma({ "proj-byron-should": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-byron-should", projectId: "proj-byron-should", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-byron-should", generatedAt: "2026-07-15T00:00:00Z", site: { address: "45 Broken Head Road", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed SP3 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 2, sourceRef: "Byron LEP 2014 — Zone SP3" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-byron-should", proposalBrief: "Tourist accommodation access" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async (_lgaCode: string, query: string) => (/parking access/i.test(query) ? [{ id: "byron-should", lgaCode: "BYRON", sourceDocId: "BYRON_DCP_2014", ref: "B4.1.4", title: "B4.1.4 Transport hierarchy", headingPath: ["Chapter B4 Traffic, Parking and Access", "B4.1.4 Transport hierarchy"], bodyText: "Site planning should prioritise walking and cycling before private vehicles, with bicycle parking provided near entrances and street frontage.", depth: 4, topicTags: ["parking"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }] : []) } as any });
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.ok(content.dcpEvidence.filter((topic) => topic.topicId !== "parking_access").every((topic) => topic.status === "Unavailable"));
});

test("Detailed Planning Pack accepts checked-in Byron headroom body where cars/spaces carry the parking topic", async () => {
  const prisma = new MockPrisma({ "proj-byron-headroom": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-byron-headroom", projectId: "proj-byron-headroom", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-byron-headroom", generatedAt: "2026-07-15T00:00:00Z", site: { address: "45 Broken Head Road", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed SP3 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 2, sourceRef: "Byron LEP 2014 — Zone SP3" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-byron-headroom", proposalBrief: "Tourist accommodation parking layout" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async (_lgaCode: string, query: string) => (/parking access/i.test(query) ? [{ id: "byron-headroom", lgaCode: "BYRON", sourceDocId: "BYRON_DCP_2014", ref: "B4.4.2", title: "B4.4.2 Headroom", headingPath: ["Chapter B4 Traffic, Parking and Access", "B4.4 Parking layout and design", "B4.4.2 Headroom"], bodyText: "Minimum clear headroom is 2.2 m for cars, 2.4 m for accessible spaces and 3.5 m where small rigid vehicles are permitted.", depth: 4, topicTags: ["parking"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }] : []) } as any });
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.ok(content.dcpEvidence.filter((topic) => topic.topicId !== "parking_access").every((topic) => topic.status === "Unavailable"));
});

test("Detailed Planning Pack qualifies mixed objective plus numeric control for intended topic", async () => {
  const prisma = new MockPrisma({ "proj-mixed-control": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-mixed-control", projectId: "proj-mixed-control", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-mixed-control", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-mixed-control", proposalBrief: "Commercial parking" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "mixed", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.7", title: "Parking and access", headingPath: ["Part D", "Parking"], bodyText: "Objectives: To ensure parking supports commercial centre access. Controls: Development must provide 1 parking space per 40m2 of gross floor area.", depth: 2, topicTags: ["parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.ok(content.dcpEvidence.filter((topic) => topic.topicId !== "parking_access").every((topic) => topic.status === "Unavailable"));
});


test("Detailed Planning Pack does not cross-promote active-frontage objective with parking-only control", async () => {
  const prisma = new MockPrisma({ "proj-cross-promote": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-cross-promote", projectId: "proj-cross-promote", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-cross-promote", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-cross-promote", proposalBrief: "Commercial active frontage and parking" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "cross-promote", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.10", title: "Built form, active frontage and parking", headingPath: ["Part D", "Commercial centres"], bodyText: "Objectives: To encourage active street frontage. Controls: Car parking must provide 2 spaces per dwelling.", depth: 2, topicTags: ["built_form_active_frontage", "parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  const parkingCitation = content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.citations[0];
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.equal(parkingCitation?.excerpt, "Controls: Car parking must provide 2 spaces per dwelling.");
  assert.equal(parkingCitation?.excerpt.includes("active street frontage"), false);
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "built_form_active_frontage")?.status, "Unavailable");
  assert.ok(content.dcpEvidence.filter((topic) => !["parking_access", "built_form_active_frontage"].includes(topic.topicId)).every((topic) => topic.status === "Unavailable"));
  assert.equal(content.commercialReady, false);
});

test("Detailed Planning Pack keeps newline-separated objective rows from borrowing parking controls", async () => {
  const prisma = new MockPrisma({ "proj-newline-cross-promote": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-newline-cross-promote", projectId: "proj-newline-cross-promote", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-newline-cross-promote", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-newline-cross-promote", proposalBrief: "Commercial active frontage and parking" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "newline-cross-promote", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.11", title: "Built form, active frontage and parking", headingPath: ["Part D", "Commercial centres"], bodyText: "Objectives: To encourage active street frontage\nControls: Car parking must provide 2 spaces per dwelling.", depth: 2, topicTags: ["built_form_active_frontage", "parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  const parkingCitation = content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.citations[0];
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.equal(parkingCitation?.excerpt, "Controls: Car parking must provide 2 spaces per dwelling.");
  assert.equal(parkingCitation?.excerpt.includes("active street frontage"), false);
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "built_form_active_frontage")?.status, "Unavailable");
  assert.ok(content.dcpEvidence.filter((topic) => !["parking_access", "built_form_active_frontage"].includes(topic.topicId)).every((topic) => topic.status === "Unavailable"));
  assert.equal(content.commercialReady, false);
});

test("Detailed Planning Pack rejects standalone objective-section rows even with prescriptive wording", async () => {
  const prisma = new MockPrisma({ "proj-standalone-objective": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-standalone-objective", projectId: "proj-standalone-objective", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-standalone-objective", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-standalone-objective", proposalBrief: "Commercial active frontage and parking" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "standalone-objective", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.13", title: "Built form, active frontage and parking", headingPath: ["Part D", "Commercial centres"], bodyText: "Objectives:\nActive street frontage should address the public domain.\nControls:\nCar parking must provide 2 spaces per dwelling.", depth: 2, topicTags: ["built_form_active_frontage", "parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  const parkingCitation = content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.citations[0];
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "built_form_active_frontage")?.status, "Unavailable");
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.equal(parkingCitation?.excerpt, "Controls: Car parking must provide 2 spaces per dwelling.");
  assert.equal(parkingCitation?.excerpt.includes("Active street frontage"), false);
});

test("Detailed Planning Pack preserves multiple same-topic rows in source order and deduplicates", async () => {
  const prisma = new MockPrisma({ "proj-multi-row": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-multi-row", projectId: "proj-multi-row", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-multi-row", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-multi-row", proposalBrief: "Commercial parking and landscaping" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "multi", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.12", title: "Parking and access", headingPath: ["Part D", "Parking"], bodyText: "Controls:\nCar parking must provide 2 spaces per dwelling.\nLandscape planting must include canopy trees.\nCar parking must provide 2 spaces per dwelling.\nVehicle access must be designed to avoid reversing onto the street.", depth: 2, topicTags: ["parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  const excerpt = content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.citations[0]?.excerpt;
  assert.equal(excerpt, "Controls: Car parking must provide 2 spaces per dwelling. Controls: Vehicle access must be designed to avoid reversing onto the street.");
});

test("Detailed Planning Pack rejects objective-only provide/ensure body as non-substantive", async () => {
  const prisma = new MockPrisma({ "proj-objective-only": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-objective-only", projectId: "proj-objective-only", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-objective-only", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-objective-only", proposalBrief: "Active frontage shopfront" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "objective-only", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.8", title: "Built form and active frontage", headingPath: ["Part D", "Active frontage"], bodyText: "Objectives: To ensure active street frontages and to provide attractive shopfronts in commercial centres.", depth: 2, topicTags: ["built_form_active_frontage"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "built_form_active_frontage")?.status, "Unavailable");
  assert.equal(content.commercialReady, false);
});

test("Detailed Planning Pack accepts substantive requirement that includes where relevant", async () => {
  const prisma = new MockPrisma({ "proj-where-relevant": ["user-1"] });
  prisma.artefacts.push({ id: "qsc-where-relevant", projectId: "proj-where-relevant", type: "quick_site_check", title: "Quick Site Check", payload: { projectId: "proj-where-relevant", generatedAt: "2026-07-15T00:00:00Z", site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" }, lepInstrument: null, permissibility: null, controls: { heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" }, floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" }, minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" } }, notes: [], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" } } satisfies QuickSiteCheckReport });
  const { content } = await createDetailedPlanningPackArtefact({ body: { projectId: "proj-where-relevant", proposalBrief: "Commercial service access" }, userId: "user-1", deps: { prisma: prisma as any, getDCPContext: async () => ([{ id: "where-relevant", lgaCode: "KEMPSEY", sourceDocId: "KEMPSEY_DCP_2026", ref: "D4.9", title: "Parking and access", headingPath: ["Part D", "Parking and access"], bodyText: "Vehicle access must be designed to maintain safe loading and service access where relevant to the proposed commercial use.", depth: 2, topicTags: ["parking_access"], numericMeta: null, createdAt: new Date(), updatedAt: new Date(), score: 100 }]) } as any });
  assert.equal(content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status, "Cited");
  assert.ok(content.dcpEvidence.filter((topic) => topic.topicId !== "parking_access").every((topic) => topic.status === "Unavailable"));
});

test("rejects Detailed Planning Pack generation without cited saved QSC evidence", async () => {
  const prisma = new MockPrisma({ "proj-weak": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-weak",
    projectId: "proj-weak",
    type: "quick_site_check",
    title: "Quick Site Check — forged",
    payload: {
      projectId: "proj-weak",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "Fake", lga: "Byron", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Unavailable", detail: "No DB evidence", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 0, objectiveCount: 0, sourceRef: "Unavailable" },
    } satisfies QuickSiteCheckReport,
  });

  await assert.rejects(
    () => createDetailedPlanningPackArtefact({
      body: { projectId: "proj-weak", proposalBrief: "Forged client says cite everything" },
      userId: "user-1",
      deps: { prisma: prisma as any, getDCPContext: async () => [] } as any,
    }),
    (error) => error instanceof ArtefactValidationError && /quality-valid Quick Site Check/.test(error.message),
  );
});

test("Detailed Planning Pack Byron SP3 keeps general/SP3 DCP evidence and excludes residential/rural rows", async () => {
  const prisma = new MockPrisma({ "proj-byron-pack": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-byron",
    projectId: "proj-byron-pack",
    type: "quick_site_check",
    title: "Quick Site Check — 45 Broken Head Road",
    capturedAt: new Date("2026-07-15T00:00:00Z"),
    createdAt: new Date("2026-07-15T00:00:00Z"),
    payload: {
      projectId: "proj-byron-pack",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 – Tourist" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed SP3 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 2, sourceRef: "Byron LEP 2014 — Zone SP3" },
    } satisfies QuickSiteCheckReport,
  });

  const { content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-byron-pack", proposalBrief: "Tourist accommodation alterations near the existing access" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      getDCPContext: async () => ([
        {
          id: "byron-good",
          lgaCode: "BYRON",
          sourceDocId: "BYRON_DCP_2014",
          ref: "B4.2",
          title: "SP3 Tourist accommodation precinct controls",
          headingPath: ["Part B", "SP3 Tourist accommodation"],
          bodyText: "Setbacks and access are to respond to the tourist precinct and street context.",
          depth: 2,
          topicTags: ["setbacks"],
          numericMeta: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 50,
        },
        {
          id: "byron-bad-residential",
          lgaCode: "BYRON",
          sourceDocId: "BYRON_DCP_2014",
          ref: "D1.1",
          title: "Residential D1 Dual occupancy setbacks",
          headingPath: ["Chapter D1", "Residential zones"],
          bodyText: "Residential zone side setbacks for dual occupancy dwellings.",
          depth: 2,
          topicTags: ["setbacks"],
          numericMeta: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 99,
        },
      ]),
    } as any,
  });

  const excerpts = content.dcpEvidence.flatMap((topic) => topic.citations).map((citation) => `${citation.ref} ${citation.title} ${citation.excerpt}`).join("\n");
  assert.match(excerpts, /B4\.2/);
  assert.doesNotMatch(excerpts, /D1\.1|Dual occupancy|Residential zone/);
});

test("Detailed Planning Pack Kempsey E2 keeps D4 nil evidence and excludes rural or residential rows", async () => {
  const prisma = new MockPrisma({ "proj-kempsey-mixed": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-kempsey-mixed",
    projectId: "proj-kempsey-mixed",
    type: "quick_site_check",
    title: "Quick Site Check — 52 Belgrave St",
    capturedAt: new Date("2026-07-15T00:00:00Z"),
    createdAt: new Date("2026-07-15T00:00:00Z"),
    payload: {
      projectId: "proj-kempsey-mixed",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneName: "Commercial Centre", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  const { content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-kempsey-mixed", proposalBrief: "Commercial centre shopfront upgrade retaining nil front setback" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      getDCPContext: async () => ([
        {
          id: "kempsey-good",
          lgaCode: "KEMPSEY",
          sourceDocId: "KEMPSEY_DCP_2026",
          ref: "D4.3",
          title: "D4 BUSINESS AND COMMERCIAL DEVELOPMENT",
          headingPath: ["Part D", "D4 BUSINESS AND COMMERCIAL DEVELOPMENT"],
          bodyText: "In the E2 Commercial Centre, the front setback may be nil/0m where consistent with the street alignment.",
          depth: 2,
          topicTags: ["setbacks"],
          numericMeta: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 60,
        },
        {
          id: "kempsey-bad-rural",
          lgaCode: "KEMPSEY",
          sourceDocId: "KEMPSEY_DCP_2026",
          ref: "C2.1",
          title: "Rural zone dwelling setbacks",
          headingPath: ["Part C", "Rural zones"],
          bodyText: "Rural land setbacks for dwelling houses.",
          depth: 2,
          topicTags: ["setbacks"],
          numericMeta: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 100,
        },
      ]),
    } as any,
  });

  const excerpts = content.dcpEvidence.flatMap((topic) => topic.citations).map((citation) => `${citation.ref} ${citation.title} ${citation.excerpt}`).join("\n");
  assert.match(excerpts, /D4\.3/);
  assert.match(excerpts, /nil\/0m/);
  assert.doesNotMatch(excerpts, /C2\.1|Rural land|dwelling houses/);
});

test("Detailed Planning Pack persists unresolved topics when no applicable DCP evidence is found", async () => {
  const prisma = new MockPrisma({ "proj-no-dcp": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-no-dcp",
    projectId: "proj-no-dcp",
    type: "quick_site_check",
    title: "Quick Site Check — 45 Broken Head Road",
    payload: {
      projectId: "proj-no-dcp",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "45 Broken Head Road", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed SP3 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 2, objectiveCount: 2, sourceRef: "Byron LEP 2014 — Zone SP3" },
    } satisfies QuickSiteCheckReport,
  });

  const { content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-no-dcp", proposalBrief: "Tourist accommodation concept" },
    userId: "user-1",
    deps: { prisma: prisma as any, getDCPContext: async () => [] } as any,
  });

  assert.equal(content.commercialReady, false);
  assert.ok(content.unresolvedTopics.length > 0);
  assert.ok(content.topicMatrix.every((topic) => topic.status === "Unavailable"));
});

test("Detailed Planning Pack rejects unsupported LGAs for the pilot", async () => {
  const prisma = new MockPrisma({ "proj-unsupported": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-unsupported",
    projectId: "proj-unsupported",
    type: "quick_site_check",
    title: "Quick Site Check — Sydney",
    payload: {
      projectId: "proj-unsupported",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "1 George St", lga: "Sydney", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 2, objectiveCount: 2, sourceRef: "Sydney LEP — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  await assert.rejects(
    () => createDetailedPlanningPackArtefact({
      body: { projectId: "proj-unsupported", proposalBrief: "Commercial fitout" },
      userId: "user-1",
      deps: { prisma: prisma as any, getDCPContext: async () => [] } as any,
    }),
    (error) => error instanceof ArtefactValidationError && /Byron and Kempsey/.test(error.message),
  );
});

test("Detailed Planning Pack ignores forged client site and readiness fields", async () => {
  const prisma = new MockPrisma({ "proj-forged-pack": ["user-1"] });
  prisma.artefacts.push({
    id: "qsc-server-truth",
    projectId: "proj-forged-pack",
    type: "quick_site_check",
    title: "Quick Site Check — 52 Belgrave St",
    payload: {
      projectId: "proj-forged-pack",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  const { content } = await createDetailedPlanningPackArtefact({
    body: {
      projectId: "proj-forged-pack",
      proposalBrief: "Commercial fitout",
      site: { address: "Forged Byron address", lga: "Byron", zoneCode: "SP3" },
      commercialReady: true,
      dcpEvidence: [{ status: "Cited", citations: [{ ref: "FAKE" }] }],
    },
    userId: "user-1",
    deps: { prisma: prisma as any, getDCPContext: async () => [] } as any,
  });

  assert.equal(content.site.address, "52 Belgrave St, Kempsey NSW 2440");
  assert.equal(content.site.lga, "Kempsey Shire");
  assert.equal(content.site.zoneCode, "E2");
  assert.equal(content.commercialReady, false);
  assert.ok(content.dcpEvidence.every((topic) => !topic.citations.some((citation) => citation.ref === "FAKE")));
});

test("Detailed Planning Pack skips a newer stale QSC and uses an older current-site cited QSC", async () => {
  const currentSite = {
    zoningCode: "SP3",
    zoningName: "Tourist",
    zone: "SP3 – Tourist",
    siteContext: {
      id: "site-current-byron",
      projectId: "proj-current-qsc",
      addressInput: "45 Broken Head Road, Byron Bay NSW 2481",
      formattedAddress: "45 Broken Head Road, Byron Bay NSW 2481",
      lgaName: "Byron Shire",
      lgaCode: "BYRON",
      parcelId: null,
      lot: null,
      planNumber: null,
      latitude: null,
      longitude: null,
      zone: "SP3 – Tourist",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
  const prisma = new MockPrisma({ "proj-current-qsc": ["user-1"] }, { "proj-current-qsc": currentSite });
  prisma.artefacts.push({
    id: "qsc-newer-stale",
    projectId: "proj-current-qsc",
    type: "quick_site_check",
    title: "Quick Site Check — stale Kempsey",
    capturedAt: new Date("2026-07-16T00:00:00Z"),
    createdAt: new Date("2026-07-16T00:00:00Z"),
    payload: {
      projectId: "proj-current-qsc",
      generatedAt: "2026-07-16T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });
  prisma.artefacts.push({
    id: "qsc-older-current",
    projectId: "proj-current-qsc",
    type: "quick_site_check",
    title: "Quick Site Check — current Byron",
    capturedAt: new Date("2026-07-15T00:00:00Z"),
    createdAt: new Date("2026-07-15T00:00:00Z"),
    payload: {
      projectId: "proj-current-qsc",
      generatedAt: "2026-07-15T00:00:00Z",
      site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneLabel: "SP3 – Tourist" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed SP3 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 2, sourceRef: "Byron LEP 2014 — Zone SP3" },
    } satisfies QuickSiteCheckReport,
  });

  const seenLgas: string[] = [];
  const { content } = await createDetailedPlanningPackArtefact({
    body: { projectId: "proj-current-qsc", proposalBrief: "Tourist accommodation alterations" },
    userId: "user-1",
    deps: {
      prisma: prisma as any,
      getDCPContext: async (lgaCode: string) => {
        seenLgas.push(lgaCode);
        return [];
      },
    } as any,
  });

  assert.equal(content.site.address, "45 Broken Head Road, Byron Bay NSW 2481");
  assert.equal(content.sourceQuickSiteCheck.artefactId, "qsc-older-current");
  assert.ok(seenLgas.every((lga) => lga === "BYRON"));
});

test("Detailed Planning Pack rejects when only stale mismatched QSC evidence exists", async () => {
  const currentSite = {
    zoningCode: "SP3",
    zoningName: "Tourist",
    zone: "SP3 – Tourist",
    siteContext: {
      id: "site-current-byron-only-stale",
      projectId: "proj-only-stale-qsc",
      addressInput: "45 Broken Head Road, Byron Bay NSW 2481",
      formattedAddress: "45 Broken Head Road, Byron Bay NSW 2481",
      lgaName: "Byron Shire",
      lgaCode: "BYRON",
      parcelId: null,
      lot: null,
      planNumber: null,
      latitude: null,
      longitude: null,
      zone: "SP3 – Tourist",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
  const prisma = new MockPrisma({ "proj-only-stale-qsc": ["user-1"] }, { "proj-only-stale-qsc": currentSite });
  prisma.artefacts.push({
    id: "qsc-only-stale",
    projectId: "proj-only-stale-qsc",
    type: "quick_site_check",
    title: "Quick Site Check — stale Kempsey",
    payload: {
      projectId: "proj-only-stale-qsc",
      generatedAt: "2026-07-16T00:00:00Z",
      site: { address: "52 Belgrave St, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 – Commercial Centre" },
      lepInstrument: null,
      permissibility: null,
      controls: {
        heightOfBuilding: { label: "Height", value: null, present: false, interpretation: "Unavailable" },
        floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable" },
        minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable" },
      },
      notes: [],
      nextSteps: [],
      lepEvidenceSummary: { label: "Cited", detail: "DB-backed E2 zone table", citedControlCount: 0, totalControlCount: 3, landUseEntryCount: 4, objectiveCount: 6, sourceRef: "Kempsey LEP 2013 — Zone E2" },
    } satisfies QuickSiteCheckReport,
  });

  await assert.rejects(
    () => createDetailedPlanningPackArtefact({
      body: { projectId: "proj-only-stale-qsc", proposalBrief: "Tourist accommodation alterations" },
      userId: "user-1",
      deps: { prisma: prisma as any, getDCPContext: async () => [] } as any,
    }),
    (error) => error instanceof ArtefactValidationError && /current site/.test(error.message),
  );
  assert.equal(prisma.artefacts.some((artefact) => artefact.type === "detailed_planning_pack"), false);
});

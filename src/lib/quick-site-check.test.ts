import { describe, expect, it, vi } from "vitest";
import type { QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";

vi.mock("@/lib/lep/lep-search", () => ({ lookupLepInstruments: vi.fn(async () => ({ instruments: [] })) }));
vi.mock("@/lib/site-context", () => ({
  resolveInstrumentsForSite: () => ({ lgaCode: "Byron", lepInstrumentSlug: null }),
  serializeSiteContext: () => ({ lgaName: "Byron", zoningCode: "R2", formattedAddress: "1 Test Street" }),
}));
vi.mock("@/lib/lep/lep-lookup", () => ({
  findLepZoneForZoningCode: () => ({
    zone: {
      zoneCode: "R2",
      zoneName: "Low Density Residential",
      permittedWithoutConsent: ["Old without"],
      permittedWithConsent: ["Old with"],
      prohibited: ["Old prohibited"],
    },
  }),
}));

const { buildQuickSiteCheckReport } = await import("./quick-site-check");

const lepResult: QuickSiteCheckLepSuccess = {
  ok: true,
  projectId: "project-1",
  lga: "Byron",
  lepName: "Byron LEP 2014",
  zone: "R2",
  objectives: ["To provide housing."],
  controls: {
    heightOfBuilding: { value: "8.5m", clauseRef: "4.3", sourceRef: "Byron LEP 2014 Height of Buildings Map", confidence: "Cited" },
    fsr: { value: "0.5:1", clauseRef: "4.4", sourceRef: "Byron LEP 2014 Floor Space Ratio Map", confidence: "Cited" },
    minLotSize: { value: "500m²", clauseRef: "4.1", sourceRef: "Byron LEP 2014 Lot Size Map", confidence: "Cited" },
    zoneObjectives: ["To provide housing."],
  },
  permissibility: {
    permittedWithoutConsent: ["Home occupations"],
    permittedWithConsent: ["Dwelling houses"],
    prohibited: ["Industries"],
  },
  dataSource: "db_clauses",
  landUse: { withoutConsent: [], withConsent: [], prohibited: [] },
  part4: [],
  part5: [],
  part6: [],
};

describe("buildQuickSiteCheckReport", () => {
  it("prefers official mapped LEP controls over legacy lepData controls", async () => {
    const report = await buildQuickSiteCheckReport(
      {
        id: "project-1",
        address: "1 Test Street",
        zoningCode: "R2",
        zoningName: "Low Density Residential",
        zoningSource: "test",
        lepData: { controls: { heightOfBuilding: "legacy height", fsr: "legacy fsr", minLotSize: "legacy lot" } },
        siteContext: null,
      } as never,
      lepResult,
    );

    expect(report.controls.heightOfBuilding.value).toBe("8.5m");
    expect(report.controls.floorSpaceRatio.value).toBe("0.5:1");
    expect(report.controls.minimumLotSize.value).toBe("500m²");
    expect(report.controls.heightOfBuilding.lepSource).toBe(true);
    expect(report.permissibility?.permittedWithConsent).toEqual(["Dwelling houses"]);
  });

  it("does not treat a legacy map title as a site-specific value", async () => {
    const report = await buildQuickSiteCheckReport({
      id: "project-1",
      address: "1 Test Street",
      zoningCode: "R2",
      zoningName: "Low Density Residential",
      zoningSource: "test",
      lepData: {
        controls: {
          heightOfBuilding: "Height of Buildings Map",
          floorSpaceRatio: "Floor Space Ratio Map",
          minimumLotSize: "Lot Size Map",
        },
      },
      siteContext: null,
    } as never);

    expect(report.controls.heightOfBuilding.value).toBeNull();
    expect(report.controls.floorSpaceRatio.value).toBeNull();
    expect(report.controls.minimumLotSize.value).toBeNull();
  });
});

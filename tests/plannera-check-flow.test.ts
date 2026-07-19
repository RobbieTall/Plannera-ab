import assert from "node:assert/strict";
import test from "node:test";

import { assessQuickSiteCheckDevelopmentIntent, buildFocusedCheckControlList, getFocusedCheckEligibility, quickSiteCheckFingerprint, quickSiteCheckIntentForProposal, quickSiteCheckReportFromFocusedResult, quickSiteCheckReportsEquivalent } from "../src/lib/plannera-check-flow";
import type { SiteContextSummary } from "../src/types/site";
import type { QuickSiteCheckReport } from "../src/types/quick-site-check";
import type { QuickSiteCheckLepSuccess } from "../src/types/quick-site-check-lep";

const site = (overrides: Partial<SiteContextSummary> = {}): SiteContextSummary => ({
  id: "site", projectId: "project", addressInput: "52 Belgrave St", formattedAddress: "52 Belgrave St, Kempsey NSW 2440",
  lgaName: "Kempsey Shire", lgaCode: "KEMPSEY", parcelId: "1/DP1", lot: null, planNumber: null, latitude: -31, longitude: 152,
  zone: "E2 Commercial Centre", zoningCode: "E2", zoningName: "Commercial Centre", zoningSource: "resolver", createdAt: "now", updatedAt: "now", ...overrides,
});

test("focused check eligibility accepts confirmed candidate context", () => {
  assert.equal(getFocusedCheckEligibility({ focusedCheck: true, siteContextLoaded: true, siteContext: site(), siteContextMutationsDisabled: false }).eligible, true);
});

test("focused check eligibility blocks manual-only fallback context", () => {
  const result = getFocusedCheckEligibility({ focusedCheck: true, siteContextLoaded: true, siteContext: site({ parcelId: null, latitude: null, longitude: null, zone: null, zoningCode: null, zoningName: null }), siteContextMutationsDisabled: false });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "unconfirmed_site");
});

test("focused check eligibility blocks pending, disabled mutation and ordinary modes", () => {
  assert.equal(getFocusedCheckEligibility({ focusedCheck: true, siteContextLoaded: false, siteContext: null, siteContextMutationsDisabled: false }).reason, "pending");
  assert.equal(getFocusedCheckEligibility({ focusedCheck: true, siteContextLoaded: true, siteContext: site(), siteContextMutationsDisabled: true }).reason, "mutations_disabled");
  assert.equal(getFocusedCheckEligibility({ focusedCheck: false, siteContextLoaded: true, siteContext: site(), siteContextMutationsDisabled: false }).reason, "ordinary_mode");
});

const result = (overrides: Partial<QuickSiteCheckLepSuccess> = {}): QuickSiteCheckLepSuccess => ({
  ok: true, projectId: "project", lga: "Kempsey Shire", lepName: "Kempsey LEP 2013", zone: "E2", objectives: [], dataSource: "db_clauses",
  controls: {
    heightOfBuilding: { value: "11 m", clauseRef: "4.3", confidence: "Cited", sourceRef: "Kempsey LEP cl. 4.3" },
    fsr: null,
    minLotSize: null,
    zoneObjectives: [],
    setback: { value: "0 m", clauseRef: "D4", confidence: "Cited", sourceRef: "Kempsey DCP D4" },
    parking: { value: "Unavailable", clauseRef: "D4.6", confidence: "Unavailable", sourceRef: "Kempsey DCP D4.6" },
    activeFrontageBuiltForm: null,
  },
  permissibility: null,
  landUse: { withoutConsent: [], withConsent: [], prohibited: [] },
  part4: [], part5: [], part6: [],
  ...overrides,
});

test("focused check control list retains optional cited and unavailable controls", () => {
  const controls = buildFocusedCheckControlList(result());
  assert.deepEqual(controls.map((control) => [control.key, control.value, control.confidence, control.sourceRef]), [
    ["heightOfBuilding", "11 m", "Cited", "Kempsey LEP cl. 4.3"],
    ["floorSpaceRatio", "Unavailable", "Unavailable", null],
    ["minimumLotSize", "Unavailable", "Unavailable", null],
    ["setback", "0 m", "Cited", "Kempsey DCP D4"],
    ["parking", "Unavailable", "Unavailable", "Kempsey DCP D4.6"],
  ]);
  assert.equal(controls.some((control) => control.key === "activeFrontageBuiltForm"), false);
  const saved = quickSiteCheckReportFromFocusedResult("project", result(), "52 Belgrave St");
  assert.equal("parking" in saved.controls, true);
  assert.equal("activeFrontageBuiltForm" in saved.controls, false);
  assert.equal(saved.controls.heightOfBuilding.lepSource, true);
  assert.equal(saved.controls.setback?.lepSource, false);
  assert.equal(saved.controls.parking?.present, false);
  assert.equal(saved.controls.parking?.source, "Kempsey DCP D4.6");
  assert.match(saved.controls.parking?.interpretation ?? "", /unavailable in Kempsey DCP D4\.6/);
  assert.doesNotMatch(saved.controls.setback?.interpretation ?? "", /LEP clause/);
});

test("development intent becomes cited only for one exact statutory land-use term", () => {
  const citedResult = result({
    landUse: {
      withoutConsent: ["Home occupations"],
      withConsent: ["Centre-based child care facilities"],
      prohibited: ["Eco-tourist facilities"],
    },
  });
  const assessment = assessQuickSiteCheckDevelopmentIntent("  centre‑based   child care facilities ", citedResult);

  assert.deepEqual(assessment, {
    description: "centre‑based child care facilities",
    status: "Cited",
    pathway: "permitted_with_consent",
    statutoryLandUse: "Centre-based child care facilities",
    sourceRef: "Kempsey LEP 2013 Land Use Table, Zone E2 (cl. 2.3)",
    detail: "Exact statutory term match: “Centre-based child care facilities” is listed as permitted with consent. The proposal must still satisfy that land-use definition and any other applicable controls.",
  });

  assert.equal(assessQuickSiteCheckDevelopmentIntent("home occupations", citedResult)?.pathway, "permitted_without_consent");
  assert.equal(assessQuickSiteCheckDevelopmentIntent("Eco-tourist facilities", citedResult)?.pathway, "prohibited");
});

test("development intent remains unresolved for fuzzy, fallback and ambiguous matches", () => {
  const citedResult = result({
    landUse: {
      withoutConsent: ["Home occupations"],
      withConsent: ["Secondary dwellings"],
      prohibited: [],
    },
  });

  const fuzzy = assessQuickSiteCheckDevelopmentIntent("Build a secondary dwelling behind the house", citedResult);
  assert.equal(fuzzy?.status, "Unresolved");
  assert.equal(fuzzy?.pathway, "unresolved");
  assert.equal(fuzzy?.statutoryLandUse, null);

  const fallback = assessQuickSiteCheckDevelopmentIntent("Secondary dwellings", { ...citedResult, dataSource: "fallback" });
  assert.equal(fallback?.status, "Unresolved");
  assert.equal(fallback?.sourceRef, null);

  const ambiguous = assessQuickSiteCheckDevelopmentIntent("Home occupations", {
    ...citedResult,
    landUse: { withoutConsent: ["Home occupations"], withConsent: ["Home occupations"], prohibited: [] },
  });
  assert.equal(ambiguous?.status, "Unresolved");
  assert.equal(ambiguous?.statutoryLandUse, null);
});

test("focused report carries the exact intent and its conservative assessment", () => {
  const saved = quickSiteCheckReportFromFocusedResult("project", result({
    landUse: { withoutConsent: [], withConsent: ["Commercial premises"], prohibited: [] },
  }), "52 Belgrave St", " Commercial   premises ");

  assert.equal(saved.developmentIntent?.description, "Commercial premises");
  assert.equal(saved.developmentIntent?.status, "Cited");
  assert.equal(saved.developmentIntent?.pathway, "permitted_with_consent");
  assert.equal(quickSiteCheckIntentForProposal(saved), "Commercial premises");
  assert.equal(quickSiteCheckIntentForProposal({ ...saved, developmentIntent: null }), null);
});

const report = (overrides: Partial<QuickSiteCheckReport> = {}): QuickSiteCheckReport => ({
  projectId: "project", generatedAt: "2026-01-01T00:00:00Z",
  site: { address: "52 Belgrave St", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "Zone E2" },
  lepInstrument: { name: "Kempsey LEP 2013", lga: "Kempsey Shire", source: "ingestion" },
  permissibility: { zoneLabel: "Zone E2", permittedWithoutConsent: [], permittedWithConsent: ["Commercial premises"], prohibited: [], interpretation: "Extracted" },
  controls: {
    heightOfBuilding: { label: "Height", value: "11 m", present: true, interpretation: "Height", confidence: "Cited", clauseRef: "4.3", source: "Kempsey LEP cl. 4.3" },
    floorSpaceRatio: { label: "FSR", value: null, present: false, interpretation: "Unavailable", confidence: "Unavailable" },
    minimumLotSize: { label: "MLS", value: null, present: false, interpretation: "Unavailable", confidence: "Unavailable" },
    setback: { label: "Setback", value: "0 m", present: true, interpretation: "Setback", confidence: "Cited", clauseRef: "D4", source: "Kempsey DCP D4" },
  },
  notes: ["objective"], nextSteps: [], lepEvidenceSummary: { label: "Cited", detail: "DB backed", citedControlCount: 1, totalControlCount: 3, landUseEntryCount: 1, objectiveCount: 1, sourceRef: "Kempsey LEP" },
  ...overrides,
});

test("quick site check equivalence ignores generatedAt only", () => {
  assert.equal(quickSiteCheckReportsEquivalent(report(), report({ generatedAt: "2026-02-02T00:00:00Z" })), true);
  assert.equal(quickSiteCheckFingerprint(report()), quickSiteCheckFingerprint(report({ generatedAt: "later" })));
});

test("quick site check equivalence detects changed source, changed control and different site", () => {
  assert.equal(quickSiteCheckReportsEquivalent(report(), report({ controls: { ...report().controls, heightOfBuilding: { ...report().controls.heightOfBuilding, source: "Different source", clauseRef: "4.3", value: "11 m" } } })), false);
  assert.equal(quickSiteCheckReportsEquivalent(report(), report({ controls: { ...report().controls, heightOfBuilding: { ...report().controls.heightOfBuilding, value: "12 m" } } })), false);
  assert.equal(quickSiteCheckReportsEquivalent(report(), report({ site: { ...report().site, address: "45 Broken Head Road" } })), false);
  assert.equal(quickSiteCheckReportsEquivalent(report(), report({ developmentIntent: { description: "Commercial premises", status: "Cited", pathway: "permitted_with_consent", statutoryLandUse: "Commercial premises", sourceRef: "Kempsey LEP", detail: "Exact match" } })), false);
});

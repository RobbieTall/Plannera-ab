import type { SiteContextSummary } from "@/types/site";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { LepControlValue, QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";
import { summariseQuickSiteCheckEvidence } from "@/lib/quick-site-check-evidence";

export type FocusedCheckEligibility = {
  eligible: boolean;
  reason: "ordinary_mode" | "pending" | "mutations_disabled" | "missing_lga" | "unconfirmed_site" | "ready";
  message: string;
};

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export function getFocusedCheckEligibility({
  focusedCheck,
  siteContextLoaded,
  siteContext,
  siteContextMutationsDisabled,
}: {
  focusedCheck: boolean;
  siteContextLoaded: boolean;
  siteContext: SiteContextSummary | null;
  siteContextMutationsDisabled: boolean;
}): FocusedCheckEligibility {
  if (!focusedCheck) return { eligible: false, reason: "ordinary_mode", message: "Focused Check mode is not active." };
  if (!siteContextLoaded) return { eligible: false, reason: "pending", message: "Loading the site workspace…" };
  if (siteContextMutationsDisabled) return { eligible: false, reason: "mutations_disabled", message: "Site confirmation is unavailable in this environment." };
  if (!siteContext) return { eligible: false, reason: "pending", message: "Resolving the site address…" };
  if (!hasText(siteContext.lgaName) && !hasText(siteContext.lgaCode)) {
    return { eligible: false, reason: "missing_lga", message: "The address could not be matched to an LGA. Change address and try again." };
  }

  const hasCoordinates = typeof siteContext.latitude === "number" && typeof siteContext.longitude === "number";
  const hasSpatialOrPlanningIdentity = hasText(siteContext.parcelId) || hasCoordinates || hasText(siteContext.zone) || hasText(siteContext.zoningCode) || hasText(siteContext.zoningName);

  if (!hasSpatialOrPlanningIdentity) {
    return { eligible: false, reason: "unconfirmed_site", message: "The address could not be confirmed against parcel, coordinates or zoning. Change address and try again." };
  }

  return { eligible: true, reason: "ready", message: "Site confirmed. Preparing to retrieve planning controls…" };
}

export type DisplayedQuickSiteCheckControl = {
  key: "heightOfBuilding" | "floorSpaceRatio" | "minimumLotSize" | "setback" | "parking" | "activeFrontageBuiltForm";
  label: string;
  value: string;
  confidence: "Cited" | "Inferred" | "Unavailable";
  sourceRef: string | null;
};

function displayControl(key: DisplayedQuickSiteCheckControl["key"], label: string, control: LepControlValue | null | undefined, includeWhenMissing: boolean): DisplayedQuickSiteCheckControl | null {
  if (!control && !includeWhenMissing) return null;
  return {
    key,
    label,
    value: control?.value || "Unavailable",
    confidence: control?.confidence ?? "Unavailable",
    sourceRef: control?.sourceRef ?? (control?.clauseRef ? `cl. ${control.clauseRef}` : null),
  };
}

export function buildFocusedCheckControlList(result: QuickSiteCheckLepSuccess): DisplayedQuickSiteCheckControl[] {
  return [
    displayControl("heightOfBuilding", "Height", result.controls.heightOfBuilding, true),
    displayControl("floorSpaceRatio", "FSR", result.controls.fsr, true),
    displayControl("minimumLotSize", "Minimum lot size", result.controls.minLotSize, true),
    displayControl("setback", "Setback", result.controls.setback, result.controls.setback != null),
    displayControl("parking", "Parking", result.controls.parking, result.controls.parking != null),
    displayControl("activeFrontageBuiltForm", "Active frontage / built form", result.controls.activeFrontageBuiltForm, result.controls.activeFrontageBuiltForm != null),
  ].filter((item): item is DisplayedQuickSiteCheckControl => Boolean(item));
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, stable(val)]));
  }
  return value ?? null;
}

export function quickSiteCheckFingerprint(report: QuickSiteCheckReport): string {
  return JSON.stringify(stable({
    site: report.site,
    lepInstrument: report.lepInstrument ?? null,
    permissibility: report.permissibility ?? null,
    controls: report.controls,
    notes: report.notes,
    evidence: report.lepEvidenceSummary ?? null,
  }));
}

export function quickSiteCheckReportsEquivalent(a: QuickSiteCheckReport | null | undefined, b: QuickSiteCheckReport | null | undefined): boolean {
  if (!a || !b) return false;
  return quickSiteCheckFingerprint(a) === quickSiteCheckFingerprint(b);
}

export function quickSiteCheckReportFromFocusedResult(projectId: string, result: QuickSiteCheckLepSuccess, address?: string | null): QuickSiteCheckReport {
  const toReportControl = (label: string, control: LepControlValue | null | undefined) => ({
    label,
    value: control?.value ?? null,
    present: Boolean(control?.value),
    lepSource: Boolean(control?.value),
    source: control?.sourceRef ?? null,
    clauseRef: control?.clauseRef,
    interpretation: control?.value ? `${label} extracted from LEP clause ${control.clauseRef}.` : "Unavailable in the current Quick Site Check evidence.",
    confidence: control?.confidence ?? "Unavailable" as const,
  });

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    site: { address: address ?? null, lga: result.lga, zoneCode: result.zone, zoneLabel: result.zone ? `Zone ${result.zone}` : null },
    lepInstrument: { name: result.lepName, lga: result.lga, source: "ingestion" },
    permissibility: result.permissibility ? { zoneLabel: result.zone ? `Zone ${result.zone}` : null, permittedWithoutConsent: result.permissibility.permittedWithoutConsent, permittedWithConsent: result.permissibility.permittedWithConsent, prohibited: result.permissibility.prohibited, interpretation: "Extracted from LEP zone table (permitted uses and prohibitions)." } : null,
    controls: {
      heightOfBuilding: toReportControl("Height of buildings", result.controls.heightOfBuilding),
      floorSpaceRatio: toReportControl("Floor space ratio", result.controls.fsr),
      minimumLotSize: toReportControl("Minimum lot size", result.controls.minLotSize),
      ...(result.controls.setback != null ? { setback: toReportControl("Setback", result.controls.setback) } : {}),
      ...(result.controls.parking != null ? { parking: toReportControl("Parking", result.controls.parking) } : {}),
      ...(result.controls.activeFrontageBuiltForm != null ? { activeFrontageBuiltForm: toReportControl("Active frontage / built form", result.controls.activeFrontageBuiltForm) } : {}),
    },
    notes: result.objectives,
    nextSteps: ["Review highlighted LEP clauses (Parts 4–6).", result.zone ? `Confirm mapping overlays and constraints for zone ${result.zone}.` : "Confirm zoning and rerun Quick Site Check."],
    lepEvidenceSummary: summariseQuickSiteCheckEvidence(result),
  };
}

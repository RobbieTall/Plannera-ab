import type { SiteContextSummary } from "@/types/site";
import type { QuickSiteCheckDevelopmentIntent, QuickSiteCheckReport } from "@/types/quick-site-check";
import type { LepControlValue, QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";
import { summariseQuickSiteCheckEvidence } from "@/lib/quick-site-check-evidence";

export type FocusedCheckEligibility = {
  eligible: boolean;
  reason: "ordinary_mode" | "pending" | "mutations_disabled" | "missing_lga" | "unconfirmed_site" | "ready";
  message: string;
};

const normalizeStatutoryLandUse = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("en-AU")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const compactIntent = (value: string) => value.replace(/\s+/g, " ").trim();

const pathwayDetail: Record<Exclude<QuickSiteCheckDevelopmentIntent["pathway"], "unresolved">, string> = {
  permitted_without_consent: "permitted without consent",
  permitted_with_consent: "permitted with consent",
  prohibited: "prohibited",
};

export function assessQuickSiteCheckDevelopmentIntent(
  value: string,
  result: QuickSiteCheckLepSuccess | null,
): QuickSiteCheckDevelopmentIntent | null {
  const description = compactIntent(value);
  if (!description) return null;

  const unresolved = (detail: string, sourceRef: string | null = null): QuickSiteCheckDevelopmentIntent => ({
    description,
    status: "Unresolved",
    pathway: "unresolved",
    statutoryLandUse: null,
    sourceRef,
    detail,
  });

  if (!result || result.dataSource !== "db_clauses" || !result.zone) {
    return unresolved("No cited zone land-use table was available to classify this description.");
  }

  const sourceRef = `${result.lepName} Land Use Table, Zone ${result.zone} (cl. 2.3)`;
  const normalizedIntent = normalizeStatutoryLandUse(description);
  const candidates = [
    ...result.landUse.withoutConsent.map((statutoryLandUse) => ({ pathway: "permitted_without_consent" as const, statutoryLandUse })),
    ...result.landUse.withConsent.map((statutoryLandUse) => ({ pathway: "permitted_with_consent" as const, statutoryLandUse })),
    ...result.landUse.prohibited.map((statutoryLandUse) => ({ pathway: "prohibited" as const, statutoryLandUse })),
  ].filter(({ statutoryLandUse }) => normalizeStatutoryLandUse(statutoryLandUse) === normalizedIntent);

  if (candidates.length !== 1) {
    return unresolved(
      "This description does not exactly match one statutory land-use term in the cited zone table. No permissibility pathway has been assigned.",
      sourceRef,
    );
  }

  const match = candidates[0];
  return {
    description,
    status: "Cited",
    pathway: match.pathway,
    statutoryLandUse: match.statutoryLandUse,
    sourceRef,
    detail: `Exact statutory term match: “${match.statutoryLandUse}” is listed as ${pathwayDetail[match.pathway]}. The proposal must still satisfy that land-use definition and any other applicable controls.`,
  };
}

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
    developmentIntent: report.developmentIntent ?? null,
  }));
}

export function quickSiteCheckReportsEquivalent(a: QuickSiteCheckReport | null | undefined, b: QuickSiteCheckReport | null | undefined): boolean {
  if (!a || !b) return false;
  return quickSiteCheckFingerprint(a) === quickSiteCheckFingerprint(b);
}

export function quickSiteCheckIntentForProposal(report: QuickSiteCheckReport | null | undefined): string | null {
  const description = report?.developmentIntent?.description.replace(/\s+/g, " ").trim();
  return description || null;
}

export function quickSiteCheckReportFromFocusedResult(
  projectId: string,
  result: QuickSiteCheckLepSuccess,
  address?: string | null,
  developmentIntent?: string | null,
): QuickSiteCheckReport {
  const toReportControl = (label: string, control: LepControlValue | null | undefined, isLepSource: boolean) => {
    const isAvailable = Boolean(control?.value && control.confidence !== "Unavailable" && control.value.trim().toLowerCase() !== "unavailable");
    const source = control?.sourceRef ?? null;
    return {
      label,
      value: control?.value ?? null,
      present: isAvailable,
      lepSource: isAvailable && isLepSource,
      source,
      clauseRef: control?.clauseRef,
      interpretation: isAvailable
        ? `${label} extracted from ${source ?? `planning control ${control?.clauseRef ?? "source"}`}.`
        : source
          ? `${label} is unavailable in ${source}.`
          : "Unavailable in the current Quick Site Check evidence.",
      confidence: control?.confidence ?? "Unavailable" as const,
    };
  };

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    site: { address: address ?? null, lga: result.lga, zoneCode: result.zone, zoneLabel: result.zone ? `Zone ${result.zone}` : null },
    lepInstrument: { name: result.lepName, lga: result.lga, source: "ingestion" },
    permissibility: result.permissibility ? { zoneLabel: result.zone ? `Zone ${result.zone}` : null, permittedWithoutConsent: result.permissibility.permittedWithoutConsent, permittedWithConsent: result.permissibility.permittedWithConsent, prohibited: result.permissibility.prohibited, interpretation: "Extracted from LEP zone table (permitted uses and prohibitions)." } : null,
    controls: {
      heightOfBuilding: toReportControl("Height of buildings", result.controls.heightOfBuilding, true),
      floorSpaceRatio: toReportControl("Floor space ratio", result.controls.fsr, true),
      minimumLotSize: toReportControl("Minimum lot size", result.controls.minLotSize, true),
      ...(result.controls.setback != null ? { setback: toReportControl("Setback", result.controls.setback, false) } : {}),
      ...(result.controls.parking != null ? { parking: toReportControl("Parking", result.controls.parking, false) } : {}),
      ...(result.controls.activeFrontageBuiltForm != null ? { activeFrontageBuiltForm: toReportControl("Active frontage / built form", result.controls.activeFrontageBuiltForm, false) } : {}),
    },
    notes: result.objectives,
    nextSteps: ["Review highlighted LEP clauses (Parts 4–6).", result.zone ? `Confirm mapping overlays and constraints for zone ${result.zone}.` : "Confirm zoning and rerun Quick Site Check."],
    lepEvidenceSummary: summariseQuickSiteCheckEvidence(result),
    developmentIntent: assessQuickSiteCheckDevelopmentIntent(developmentIntent ?? "", result),
  };
}

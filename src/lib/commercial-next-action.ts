export type CommercialReadinessStatus =
  | "Confirmed"
  | "Likely"
  | "Needs Input"
  | "Needs Expert Review"
  | "Unavailable";

export type CommercialNextActionInput = {
  hasSiteContext: boolean;
  lgaName?: string | null;
  lgaCode?: string | null;
  zoneLabel?: string | null;
  coverageMaturity?: string | null;
  hasQuickSiteCheck: boolean;
  hasSee: boolean;
  hasDetailedPlanningPack?: boolean;
  hasQualityDetailedPlanningPack?: boolean;
  hasQualityQuickSiteCheck?: boolean;
  hasQualitySee?: boolean;
  isPendingInitialSiteConfirmation?: boolean;
};

export type CommercialReadinessItem = {
  label: string;
  status: CommercialReadinessStatus;
  detail: string;
};

export type CommercialNextAction = {
  heading: string;
  description: string;
  primaryAction: "set_site" | "run_quick_site_check" | "generate_detailed_pack" | "generate_see" | "export_or_review";
  primaryLabel: string;
  secondaryLabel?: string;
  items: CommercialReadinessItem[];
};

const TARGET_LGA_PATTERN = /\b(byron|kempsey)\b/i;

const isTargetLga = (lgaName?: string | null, lgaCode?: string | null) =>
  TARGET_LGA_PATTERN.test(`${lgaName ?? ""} ${lgaCode ?? ""}`);

const isSearchableCoverage = (coverageMaturity?: string | null) =>
  ["SEARCHABLE_READY", "STRUCTURED_PARTIAL", "VERIFIED"].includes(
    coverageMaturity ?? "",
  );

export function buildCommercialNextAction({
  hasSiteContext,
  lgaName,
  lgaCode,
  zoneLabel,
  coverageMaturity,
  hasQuickSiteCheck,
  hasSee,
  hasDetailedPlanningPack = false,
  hasQualityDetailedPlanningPack = false,
  hasQualityQuickSiteCheck = hasQuickSiteCheck,
  hasQualitySee = hasSee,
  isPendingInitialSiteConfirmation = false,
}: CommercialNextActionInput): CommercialNextAction {
  const targetLga = isTargetLga(lgaName, lgaCode);
  const searchableCoverage = isSearchableCoverage(coverageMaturity);
  const confirmedSiteContext = hasSiteContext && !isPendingInitialSiteConfirmation;
  const lgaDetail = targetLga
    ? `${lgaName ?? lgaCode} is one of the launch LGAs.`
    : confirmedSiteContext
      ? "This commercial workflow is tuned for Byron and Kempsey first."
      : isPendingInitialSiteConfirmation
        ? "Plannera is confirming the address before treating the launch workflow as ready."
      : "Enter a Byron or Kempsey address to start the launch workflow.";

  const items: CommercialReadinessItem[] = [
    {
      label: "Site and LGA",
      status: confirmedSiteContext ? (targetLga ? "Confirmed" : "Needs Expert Review") : "Needs Input",
      detail: confirmedSiteContext ? lgaDetail : isPendingInitialSiteConfirmation ? lgaDetail : "No confirmed site address yet.",
    },
    {
      label: "LEP / zone intelligence",
      status: zoneLabel && targetLga ? "Confirmed" : zoneLabel ? "Likely" : "Unavailable",
      detail: zoneLabel
        ? `Current workspace zone: ${zoneLabel}.`
        : "No resolved zoning is available in the workspace yet.",
    },
    {
      label: "Local planning sources",
      status: searchableCoverage ? "Confirmed" : targetLga ? "Likely" : "Needs Expert Review",
      detail: searchableCoverage
        ? "Local LEP/DCP source coverage is searchable for workspace outputs."
        : targetLga
          ? "Launch LGA detected; run outputs and review citations for source coverage."
          : "Outside the launch LGAs, confirm local source coverage before relying on outputs.",
    },
    {
      label: "Saved Quick Site Check",
      status: hasQualityQuickSiteCheck ? "Confirmed" : hasQuickSiteCheck ? "Needs Expert Review" : confirmedSiteContext ? "Needs Input" : "Unavailable",
      detail: hasQualityQuickSiteCheck
        ? "A Quick Site Check artefact is saved with site-scoped cited controls."
        : hasQuickSiteCheck
          ? "A Quick Site Check exists, but it lacks enough relevant cited controls for commercial readiness."
        : "Run and save a Quick Site Check before drafting paid documentation.",
    },
    {
      label: "Detailed Planning Pack",
      status: hasQualityDetailedPlanningPack ? "Confirmed" : hasDetailedPlanningPack ? "Needs Expert Review" : hasQualityQuickSiteCheck ? "Needs Input" : "Unavailable",
      detail: hasQualityDetailedPlanningPack
        ? "A current-site proposal-scoped DCP evidence pack is saved and all tracked topics are cited."
        : hasDetailedPlanningPack
          ? "A current-site Detailed Planning Pack exists, but unresolved topics need review or regeneration before SEE/referral."
          : "Enter a proposed-works brief and generate the Detailed Planning Pack before SEE/referral.",
    },
    {
      label: "SEE / referral",
      status: hasQualitySee && hasQualityDetailedPlanningPack ? "Confirmed" : hasSee ? "Needs Expert Review" : hasQualityDetailedPlanningPack ? "Needs Input" : "Unavailable",
      detail: hasQualitySee && hasQualityDetailedPlanningPack
        ? "A SEE draft is saved with relevant cited evidence and is ready to copy, download, or review."
        : hasQualitySee
          ? "A quality SEE draft exists, but the current-site Detailed Planning Pack gate is not yet quality-valid."
          : hasSee
          ? "A SEE draft exists, but it lacks enough relevant cited evidence for commercial readiness."
        : "Generate SEE/referral handoff after the Detailed Planning Pack is reviewed.",
    },
  ];

  if (!confirmedSiteContext) {
    return {
      heading: isPendingInitialSiteConfirmation ? "Confirming the launch site" : "Start the Byron/Kempsey paid workflow",
      description: "Resolve the address first so Plannera can identify the LGA, zone and available planning intelligence.",
      primaryAction: "set_site",
      primaryLabel: isPendingInitialSiteConfirmation ? "Confirm site before paid workflow" : "Set a Byron or Kempsey site",
      items,
    };
  }

  if (!hasQualityQuickSiteCheck) {
    return {
      heading: "Next commercial step: prove the site intelligence",
      description: "Run a cited Quick Site Check before asking the user to pay for a SEE or professional review.",
      primaryAction: "run_quick_site_check",
      primaryLabel: "Run Quick Site Check",
      items,
    };
  }

  if (!hasQualityDetailedPlanningPack) {
    return {
      heading: hasDetailedPlanningPack
        ? "Next commercial step: resolve the Detailed Planning Pack"
        : "Next commercial step: generate the Detailed Planning Pack",
      description: hasDetailedPlanningPack
        ? "The current-site pack has unresolved DCP topics; review or regenerate it before SEE or referral."
        : "Capture the proposed works and retrieve proposal/zone-scoped DCP evidence before SEE or referral.",
      primaryAction: "generate_detailed_pack",
      primaryLabel: hasDetailedPlanningPack ? "Regenerate detailed planning pack" : "Generate detailed planning pack",
      items,
    };
  }

  if (!hasQualitySee) {
    return {
      heading: "Next commercial step: prepare SEE/referral",
      description: "Use the saved Detailed Planning Pack as the consultant-ready evidence step before export or review.",
      primaryAction: "generate_see",
      primaryLabel: "Generate SEE",
      items,
    };
  }

  return {
    heading: "Ready for paid export or expert review",
    description: "The workspace has site-scoped, quality-valid evidence and generated outputs for the Byron/Kempsey commercial path.",
    primaryAction: "export_or_review",
    primaryLabel: "Download SEE",
    secondaryLabel: "Request expert review",
    items,
  };
}

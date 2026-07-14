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
  primaryAction: "set_site" | "run_quick_site_check" | "generate_see" | "export_or_review";
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
      label: "SEE-ready artefact",
      status: hasQualitySee ? "Confirmed" : hasSee ? "Needs Expert Review" : hasQualityQuickSiteCheck ? "Needs Input" : "Unavailable",
      detail: hasQualitySee
        ? "A SEE draft is saved with relevant cited evidence and is ready to copy, download, or review."
        : hasSee
          ? "A SEE draft exists, but it lacks enough relevant cited evidence for commercial readiness."
        : "Generate a SEE once the site check is saved and assumptions are clear.",
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

  if (!hasQualitySee) {
    return {
      heading: "Next commercial step: generate the SEE draft",
      description: "Use the saved site check, LEP/DCP context and known assumptions to create an exportable artefact.",
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

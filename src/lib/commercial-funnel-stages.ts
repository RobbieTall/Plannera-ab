import type { CommercialNextAction } from "@/lib/commercial-next-action";

export type CommercialFunnelStageId = "site" | "quick_site_check" | "detailed_planning_pack" | "see_referral";
export type CommercialFunnelStageState = "complete" | "current" | "needs_review" | "upcoming";

export type CommercialFunnelStage = {
  id: CommercialFunnelStageId;
  label: "Site" | "Quick Site Check" | "Detailed Planning Pack" | "SEE / consultant handoff";
  state: CommercialFunnelStageState;
  targetId: string;
};

export type CommercialFunnelStagesInput = {
  nextAction: CommercialNextAction;
  hasConfirmedSite: boolean;
  hasQualityQuickSiteCheck: boolean;
  hasDetailedPlanningPack: boolean;
  hasQualityDetailedPlanningPack: boolean;
  hasQualitySee: boolean;
};

const isCurrent = (nextAction: CommercialNextAction, action: CommercialNextAction["primaryAction"]) =>
  nextAction.primaryAction === action;

export function buildCommercialFunnelStages({
  nextAction,
  hasConfirmedSite,
  hasQualityQuickSiteCheck,
  hasDetailedPlanningPack,
  hasQualityDetailedPlanningPack,
  hasQualitySee,
}: CommercialFunnelStagesInput): CommercialFunnelStage[] {
  const siteState: CommercialFunnelStageState = hasConfirmedSite
    ? "complete"
    : isCurrent(nextAction, "set_site")
      ? "current"
      : "upcoming";
  const qscState: CommercialFunnelStageState = hasQualityQuickSiteCheck
    ? "complete"
    : isCurrent(nextAction, "run_quick_site_check")
      ? "current"
      : hasConfirmedSite
        ? "needs_review"
        : "upcoming";
  const dppState: CommercialFunnelStageState = hasQualityDetailedPlanningPack
    ? "complete"
    : hasDetailedPlanningPack
      ? "needs_review"
      : isCurrent(nextAction, "generate_detailed_pack")
        ? "current"
        : "upcoming";
  const seeState: CommercialFunnelStageState = hasQualitySee && hasQualityDetailedPlanningPack
    ? "complete"
    : isCurrent(nextAction, "generate_see") || isCurrent(nextAction, "export_or_review")
      ? "current"
      : "upcoming";

  return [
    { id: "site", label: "Site", state: siteState, targetId: "workspace-site-control" },
    { id: "quick_site_check", label: "Quick Site Check", state: qscState, targetId: "workspace-qsc-section" },
    { id: "detailed_planning_pack", label: "Detailed Planning Pack", state: dppState, targetId: "workspace-dpp-section" },
    { id: "see_referral", label: "SEE / consultant handoff", state: seeState, targetId: "workspace-see-section" },
  ];
}


export function selectCommercialFunnelActiveStage(stages: CommercialFunnelStage[]): CommercialFunnelStage | undefined {
  return (
    stages.find((stage) => stage.state === "current") ??
    stages.find((stage) => stage.state === "needs_review") ??
    [...stages].reverse().find((stage) => stage.state === "complete") ??
    stages[0]
  );
}

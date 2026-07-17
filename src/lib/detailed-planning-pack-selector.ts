import type { WorkspaceArtefact } from "@/types/workspace";

const packTimestampMs = (artefact: WorkspaceArtefact) => {
  const generatedAt = artefact.detailedPlanningPack?.generatedAt;
  if (!generatedAt) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(generatedAt);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

export const normalizeProposalBriefForComparison = (brief?: string | null) =>
  (brief ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export const isDetailedPlanningPackForProposalBrief = (
  artefact: WorkspaceArtefact,
  proposalBrief?: string | null,
) => {
  const normalized = normalizeProposalBriefForComparison(proposalBrief);
  if (!normalized) return true;
  return normalizeProposalBriefForComparison(artefact.detailedPlanningPack?.proposalBrief) === normalized;
};

const comparePackRecency = (left: WorkspaceArtefact, right: WorkspaceArtefact) => {
  const leftTimestamp = packTimestampMs(left);
  const rightTimestamp = packTimestampMs(right);
  if (leftTimestamp !== rightTimestamp) return leftTimestamp - rightTimestamp;
  return left.id.localeCompare(right.id);
};

export const selectCurrentSiteDetailedPlanningPackArtefact = (
  artefacts: WorkspaceArtefact[],
  options: { proposalBrief?: string | null } = {},
) =>
  artefacts.reduce<WorkspaceArtefact | undefined>((latest, artefact) => {
    if (
      artefact.isCurrentSite === false ||
      artefact.type !== "detailed_planning_pack" ||
      artefact.detailedPlanningPack?.packType !== "detailed_planning_pack" ||
      !isDetailedPlanningPackForProposalBrief(artefact, options.proposalBrief)
    ) {
      return latest;
    }

    if (!latest || comparePackRecency(artefact, latest) > 0) return artefact;
    return latest;
  }, undefined);

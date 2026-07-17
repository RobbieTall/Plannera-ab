import type { ReviewRequestContent, WorkspaceArtefact, WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

const timestampMs = (value?: string | null) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const packTimestampMs = (artefact: WorkspaceArtefact) => timestampMs(artefact.detailedPlanningPack?.generatedAt);
const seeTimestampMs = (artefact: WorkspaceArtefact) => timestampMs(artefact.preSeeMemo?.generatedAt ?? artefact.createdAt);
const reviewRequestTimestampMs = (artefact: WorkspaceArtefact) => timestampMs(artefact.reviewRequest?.generatedAt ?? artefact.createdAt);

export const normalizeProposalBriefForComparison = (brief?: string | null) =>
  (brief ?? "").replace(/\s+/g, " ").trim().toLowerCase();


export const getWorkspaceProposalBriefHydration = ({
  hasLoadedServerArtefacts,
  hasUserEditedProposalBrief,
  currentProposalBrief,
  newestCurrentSiteSavedProposalBrief,
}: {
  hasLoadedServerArtefacts: boolean;
  hasUserEditedProposalBrief: boolean;
  currentProposalBrief?: string | null;
  newestCurrentSiteSavedProposalBrief?: string | null;
}) => {
  if (!hasLoadedServerArtefacts || hasUserEditedProposalBrief || normalizeProposalBriefForComparison(currentProposalBrief)) return null;
  return normalizeProposalBriefForComparison(newestCurrentSiteSavedProposalBrief)
    ? (newestCurrentSiteSavedProposalBrief ?? "")
    : null;
};

export const getExactWorkspaceDppBinding = ({
  sourceDetailedPlanningPackArtefactId,
  expectedProposalBrief,
}: {
  sourceDetailedPlanningPackArtefactId?: string | null;
  expectedProposalBrief?: string | null;
}) => {
  const sourceId = sourceDetailedPlanningPackArtefactId?.trim();
  const proposal = expectedProposalBrief?.trim();
  if (!sourceId || !proposal) return null;
  return {
    sourceDetailedPlanningPackArtefactId: sourceId,
    expectedProposalBrief: proposal,
  };
};

export const isDetailedPlanningPackForProposalBrief = (
  artefact: WorkspaceArtefact,
  proposalBrief?: string | null,
) => {
  const normalized = normalizeProposalBriefForComparison(proposalBrief);
  if (!normalized) return true;
  return normalizeProposalBriefForComparison(artefact.detailedPlanningPack?.proposalBrief) === normalized;
};

const compareOutputRecency = (
  left: WorkspaceArtefact,
  right: WorkspaceArtefact,
  getTimestampMs: (artefact: WorkspaceArtefact) => number,
) => {
  const leftTimestamp = getTimestampMs(left);
  const rightTimestamp = getTimestampMs(right);
  if (leftTimestamp !== rightTimestamp) return leftTimestamp - rightTimestamp;
  return left.id.localeCompare(right.id);
};

const comparePackRecency = (left: WorkspaceArtefact, right: WorkspaceArtefact) => {
  const leftTimestamp = packTimestampMs(left);
  const rightTimestamp = packTimestampMs(right);
  if (leftTimestamp !== rightTimestamp) return leftTimestamp - rightTimestamp;
  return left.id.localeCompare(right.id);
};

export const selectCurrentSiteDetailedPlanningPackArtefact = (
  artefacts: WorkspaceArtefact[],
  options: { proposalBrief?: string | null; requireProposalBrief?: boolean } = {},
) => {
  const normalizedProposal = normalizeProposalBriefForComparison(options.proposalBrief);
  if (options.requireProposalBrief && !normalizedProposal) return undefined;

  return artefacts.reduce<WorkspaceArtefact | undefined>((latest, artefact) => {
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
};

export const selectCurrentWorkspaceDetailedPlanningPackArtefact = (
  artefacts: WorkspaceArtefact[],
  proposalBrief?: string | null,
) => selectCurrentSiteDetailedPlanningPackArtefact(artefacts, { proposalBrief, requireProposalBrief: true });

export const hasCurrentSiteDetailedPlanningPackProposalMismatch = (
  artefacts: WorkspaceArtefact[],
  proposalBrief?: string | null,
) => {
  if (!normalizeProposalBriefForComparison(proposalBrief)) return false;
  const latestAnyProposal = selectCurrentSiteDetailedPlanningPackArtefact(artefacts);
  if (!latestAnyProposal) return false;
  return !selectCurrentSiteDetailedPlanningPackArtefact(artefacts, { proposalBrief });
};

export const isSeeExactForDetailedPlanningPack = (
  memo: WorkspacePreSeePlanningMemoContent | null | undefined,
  packArtefact: WorkspaceArtefact | null | undefined,
) => {
  const pack = packArtefact?.detailedPlanningPack;
  if (memo?.memoType !== "pre_see_planning_memo" || !pack || !packArtefact?.id || !memo.sourceDetailedPlanningPack) return false;
  return memo.sourceDetailedPlanningPack.artefactId === packArtefact.id &&
    memo.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId === pack.sourceQuickSiteCheck.artefactId &&
    normalizeProposalBriefForComparison(memo.proposedWorksSummary) === normalizeProposalBriefForComparison(pack.proposalBrief);
};

export const selectExactSeeArtefactForDetailedPlanningPack = (
  artefacts: WorkspaceArtefact[],
  packArtefact: WorkspaceArtefact | null | undefined,
) => artefacts.reduce<WorkspaceArtefact | undefined>((latest, artefact) => {
  if (artefact.isCurrentSite === false || artefact.type !== "report" || !isSeeExactForDetailedPlanningPack(artefact.preSeeMemo, packArtefact)) return latest;
  if (!latest || compareOutputRecency(artefact, latest, seeTimestampMs) > 0) return artefact;
  return latest;
}, undefined);

export const isReviewRequestExactForDetailedPlanningPack = (
  review: ReviewRequestContent | null | undefined,
  packArtefact: WorkspaceArtefact | null | undefined,
) => {
  const pack = packArtefact?.detailedPlanningPack;
  if (review?.requestType !== "expert_review_request" || !pack || !packArtefact?.id || !review.detailedPlanningPack) return false;
  if (review.detailedPlanningPack.artefactId !== packArtefact.id) return false;
  if (review.detailedPlanningPack.sourceQuickSiteCheckArtefactId !== pack.sourceQuickSiteCheck.artefactId) return false;
  if (review.detailedPlanningPack.commercialReady !== pack.commercialReady) return false;
  if (normalizeProposalBriefForComparison(review.detailedPlanningPack.proposalBrief) !== normalizeProposalBriefForComparison(pack.proposalBrief)) return false;
  if (review.sourceSeeMemo) {
    const sourceDppId = review.sourceSeeMemo.sourceDetailedPlanningPackArtefactId?.trim();
    if (!sourceDppId || sourceDppId !== packArtefact.id) return false;
  }
  return true;
};

export const selectExactReviewRequestArtefactForDetailedPlanningPack = (
  artefacts: WorkspaceArtefact[],
  packArtefact: WorkspaceArtefact | null | undefined,
) => artefacts.reduce<WorkspaceArtefact | undefined>((latest, artefact) => {
  if (artefact.isCurrentSite === false || artefact.type !== "review_request" || !isReviewRequestExactForDetailedPlanningPack(artefact.reviewRequest, packArtefact)) return latest;
  if (!latest || compareOutputRecency(artefact, latest, reviewRequestTimestampMs) > 0) return artefact;
  return latest;
}, undefined);

import { getExactWorkspaceDppBinding } from "./detailed-planning-pack-selector";

type WorkingSeeMemoGateInput = {
  hasConfirmedSite: boolean;
  workingSeeGenerationEnabled: boolean;
  hasProposalBriefMismatch: boolean;
  hasQualityDetailedPlanningPack: boolean;
  sourceDetailedPlanningPackArtefactId?: string;
  expectedProposalBrief?: string;
};

/** UI eligibility only. The server still checks ownership, exact sources and evidence. */
export function getWorkingSeeMemoGate(input: WorkingSeeMemoGateInput) {
  if (!input.hasConfirmedSite) {
    return { allowed: false, reason: "Confirm a site before generating a working SEE." };
  }
  if (input.hasProposalBriefMismatch) {
    return { allowed: false, reason: "Regenerate the Detailed Planning Pack for the current proposed-works brief before generating a working SEE." };
  }
  if (!getExactWorkspaceDppBinding(input)) {
    return { allowed: false, reason: "Enter or restore a proposed-works brief and save its Detailed Planning Pack before generating a working SEE." };
  }
  if (!input.hasQualityDetailedPlanningPack && !input.workingSeeGenerationEnabled) {
    return { allowed: false, reason: "Working-document generation is not enabled for unresolved planning packs in this environment. You can still request expert review." };
  }
  return { allowed: true, reason: null };
}

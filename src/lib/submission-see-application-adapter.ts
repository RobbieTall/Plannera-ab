import type {
  DetailedPlanningPackContent,
  WorkspaceCanonicalSeeCompilation,
  WorkspacePreSeePlanningMemoContent,
} from "@/types/workspace";

import {
  compileSubmissionSeeSections,
  type SubmissionSeeImpactEvidence,
} from "./submission-see-sections";

const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const unique = (values: string[]) =>
  [...new Set(values.map(clean).filter(Boolean))];

const citationId = (citation: { type: "LEP" | "DCP"; ref: string }) =>
  `${citation.type}:${citation.ref}`;

const citedSourceIds = (memo: WorkspacePreSeePlanningMemoContent) =>
  unique(
    memo.consistencyAssessment.flatMap((assessment) =>
      (assessment.citations ?? []).map(citationId),
    ),
  );

const impactEvidence = (
  pack: DetailedPlanningPackContent,
): SubmissionSeeImpactEvidence[] =>
  pack.topicMatrix
    .filter(
      (topic) =>
        topic.status === "Cited" && topic.sourceRefs.length > 0,
    )
    .map((topic) => ({
      topic: topic.topicLabel,
      assessment:
        `${clean(topic.summary)} This assessment is limited to the current cited Detailed Planning Pack evidence for the confirmed project and site.`,
      mitigation:
        `The proposal must retain the design and management response supported by the cited ${clean(topic.topicLabel)} evidence; any unsupported measure must be resolved before lodgement.`,
      residualImpact:
        `Any residual ${clean(topic.topicLabel)} effect remains subject to reconciliation against the final plans, cited controls and operator review.`,
      sourceIds: topic.sourceRefs.map((ref) => `DCP:${ref}`),
    }));

export function compileCanonicalSeeFromPreSee(input: {
  detailedPlanningPackArtefactId: string;
  detailedPlanningPack: DetailedPlanningPackContent;
  preSeeMemo: WorkspacePreSeePlanningMemoContent;
}): WorkspaceCanonicalSeeCompilation {
  const { detailedPlanningPack: pack, preSeeMemo: memo } = input;
  const knownSourceIds = citedSourceIds(memo);
  const sourceIds = unique([
    ...knownSourceIds,
    ...pack.dcpEvidence.flatMap((topic) =>
      topic.citations.map((citation) => `DCP:${citation.ref}`),
    ),
  ]);
  const siteLabel = [
    clean(pack.site.address),
    clean(pack.site.lga ?? pack.site.lgaCode),
    clean(pack.site.zoneLabel ?? pack.site.zoneCode),
  ]
    .filter(Boolean)
    .join(", ");
  const siteNarrative =
    `The confirmed project site is recorded as ${siteLabel || "the persisted site scope"}. ` +
    "The locality, zoning and proposal context are derived from the current saved Quick Site Check and Detailed Planning Pack, and this assessment does not substitute a different address, zone or project.";
  const conclusionNarrative =
    "The current cited evidence supports continued preparation of an approval-oriented Statement of Environmental Effects for the confirmed proposal. Consent should only be requested where the final plans, applicable controls, impact mitigation, specialist evidence and operator review support that conclusion; unresolved matters remain expressly qualified.";

  const result = compileSubmissionSeeSections({
    projectId: pack.projectId,
    detailedPlanningPackArtefactId:
      input.detailedPlanningPackArtefactId,
    detailedPlanningPack: pack,
    preSeeMemo: memo,
    knownSourceIds: sourceIds,
    proposalSourceIds: sourceIds,
    statutorySourceIds: sourceIds,
    siteAndSurrounds: {
      narrative: siteNarrative,
      sourceIds,
    },
    impactAssessments: impactEvidence(pack),
    conclusion: {
      narrative: conclusionNarrative,
      sourceIds,
    },
    limitations: [...memo.limitations],
    generatedAt: memo.generatedAt,
  });

  return {
    standardVersion: "see-builder-standard.v1",
    status: result.status,
    generatedAt: result.draft.generatedAt,
    sourceDetailedPlanningPackArtefactId:
      result.draft.sourceDetailedPlanningPackArtefactId,
    sections: result.draft.sections,
    issues: result.issues,
  };
}

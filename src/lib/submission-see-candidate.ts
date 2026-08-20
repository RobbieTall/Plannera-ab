import type {
  DetailedPlanningPackContent,
  WorkspacePreSeePlanningMemoContent,
  WorkspaceSource,
} from "@/types/workspace";
import type { SpatialProvenance } from "@/lib/spatial-provenance";

import {
  SUBMISSION_SEE_PRICE_AUD,
  assessSubmissionSee,
  type SubmissionSeeAcceptance,
  type SubmissionSeeCandidate,
  type SubmissionSeeOutput,
  type SubmissionSeeSection,
  type SubmissionSeeSource,
  type SubmissionSeeUploadEvidence,
} from "./submission-see-acceptance";

export type SubmissionSeeDraft = {
  kind: "submission_see_draft";
  generatedAt: string;
  sourceDetailedPlanningPackArtefactId: string;
  proposalSummary: string;
  sections: SubmissionSeeSection[];
  limitations: string[];
};

export type PreSeeMemoDraft = {
  kind: "pre_see_planning_memo";
  memo: WorkspacePreSeePlanningMemoContent;
};

export type SubmissionSeeAssemblyIssueCode =
  | "pre_see_source"
  | "dpp_source_mismatch"
  | "unknown_upload_binding"
  | "missing_upload_binding";

export type SubmissionSeeAssemblyIssue = {
  code: SubmissionSeeAssemblyIssueCode;
  detail: string;
};

export type SubmissionSeeUploadBinding = {
  uploadId: string;
  kind: SubmissionSeeUploadEvidence["kind"];
  usedInSections: string[];
};

export type SubmissionSeeCandidateInput = {
  commercialMode: "preview" | "test";
  projectId: string;
  confirmedSiteId: string;
  addressFingerprint: string;
  detailedPlanningPackArtefactId: string;
  detailedPlanningPack: DetailedPlanningPackContent;
  documentDraft: SubmissionSeeDraft | PreSeeMemoDraft;
  spatialProvenance: SpatialProvenance;
  officialSources: Array<
    SubmissionSeeSource & { type: "LEP" | "DCP" | "SPATIAL" }
  >;
  workspaceSources: WorkspaceSource[];
  uploadBindings: SubmissionSeeUploadBinding[];
  currentUploadIds: string[];
  outputs?: SubmissionSeeOutput[];
  operatorReview?: SubmissionSeeCandidate["operatorReview"];
};

export type SubmissionSeeCandidateResult = {
  status: "ready" | "blocked";
  ready: boolean;
  candidate: SubmissionSeeCandidate;
  assemblyIssues: SubmissionSeeAssemblyIssue[];
  acceptance: SubmissionSeeAcceptance;
};

const preSeeSections = (
  memo: WorkspacePreSeePlanningMemoContent,
): SubmissionSeeSection[] =>
  memo.consistencyAssessment.map((assessment, index) => ({
    id: `pre_see_assessment_${index + 1}`,
    title: assessment.topic,
    narrative: assessment.assessment,
    sourceIds: (assessment.citations ?? []).map(
      (citation) => `${citation.type}:${citation.ref}`,
    ),
  }));

const preSeeLimitations = (memo: WorkspacePreSeePlanningMemoContent) => [
  "This candidate is sourced from a pre-SEE planning memo, not a submission SEE draft.",
  ...memo.limitations,
];

const buildUploadEvidence = ({
  workspaceSources,
  uploadBindings,
  currentUploadIds,
  issues,
}: {
  workspaceSources: WorkspaceSource[];
  uploadBindings: SubmissionSeeUploadBinding[];
  currentUploadIds: string[];
  issues: SubmissionSeeAssemblyIssue[];
}) => {
  const sourceById = new Map(workspaceSources.map((source) => [source.id, source]));
  const currentIds = new Set(currentUploadIds);
  const seenBindings = new Set<string>();
  const uploads: SubmissionSeeUploadEvidence[] = [];
  const sources: SubmissionSeeSource[] = [];

  for (const binding of uploadBindings) {
    if (seenBindings.has(binding.uploadId)) {
      issues.push({
        code: "unknown_upload_binding",
        detail: `Upload ${binding.uploadId} has more than one section binding.`,
      });
      continue;
    }
    seenBindings.add(binding.uploadId);

    const source = sourceById.get(binding.uploadId);
    if (!source) {
      issues.push({
        code: "unknown_upload_binding",
        detail: `Upload ${binding.uploadId} does not exist in the workspace source register.`,
      });
      continue;
    }

    uploads.push({
      id: source.id,
      name: source.name,
      kind: binding.kind,
      evidenceStatus: source.evidenceStatus ?? "NEEDS_REVIEW",
      indexingStatus: source.indexingStatus ?? "NOT_APPLICABLE",
      contentHash: source.contentHash ?? null,
      currentForSite: currentIds.has(source.id),
      usedInSections: [...new Set(binding.usedInSections)],
    });
    sources.push({
      id: source.id,
      type: "UPLOAD",
      title: source.name,
      contentHash: source.contentHash ?? null,
      retrievedAt: source.uploadedAt,
    });
  }

  for (const source of workspaceSources) {
    if (
      source.evidenceStatus === "READY" &&
      source.indexingStatus === "READY" &&
      currentIds.has(source.id) &&
      !seenBindings.has(source.id)
    ) {
      issues.push({
        code: "missing_upload_binding",
        detail: `Ready current-site upload ${source.id} is not bound to a SEE section.`,
      });
    }
  }

  return { uploads, sources };
};

export function assembleSubmissionSeeCandidate(
  input: SubmissionSeeCandidateInput,
): SubmissionSeeCandidateResult {
  const assemblyIssues: SubmissionSeeAssemblyIssue[] = [];
  const pack = input.detailedPlanningPack;
  const isPreSee = input.documentDraft.kind === "pre_see_planning_memo";
  const generatedAt = isPreSee
    ? input.documentDraft.memo.generatedAt
    : input.documentDraft.generatedAt;
  const proposalSummary = isPreSee
    ? input.documentDraft.memo.proposedWorksSummary
    : input.documentDraft.proposalSummary;
  const sections = isPreSee
    ? preSeeSections(input.documentDraft.memo)
    : input.documentDraft.sections;
  const limitations = isPreSee
    ? preSeeLimitations(input.documentDraft.memo)
    : input.documentDraft.limitations;
  const draftDppId = isPreSee
    ? input.documentDraft.memo.sourceDetailedPlanningPack?.artefactId ?? ""
    : input.documentDraft.sourceDetailedPlanningPackArtefactId;

  if (isPreSee) {
    assemblyIssues.push({
      code: "pre_see_source",
      detail:
        "The current source is an MVP pre-SEE memo and cannot be promoted into the A$749 product.",
    });
  }
  if (draftDppId !== input.detailedPlanningPackArtefactId) {
    assemblyIssues.push({
      code: "dpp_source_mismatch",
      detail:
        "The document draft does not identify the exact current Detailed Planning Pack artefact.",
    });
  }

  const uploadEvidence = buildUploadEvidence({
    workspaceSources: input.workspaceSources,
    uploadBindings: input.uploadBindings,
    currentUploadIds: input.currentUploadIds,
    issues: assemblyIssues,
  });

  const candidate: SubmissionSeeCandidate = {
    documentType: isPreSee
      ? "pre_see_planning_memo"
      : "statement_of_environmental_effects",
    productCode: isPreSee ? "pre_see_memo" : "submission_see",
    priceAud: isPreSee ? 0 : SUBMISSION_SEE_PRICE_AUD,
    commercialMode: input.commercialMode,
    projectId: input.projectId,
    generatedAt,
    site: {
      label:
        pack.site.address ??
        [pack.site.lgaCode ?? pack.site.lga, pack.site.zoneLabel ?? pack.site.zoneCode]
          .filter(Boolean)
          .join(" / "),
      confirmedSiteId: input.confirmedSiteId,
      addressFingerprint: input.addressFingerprint,
      lgaCode: pack.site.lgaCode ?? pack.site.lga ?? "",
      zoneCode: pack.site.zoneCode ?? "",
      spatialProvenance: {
        status: input.spatialProvenance.status,
        authoritative: input.spatialProvenance.authoritative,
        serviceUrl: input.spatialProvenance.serviceUrl,
        featureIdentifier: input.spatialProvenance.featureIdentifier,
        resolvedAt: input.spatialProvenance.resolvedAt,
        limitations: [...input.spatialProvenance.limitations],
      },
    },
    proposalSummary,
    sourceDetailedPlanningPack: {
      projectId: pack.projectId,
      artefactId: input.detailedPlanningPackArtefactId,
      commercialReady: pack.commercialReady,
      unresolvedTopics: [...pack.unresolvedTopics],
      lgaCode: pack.site.lgaCode ?? pack.site.lga ?? "",
      zoneCode: pack.site.zoneCode ?? "",
      sourceQuickSiteCheckArtefactId: pack.sourceQuickSiteCheck.artefactId,
    },
    sources: [...input.officialSources, ...uploadEvidence.sources],
    sections,
    uploadEvidence: {
      reviewed: uploadEvidence.uploads.length > 0,
      uploads: uploadEvidence.uploads,
    },
    outputs: input.outputs ?? [],
    limitations,
    operatorReview:
      input.operatorReview ??
      ({
        status: "not_reviewed",
        reviewedAt: null,
        checklistVersion: null,
        unresolvedIssues: [],
      } as const),
  };

  const acceptance = assessSubmissionSee(candidate);
  const ready = assemblyIssues.length === 0 && acceptance.ready;
  return {
    status: ready ? "ready" : "blocked",
    ready,
    candidate,
    assemblyIssues,
    acceptance,
  };
}

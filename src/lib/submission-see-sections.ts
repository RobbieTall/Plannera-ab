import type {
  DetailedPlanningPackContent,
  WorkspacePreSeePlanningMemoContent,
} from "@/types/workspace";

import {
  REQUIRED_SUBMISSION_SEE_SECTIONS,
  type SubmissionSeeSection,
} from "./submission-see-acceptance";
import type { SubmissionSeeDraft } from "./submission-see-candidate";

export type SubmissionSeeNarrativeEvidence = {
  narrative: string;
  sourceIds: string[];
};

export type SubmissionSeeImpactEvidence = {
  topic: string;
  assessment: string;
  mitigation: string;
  sourceIds: string[];
};

export type SubmissionSeeSectionCompilerInput = {
  projectId: string;
  detailedPlanningPackArtefactId: string;
  detailedPlanningPack: DetailedPlanningPackContent;
  preSeeMemo: WorkspacePreSeePlanningMemoContent;
  knownSourceIds: string[];
  proposalSourceIds: string[];
  statutorySourceIds: string[];
  siteAndSurrounds: SubmissionSeeNarrativeEvidence;
  impactAssessments: SubmissionSeeImpactEvidence[];
  conclusion: SubmissionSeeNarrativeEvidence;
  limitations: string[];
  generatedAt: string;
};

export type SubmissionSeeSectionCompilerIssueCode =
  | "project_mismatch"
  | "dpp_mismatch"
  | "site_mismatch"
  | "unready_dpp"
  | "invalid_generation_time"
  | "unknown_source"
  | "weak_site_assessment"
  | "weak_proposal"
  | "weak_statutory_assessment"
  | "uncited_planning_control"
  | "weak_planning_controls"
  | "missing_impact_assessment"
  | "weak_impact_assessment"
  | "weak_mitigation"
  | "weak_conclusion"
  | "incomplete_section_set";

export type SubmissionSeeSectionCompilerIssue = {
  code: SubmissionSeeSectionCompilerIssueCode;
  detail: string;
};

export type SubmissionSeeSectionCompilerResult = {
  status: "ready" | "blocked";
  ready: boolean;
  draft: SubmissionSeeDraft;
  issues: SubmissionSeeSectionCompilerIssue[];
};

const MIN_NARRATIVE_LENGTH = 80;
const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();
const normalise = (value: string | null | undefined) =>
  clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const validTime = (value: string) => Number.isFinite(Date.parse(value));

const unique = (values: string[]) => [...new Set(values.map(clean).filter(Boolean))];

const pushIssue = (
  issues: SubmissionSeeSectionCompilerIssue[],
  code: SubmissionSeeSectionCompilerIssueCode,
  detail: string,
) => {
  if (!issues.some((issue) => issue.code === code && issue.detail === detail)) {
    issues.push({ code, detail });
  }
};

const evidenceSourceIds = (
  sourceIds: string[],
  knownSourceIds: Set<string>,
  issues: SubmissionSeeSectionCompilerIssue[],
  context: string,
) => {
  const ids = unique(sourceIds);
  const unknown = ids.filter((sourceId) => !knownSourceIds.has(sourceId));
  if (unknown.length > 0) {
    pushIssue(
      issues,
      "unknown_source",
      `${context} references source IDs that are not in the candidate evidence register.`,
    );
  }
  return ids.filter((sourceId) => knownSourceIds.has(sourceId));
};

const addSection = ({
  sections,
  issues,
  id,
  title,
  narrative,
  sourceIds,
  weakCode,
  weakDetail,
}: {
  sections: SubmissionSeeSection[];
  issues: SubmissionSeeSectionCompilerIssue[];
  id: string;
  title: string;
  narrative: string;
  sourceIds: string[];
  weakCode: SubmissionSeeSectionCompilerIssueCode;
  weakDetail: string;
}) => {
  const text = clean(narrative);
  if (text.length < MIN_NARRATIVE_LENGTH || sourceIds.length === 0) {
    pushIssue(issues, weakCode, weakDetail);
    return;
  }
  sections.push({ id, title, narrative: text, sourceIds });
};

const exactSiteMatch = (
  pack: DetailedPlanningPackContent,
  memo: WorkspacePreSeePlanningMemoContent,
) => {
  const packLga = normalise(pack.site.lga ?? pack.site.lgaCode);
  const memoLga = normalise(memo.siteDescription.lga);
  const packZone = normalise(pack.site.zoneCode ?? pack.site.zoneLabel);
  const memoZone = normalise(
    memo.siteDescription.zoneCode ?? memo.siteDescription.zoneLabel,
  );
  const packAddress = normalise(pack.site.address);
  const memoAddress = normalise(memo.siteDescription.address);

  return (
    Boolean(packLga && memoLga && packLga === memoLga) &&
    Boolean(packZone && memoZone && packZone === memoZone) &&
    (!packAddress || !memoAddress || packAddress === memoAddress)
  );
};

export function compileSubmissionSeeSections(
  input: SubmissionSeeSectionCompilerInput,
): SubmissionSeeSectionCompilerResult {
  const issues: SubmissionSeeSectionCompilerIssue[] = [];
  const pack = input.detailedPlanningPack;
  const memo = input.preSeeMemo;
  const knownSourceIds = new Set(unique(input.knownSourceIds));

  if (
    !clean(input.projectId) ||
    pack.projectId !== input.projectId ||
    memo.projectId !== input.projectId
  ) {
    pushIssue(
      issues,
      "project_mismatch",
      "The project, Detailed Planning Pack and pre-SEE evidence memo must share one exact project ID.",
    );
  }

  if (
    !clean(input.detailedPlanningPackArtefactId) ||
    memo.sourceDetailedPlanningPack?.artefactId !==
      input.detailedPlanningPackArtefactId ||
    memo.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId !==
      pack.sourceQuickSiteCheck.artefactId
  ) {
    pushIssue(
      issues,
      "dpp_mismatch",
      "The evidence memo must identify the exact current DPP and Quick Site Check chain.",
    );
  }

  if (!exactSiteMatch(pack, memo)) {
    pushIssue(
      issues,
      "site_mismatch",
      "The DPP and evidence memo do not describe the same council, zone and confirmed address scope.",
    );
  }

  if (
    pack.commercialReady !== true ||
    pack.unresolvedTopics.length > 0 ||
    memo.sourceDetailedPlanningPack?.commercialReady !== true
  ) {
    pushIssue(
      issues,
      "unready_dpp",
      "Section compilation requires a commercially ready DPP with no unresolved topics.",
    );
  }

  if (!validTime(input.generatedAt)) {
    pushIssue(
      issues,
      "invalid_generation_time",
      "A valid section-compilation timestamp is required.",
    );
  }

  const siteSourceIds = evidenceSourceIds(
    input.siteAndSurrounds.sourceIds,
    knownSourceIds,
    issues,
    "Site and surrounds",
  );
  const proposalSourceIds = evidenceSourceIds(
    input.proposalSourceIds,
    knownSourceIds,
    issues,
    "Proposed development",
  );
  const statutorySourceIds = evidenceSourceIds(
    input.statutorySourceIds,
    knownSourceIds,
    issues,
    "Statutory planning framework",
  );
  const conclusionSourceIds = evidenceSourceIds(
    input.conclusion.sourceIds,
    knownSourceIds,
    issues,
    "Conclusion",
  );

  const controlSourceIds: string[] = [];
  const controlNarratives: string[] = [];
  for (const assessment of memo.consistencyAssessment) {
    const mapped = evidenceSourceIds(
      (assessment.citations ?? []).map(
        (citation) => `${citation.type}:${citation.ref}`,
      ),
      knownSourceIds,
      issues,
      `Planning control ${assessment.topic}`,
    );
    if (mapped.length === 0) {
      pushIssue(
        issues,
        "uncited_planning_control",
        `Planning control ${assessment.topic} has no registered source citation.`,
      );
      continue;
    }
    controlSourceIds.push(...mapped);
    if (clean(assessment.assessment).length >= 20) {
      controlNarratives.push(
        `${clean(assessment.topic)}: ${clean(assessment.assessment)}`,
      );
    }
  }

  const validImpacts = input.impactAssessments
    .map((impact) => ({
      ...impact,
      topic: clean(impact.topic),
      assessment: clean(impact.assessment),
      mitigation: clean(impact.mitigation),
      validSourceIds: evidenceSourceIds(
        impact.sourceIds,
        knownSourceIds,
        issues,
        `Impact assessment ${impact.topic}`,
      ),
    }))
    .filter((impact) => {
      const valid =
        impact.topic.length > 0 &&
        impact.assessment.length >= 40 &&
        impact.mitigation.length >= 40 &&
        impact.validSourceIds.length > 0;
      if (!valid) {
        pushIssue(
          issues,
          "weak_impact_assessment",
          `Impact assessment ${impact.topic || "unknown"} is incomplete or uncited.`,
        );
      }
      return valid;
    });

  if (validImpacts.length === 0) {
    pushIssue(
      issues,
      "missing_impact_assessment",
      "At least one complete, cited environmental impact assessment is required.",
    );
  }

  const proposal = clean(pack.proposalBrief || memo.proposedWorksSummary);
  const instrument = clean(memo.applicableControls.lepInstrument?.name);
  const permissibility = clean(
    memo.applicableControls.permissibility?.interpretation ??
      memo.applicableControls.permissibility?.status,
  );
  const statutoryNarrative = [
    instrument
      ? `The applicable local environmental planning instrument recorded for the confirmed site is ${instrument}.`
      : "",
    permissibility
      ? `The recorded land-use permissibility assessment is: ${permissibility}`
      : "",
    `This section is bound to the current cited Quick Site Check and Detailed Planning Pack for project ${input.projectId}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const planningNarrative = controlNarratives.join(" ");
  const impactsNarrative = validImpacts
    .map((impact) => `${impact.topic}: ${impact.assessment}`)
    .join(" ");
  const mitigationNarrative = validImpacts
    .map((impact) => `${impact.topic}: ${impact.mitigation}`)
    .join(" ");
  const impactSourceIds = unique(
    validImpacts.flatMap((impact) => impact.validSourceIds),
  );

  const executiveNarrative = [
    `This Statement of Environmental Effects assesses the proposal for the confirmed ${clean(pack.site.lga ?? pack.site.lgaCode)} site in ${clean(pack.site.zoneLabel ?? pack.site.zoneCode)}.`,
    proposal,
    clean(input.conclusion.narrative),
  ].join(" ");

  const sections: SubmissionSeeSection[] = [];
  addSection({
    sections,
    issues,
    id: "executive_summary",
    title: "Executive summary",
    narrative: executiveNarrative,
    sourceIds: unique([...proposalSourceIds, ...conclusionSourceIds]),
    weakCode: "weak_conclusion",
    weakDetail:
      "The executive summary cannot be compiled without substantive proposal and conclusion evidence.",
  });
  addSection({
    sections,
    issues,
    id: "site_and_surrounds",
    title: "Site and surrounds",
    narrative: input.siteAndSurrounds.narrative,
    sourceIds: siteSourceIds,
    weakCode: "weak_site_assessment",
    weakDetail:
      "The site and surrounds assessment must be substantive and cite registered evidence.",
  });
  addSection({
    sections,
    issues,
    id: "proposed_development",
    title: "Proposed development",
    narrative: proposal,
    sourceIds: proposalSourceIds,
    weakCode: "weak_proposal",
    weakDetail:
      "The proposed development description must be substantive and cite registered evidence.",
  });
  addSection({
    sections,
    issues,
    id: "statutory_planning_framework",
    title: "Statutory planning framework",
    narrative: statutoryNarrative,
    sourceIds: statutorySourceIds,
    weakCode: "weak_statutory_assessment",
    weakDetail:
      "The statutory assessment requires a current instrument, permissibility evidence and registered citations.",
  });
  addSection({
    sections,
    issues,
    id: "planning_controls_assessment",
    title: "Planning controls assessment",
    narrative: planningNarrative,
    sourceIds: unique(controlSourceIds),
    weakCode: "weak_planning_controls",
    weakDetail:
      "The planning controls assessment requires substantive, individually cited control findings.",
  });
  addSection({
    sections,
    issues,
    id: "environmental_impacts",
    title: "Environmental impacts",
    narrative: impactsNarrative,
    sourceIds: impactSourceIds,
    weakCode: "weak_impact_assessment",
    weakDetail:
      "The environmental impacts section requires substantive, cited impact assessments.",
  });
  addSection({
    sections,
    issues,
    id: "mitigation_measures",
    title: "Mitigation measures",
    narrative: mitigationNarrative,
    sourceIds: impactSourceIds,
    weakCode: "weak_mitigation",
    weakDetail:
      "The mitigation section requires substantive, cited measures tied to assessed impacts.",
  });
  addSection({
    sections,
    issues,
    id: "conclusion",
    title: "Conclusion",
    narrative: input.conclusion.narrative,
    sourceIds: conclusionSourceIds,
    weakCode: "weak_conclusion",
    weakDetail:
      "The conclusion must be substantive and cite the evidence supporting its findings.",
  });

  const compiledIds = new Set(sections.map((section) => section.id));
  const missing = REQUIRED_SUBMISSION_SEE_SECTIONS.filter(
    (sectionId) => !compiledIds.has(sectionId),
  );
  if (missing.length > 0) {
    pushIssue(
      issues,
      "incomplete_section_set",
      `Submission draft is missing required sections: ${missing.join(", ")}.`,
    );
  }

  const draft: SubmissionSeeDraft = {
    kind: "submission_see_draft",
    generatedAt: input.generatedAt,
    sourceDetailedPlanningPackArtefactId:
      input.detailedPlanningPackArtefactId,
    proposalSummary: proposal,
    sections,
    limitations: [...input.limitations],
  };

  return {
    status: issues.length === 0 ? "ready" : "blocked",
    ready: issues.length === 0,
    draft,
    issues,
  };
}

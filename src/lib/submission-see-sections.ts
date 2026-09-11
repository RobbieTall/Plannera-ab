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
  residualImpact?: string;
  sourceIds: string[];
};

export type SubmissionSeeVariationEvidence = {
  controlRef: string;
  kind: "lep_development_standard" | "dcp_departure" | "performance_outcome";
  requirement: string;
  proposedOutcome: string;
  quantifiedDeparture: string;
  objectives: string;
  siteSpecificMerit: string;
  environmentalEffects: string;
  mitigation: string;
  separateRequestRequired: boolean;
  sourceIds: string[];
};

export type SubmissionSeeSpecialistReportEvidence = {
  title: string;
  sourceId: string;
  siteMatched: boolean;
  proposalRevisionMatched: boolean;
  pageReferences: string[];
  findings: string;
  recommendations: string;
  limitations: string[];
  conflicts: string[];
};

export type SubmissionSeeAppendixEvidence = {
  title: string;
  description: string;
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
  applicationHistory?: SubmissionSeeNarrativeEvidence | null;
  assessmentPathway?: SubmissionSeeNarrativeEvidence | null;
  variations?: SubmissionSeeVariationEvidence[];
  specialistReports?: SubmissionSeeSpecialistReportEvidence[];
  appendices?: SubmissionSeeAppendixEvidence[];
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
  | "weak_section_4_15"
  | "weak_optional_section"
  | "missing_variation_assessment"
  | "invalid_variation"
  | "specialist_scope_mismatch"
  | "invalid_specialist_report"
  | "specialist_conflict"
  | "invalid_appendix"
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
      residualImpact: clean(impact.residualImpact),
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

  const specialistNarratives: string[] = [];
  const specialistSourceIds: string[] = [];
  for (const report of input.specialistReports ?? []) {
    const sourceIds = evidenceSourceIds(
      [report.sourceId],
      knownSourceIds,
      issues,
      `Specialist report ${report.title}`,
    );
    if (!report.siteMatched || !report.proposalRevisionMatched) {
      pushIssue(
        issues,
        "specialist_scope_mismatch",
        `Specialist report ${report.title || "unknown"} is not bound to the exact site and proposal revision.`,
      );
      continue;
    }
    if (
      clean(report.title).length < 3 ||
      clean(report.findings).length < 40 ||
      clean(report.recommendations).length < 20 ||
      report.pageReferences.map(clean).filter(Boolean).length === 0 ||
      sourceIds.length === 0
    ) {
      pushIssue(
        issues,
        "invalid_specialist_report",
        `Specialist report ${report.title || "unknown"} lacks attributable findings, recommendations or page references.`,
      );
      continue;
    }
    if (report.conflicts.map(clean).filter(Boolean).length > 0) {
      pushIssue(
        issues,
        "specialist_conflict",
        `Specialist report ${report.title} contains an unresolved conflict that must remain visible.`,
      );
    }
    specialistSourceIds.push(...sourceIds);
    specialistNarratives.push(
      [
        `${clean(report.title)} (${report.pageReferences.map(clean).filter(Boolean).join(", ")}): ${clean(report.findings)}`,
        `Recommendations: ${clean(report.recommendations)}`,
        report.limitations.map(clean).filter(Boolean).length
          ? `Limitations: ${report.limitations.map(clean).filter(Boolean).join("; ")}`
          : "",
        report.conflicts.map(clean).filter(Boolean).length
          ? `Unresolved conflicts: ${report.conflicts.map(clean).filter(Boolean).join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const variationNarratives: string[] = [];
  const variationSourceIds: string[] = [];
  const variationTrigger = memo.consistencyAssessment.some((assessment) =>
    /\b(?:non[- ]?compl(?:iance|iant)|variation|departure|exceed(?:s|ed|ance)?|clause\s*4\.6)\b/i.test(
      `${assessment.topic} ${assessment.assessment}`,
    ),
  );
  if (variationTrigger && (input.variations ?? []).length === 0) {
    pushIssue(
      issues,
      "missing_variation_assessment",
      "The evidence identifies a potential departure but no dedicated variation and merit assessment was supplied.",
    );
  }
  for (const variation of input.variations ?? []) {
    const sourceIds = evidenceSourceIds(
      variation.sourceIds,
      knownSourceIds,
      issues,
      `Variation ${variation.controlRef}`,
    );
    const valid =
      clean(variation.controlRef).length > 0 &&
      clean(variation.requirement).length >= 20 &&
      clean(variation.proposedOutcome).length >= 20 &&
      clean(variation.quantifiedDeparture).length > 0 &&
      clean(variation.objectives).length >= 40 &&
      clean(variation.siteSpecificMerit).length >= 40 &&
      clean(variation.environmentalEffects).length >= 40 &&
      clean(variation.mitigation).length >= 20 &&
      sourceIds.length > 0 &&
      (variation.kind !== "lep_development_standard" ||
        variation.separateRequestRequired);
    if (!valid) {
      pushIssue(
        issues,
        "invalid_variation",
        `Variation ${variation.controlRef || "unknown"} is incomplete, uncited or does not identify the required separate LEP variation request.`,
      );
      continue;
    }
    variationSourceIds.push(...sourceIds);
    variationNarratives.push(
      [
        `${clean(variation.controlRef)} is assessed as a ${variation.kind.replaceAll("_", " ")}.`,
        `Requirement: ${clean(variation.requirement)}`,
        `Proposal and quantified departure: ${clean(variation.proposedOutcome)}; ${clean(variation.quantifiedDeparture)}.`,
        `Objectives: ${clean(variation.objectives)}`,
        `Site-specific merit: ${clean(variation.siteSpecificMerit)}`,
        `Environmental effects: ${clean(variation.environmentalEffects)}`,
        `Mitigation: ${clean(variation.mitigation)}`,
        variation.kind === "lep_development_standard"
          ? "A separate clause 4.6 or other required formal variation request must accompany the SEE; this assessment does not replace it."
          : "",
      ]
        .filter(Boolean)
        .join(" "),
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
  const impactSourceIds = unique([
    ...validImpacts.flatMap((impact) => impact.validSourceIds),
    ...specialistSourceIds,
  ]);
  const impactsNarrative = [
    ...validImpacts.map((impact) =>
      [
        `${impact.topic}: ${impact.assessment}`,
        `Mitigation: ${impact.mitigation}`,
        impact.residualImpact
          ? `Residual impact: ${impact.residualImpact}`
          : "Residual impact must remain qualified to the cited evidence and confirmed before lodgement.",
      ].join(" "),
    ),
    ...specialistNarratives,
  ].join(" ");

  const executiveNarrative = [
    `This Statement of Environmental Effects assesses the proposal for the confirmed ${clean(pack.site.lga ?? pack.site.lgaCode)} site in ${clean(pack.site.zoneLabel ?? pack.site.zoneCode)}.`,
    proposal,
    clean(input.conclusion.narrative),
  ].join(" ");

  const section415Narrative = [
    "The applicable environmental planning instruments and development control provisions are assessed in the preceding statutory and controls sections.",
    `The likely natural, built, social and economic impacts identified for this proposal are: ${validImpacts.map((impact) => impact.topic).join(", ") || "not yet supported by complete evidence"}.`,
    "Site suitability is considered against the confirmed site, locality, zoning and cited evidence; unsupported matters remain expressly qualified.",
    variationNarratives.length
      ? "The identified departure is addressed on its planning merits and remains subject to any separate formal variation request required by law."
      : "No material departure is asserted beyond the registered evidence.",
    `Public-interest and approval conclusions remain bounded by the cited evidence and operator review. ${clean(input.conclusion.narrative)}`,
  ].join(" ");

  const sections: SubmissionSeeSection[] = [];
  addSection({
    sections,
    issues,
    id: "executive_summary",
    title: "Executive Summary",
    narrative: executiveNarrative,
    sourceIds: unique([...proposalSourceIds, ...conclusionSourceIds]),
    weakCode: "weak_conclusion",
    weakDetail:
      "The executive summary cannot be compiled without substantive proposal and conclusion evidence.",
  });
  addSection({
    sections,
    issues,
    id: "proposed_development",
    title: "Development Proposal",
    narrative: proposal,
    sourceIds: proposalSourceIds,
    weakCode: "weak_proposal",
    weakDetail:
      "The development proposal must be substantive and cite registered evidence.",
  });
  addSection({
    sections,
    issues,
    id: "site_and_surrounds",
    title: "Site, Locality and Planning Context",
    narrative: input.siteAndSurrounds.narrative,
    sourceIds: siteSourceIds,
    weakCode: "weak_site_assessment",
    weakDetail:
      "The site, locality and planning-context assessment must be substantive and cite registered evidence.",
  });
  if (input.applicationHistory) {
    addSection({
      sections,
      issues,
      id: "application_history",
      title: "Existing Approvals and Application History",
      narrative: input.applicationHistory.narrative,
      sourceIds: evidenceSourceIds(
        input.applicationHistory.sourceIds,
        knownSourceIds,
        issues,
        "Application history",
      ),
      weakCode: "weak_optional_section",
      weakDetail:
        "Application history was requested but is incomplete or uncited.",
    });
  }
  if (input.assessmentPathway) {
    addSection({
      sections,
      issues,
      id: "assessment_pathway_referrals",
      title: "Assessment Pathway, Referrals and Other Approvals",
      narrative: input.assessmentPathway.narrative,
      sourceIds: evidenceSourceIds(
        input.assessmentPathway.sourceIds,
        knownSourceIds,
        issues,
        "Assessment pathway and referrals",
      ),
      weakCode: "weak_optional_section",
      weakDetail:
        "Assessment pathway or referral evidence was requested but is incomplete or uncited.",
    });
  }
  addSection({
    sections,
    issues,
    id: "statutory_planning_framework",
    title: "Statutory Planning Assessment",
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
    title: "Planning Controls Assessment",
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
    title: "Environmental Effects and Impact Assessment",
    narrative: impactsNarrative,
    sourceIds: impactSourceIds,
    weakCode: "weak_impact_assessment",
    weakDetail:
      "The environmental effects section requires substantive, cited impact, mitigation and residual-impact reasoning.",
  });
  if (variationNarratives.length > 0) {
    addSection({
      sections,
      issues,
      id: "variations_and_merit",
      title: "Variations, Departures and Merit Justification",
      narrative: variationNarratives.join(" "),
      sourceIds: unique(variationSourceIds),
      weakCode: "invalid_variation",
      weakDetail:
        "The variation and merit section is incomplete or uncited.",
    });
  }
  addSection({
    sections,
    issues,
    id: "section_4_15_evaluation",
    title: "Section 4.15 Evaluation",
    narrative: section415Narrative,
    sourceIds: unique([
      ...statutorySourceIds,
      ...siteSourceIds,
      ...impactSourceIds,
      ...variationSourceIds,
      ...conclusionSourceIds,
    ]),
    weakCode: "weak_section_4_15",
    weakDetail:
      "The section 4.15 synthesis requires substantive cited statutory, impact, site-suitability and public-interest reasoning.",
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
      "The conclusion must be substantive and cite the evidence supporting its approval recommendation.",
  });
  if ((input.appendices ?? []).length > 0) {
    const appendixNarratives: string[] = [];
    const appendixSourceIds: string[] = [];
    for (const appendix of input.appendices ?? []) {
      const sourceIds = evidenceSourceIds(
        appendix.sourceIds,
        knownSourceIds,
        issues,
        `Appendix ${appendix.title}`,
      );
      if (
        clean(appendix.title).length < 3 ||
        clean(appendix.description).length < 20 ||
        sourceIds.length === 0
      ) {
        pushIssue(
          issues,
          "invalid_appendix",
          `Appendix ${appendix.title || "unknown"} is incomplete or uncited.`,
        );
        continue;
      }
      appendixNarratives.push(
        `${clean(appendix.title)}: ${clean(appendix.description)}`,
      );
      appendixSourceIds.push(...sourceIds);
    }
    if (appendixNarratives.length > 0) {
      addSection({
        sections,
        issues,
        id: "appendices_supporting_evidence",
        title: "Appendices and Supporting Evidence",
        narrative: appendixNarratives.join(" "),
        sourceIds: unique(appendixSourceIds),
        weakCode: "invalid_appendix",
        weakDetail:
          "The appendices schedule is incomplete or uncited.",
      });
    }
  }

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
    standardVersion: "see-builder-standard.v1",
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

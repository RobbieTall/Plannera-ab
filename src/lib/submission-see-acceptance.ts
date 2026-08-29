import type { WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

export const SUBMISSION_SEE_PRICE_AUD = 749;

export const REQUIRED_SUBMISSION_SEE_SECTIONS = [
  "executive_summary",
  "site_and_surrounds",
  "proposed_development",
  "statutory_planning_framework",
  "planning_controls_assessment",
  "environmental_impacts",
  "mitigation_measures",
  "conclusion",
] as const;

export type SubmissionSeeSectionId =
  (typeof REQUIRED_SUBMISSION_SEE_SECTIONS)[number];

export type SubmissionSeeSourceType = "LEP" | "DCP" | "UPLOAD" | "SPATIAL";

export type SubmissionSeeSource = {
  id: string;
  type: SubmissionSeeSourceType;
  title: string;
  officialUrl?: string | null;
  contentHash?: string | null;
  retrievedAt: string;
};

export type SubmissionSeeSection = {
  id: SubmissionSeeSectionId | string;
  title: string;
  narrative: string;
  sourceIds: string[];
};

export type SubmissionSeeUploadEvidence = {
  id: string;
  name: string;
  kind: "site_plan" | "proposal_plan" | "specialist_report" | "photograph" | "other";
  evidenceStatus: "READY" | "PARTIALLY_READABLE" | "IMAGE_ONLY" | "NEEDS_REVIEW";
  indexingStatus: "READY" | "PENDING" | "FAILED" | "NOT_APPLICABLE";
  contentHash: string | null;
  currentForSite: boolean;
  usedInSections: string[];
};

export type SubmissionSeeOutput = {
  format: "DOCX" | "PDF";
  mimeType:
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "application/pdf";
  fileName: string;
  contentHash: string;
  byteLength: number;
  generatedAt: string;
};

export type SubmissionSeeCandidate = {
  documentType: "statement_of_environmental_effects" | string;
  productCode: "submission_see" | string;
  priceAud: number;
  commercialMode: "preview" | "test" | "production";
  projectId: string;
  generatedAt: string;
  site: {
    label: string;
    confirmedSiteId: string;
    addressFingerprint: string;
    lgaCode: string;
    zoneCode: string;
    spatialProvenance: {
      status: "verified" | "partial" | "unresolved";
      authoritative: boolean;
      serviceUrl: string | null;
      featureIdentifier: string | null;
      resolvedAt: string | null;
      limitations: string[];
    };
  };
  proposalSummary: string;
  sourceDetailedPlanningPack: {
    projectId: string;
    artefactId: string;
    commercialReady: boolean;
    unresolvedTopics: string[];
    lgaCode: string;
    zoneCode: string;
    sourceQuickSiteCheckArtefactId: string;
  };
  sources: SubmissionSeeSource[];
  sections: SubmissionSeeSection[];
  uploadEvidence: {
    reviewed: boolean;
    uploads: SubmissionSeeUploadEvidence[];
  };
  outputs: SubmissionSeeOutput[];
  limitations: string[];
  operatorReview: {
    status: "approved" | "changes_required" | "not_reviewed";
    reviewedAt: string | null;
    checklistVersion: string | null;
    unresolvedIssues: string[];
  };
};

export type SubmissionSeeIssueCode =
  | "wrong_document_type"
  | "wrong_product"
  | "wrong_price"
  | "unsafe_commercial_mode"
  | "invalid_project"
  | "invalid_generation_time"
  | "unsupported_lga"
  | "missing_site"
  | "missing_zone"
  | "unverified_spatial_provenance"
  | "broken_dpp_chain"
  | "unready_dpp"
  | "proposal_too_short"
  | "missing_source_type"
  | "invalid_source"
  | "missing_section"
  | "duplicate_section"
  | "weak_section"
  | "uncited_section"
  | "unknown_citation"
  | "unready_upload_evidence"
  | "missing_output"
  | "invalid_output"
  | "declared_non_final"
  | "operator_review_incomplete";

export type SubmissionSeeIssue = {
  code: SubmissionSeeIssueCode;
  detail: string;
};

export type SubmissionSeeAcceptance = {
  status: "ready" | "blocked";
  ready: boolean;
  issues: SubmissionSeeIssue[];
  evidence: {
    requiredSections: number;
    acceptedSections: number;
    citedSources: number;
    readyUploads: number;
    outputFormats: Array<"DOCX" | "PDF">;
  };
};

const SHA256 = /^[a-f0-9]{64}$/;
const OFFICIAL_HTTPS = /^https:\/\//i;
const SUPPORTED_LGAS = new Set(["BYRON", "KEMPSEY"]);

const clean = (value: string | null | undefined) => (value ?? "").trim();
const normaliseCode = (value: string | null | undefined) =>
  clean(value).toUpperCase().replace(/\s+/g, "_");
const validTime = (value: string | null | undefined) =>
  Boolean(value && Number.isFinite(Date.parse(value)));
const validHash = (value: string | null | undefined) =>
  Boolean(value && SHA256.test(value));
const pushIssue = (
  issues: SubmissionSeeIssue[],
  code: SubmissionSeeIssueCode,
  detail: string,
) => {
  if (!issues.some((issue) => issue.code === code && issue.detail === detail)) {
    issues.push({ code, detail });
  }
};

const validSource = (source: SubmissionSeeSource) => {
  if (!clean(source.id) || !clean(source.title) || !validTime(source.retrievedAt)) {
    return false;
  }
  if (source.type === "UPLOAD") return validHash(source.contentHash);
  return Boolean(source.officialUrl && OFFICIAL_HTTPS.test(source.officialUrl));
};

const validOutput = (output: SubmissionSeeOutput) => {
  const expectedMime =
    output.format === "DOCX"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
  const expectedExtension = output.format === "DOCX" ? ".docx" : ".pdf";
  return (
    output.mimeType === expectedMime &&
    output.fileName.toLowerCase().endsWith(expectedExtension) &&
    validHash(output.contentHash) &&
    Number.isInteger(output.byteLength) &&
    output.byteLength > 0 &&
    validTime(output.generatedAt)
  );
};

export function assessSubmissionSee(
  candidate: SubmissionSeeCandidate,
): SubmissionSeeAcceptance {
  const issues: SubmissionSeeIssue[] = [];

  if (candidate.documentType !== "statement_of_environmental_effects") {
    pushIssue(issues, "wrong_document_type", "The artefact is not a Statement of Environmental Effects.");
  }
  if (candidate.productCode !== "submission_see") {
    pushIssue(issues, "wrong_product", "The artefact is not bound to the submission SEE product.");
  }
  if (candidate.priceAud !== SUBMISSION_SEE_PRICE_AUD) {
    pushIssue(issues, "wrong_price", "The submission SEE price must be exactly A$749.");
  }
  if (candidate.commercialMode === "production") {
    pushIssue(issues, "unsafe_commercial_mode", "Production commercial execution is not permitted by this acceptance gate.");
  }

  const projectId = clean(candidate.projectId);
  if (!projectId) pushIssue(issues, "invalid_project", "A project identifier is required.");
  if (!validTime(candidate.generatedAt)) {
    pushIssue(issues, "invalid_generation_time", "A valid generation timestamp is required.");
  }

  const lgaCode = normaliseCode(candidate.site.lgaCode);
  const zoneCode = normaliseCode(candidate.site.zoneCode);
  if (!SUPPORTED_LGAS.has(lgaCode)) {
    pushIssue(issues, "unsupported_lga", "Submission SEE acceptance is currently limited to Byron and Kempsey.");
  }
  if (
    !clean(candidate.site.label) ||
    !clean(candidate.site.confirmedSiteId) ||
    !validHash(candidate.site.addressFingerprint)
  ) {
    pushIssue(
      issues,
      "missing_site",
      "A confirmed site ID and SHA-256 address fingerprint are required.",
    );
  }
  if (!zoneCode) pushIssue(issues, "missing_zone", "A confirmed planning zone is required.");

  const spatial = candidate.site.spatialProvenance;
  if (
    spatial.status !== "verified" ||
    spatial.authoritative !== true ||
    !spatial.serviceUrl ||
    !OFFICIAL_HTTPS.test(spatial.serviceUrl) ||
    !clean(spatial.featureIdentifier) ||
    !validTime(spatial.resolvedAt) ||
    spatial.limitations.length > 0
  ) {
    pushIssue(issues, "unverified_spatial_provenance", "Current authoritative spatial provenance is required.");
  }

  const dpp = candidate.sourceDetailedPlanningPack;
  if (
    !projectId ||
    dpp.projectId !== projectId ||
    !clean(dpp.artefactId) ||
    !clean(dpp.sourceQuickSiteCheckArtefactId) ||
    normaliseCode(dpp.lgaCode) !== lgaCode ||
    normaliseCode(dpp.zoneCode) !== zoneCode
  ) {
    pushIssue(issues, "broken_dpp_chain", "The SEE must match the current project, site, DPP, and Quick Site Check chain.");
  }
  if (dpp.commercialReady !== true || dpp.unresolvedTopics.length > 0) {
    pushIssue(issues, "unready_dpp", "The source Detailed Planning Pack must be commercially ready with no unresolved topics.");
  }

  if (clean(candidate.proposalSummary).length < 80) {
    pushIssue(issues, "proposal_too_short", "The proposal summary is not detailed enough for submission assessment.");
  }

  const sourceIds = new Set<string>();
  const sourceTypes = new Set<SubmissionSeeSourceType>();
  for (const source of candidate.sources) {
    if (!validSource(source) || sourceIds.has(source.id)) {
      pushIssue(issues, "invalid_source", "Every source must be unique, current, attributable, and HTTPS or hash backed.");
      continue;
    }
    sourceIds.add(source.id);
    sourceTypes.add(source.type);
  }
  for (const requiredType of ["LEP", "DCP", "SPATIAL"] as const) {
    if (!sourceTypes.has(requiredType)) {
      pushIssue(issues, "missing_source_type", `A ${requiredType} source is required.`);
    }
  }

  const sectionIds = new Set<string>();
  let acceptedSections = 0;
  for (const section of candidate.sections) {
    if (sectionIds.has(section.id)) {
      pushIssue(issues, "duplicate_section", `Section ${section.id} is duplicated.`);
      continue;
    }
    sectionIds.add(section.id);
    if (clean(section.title).length < 3 || clean(section.narrative).length < 80) {
      pushIssue(issues, "weak_section", `Section ${section.id} is incomplete.`);
      continue;
    }
    if (section.sourceIds.length === 0) {
      pushIssue(issues, "uncited_section", `Section ${section.id} has no evidence citation.`);
      continue;
    }
    if (section.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
      pushIssue(issues, "unknown_citation", `Section ${section.id} cites an unknown source.`);
      continue;
    }
    acceptedSections += 1;
  }
  for (const required of REQUIRED_SUBMISSION_SEE_SECTIONS) {
    if (!sectionIds.has(required)) {
      pushIssue(issues, "missing_section", `Required section ${required} is missing.`);
    }
  }

  let readyUploads = 0;
  if (!candidate.uploadEvidence.reviewed || candidate.uploadEvidence.uploads.length === 0) {
    pushIssue(issues, "unready_upload_evidence", "Evidence-aware upload review is required.");
  }
  for (const upload of candidate.uploadEvidence.uploads) {
    const ready =
      clean(upload.id) &&
      clean(upload.name) &&
      upload.evidenceStatus === "READY" &&
      upload.indexingStatus === "READY" &&
      validHash(upload.contentHash) &&
      upload.currentForSite === true &&
      upload.usedInSections.length > 0 &&
      upload.usedInSections.every((sectionId) => sectionIds.has(sectionId)) &&
      candidate.sources.some(
        (source) =>
          source.type === "UPLOAD" &&
          source.id === upload.id &&
          source.contentHash === upload.contentHash,
      );
    if (ready) readyUploads += 1;
    else pushIssue(issues, "unready_upload_evidence", `Upload ${upload.id || "unknown"} is not submission ready.`);
  }

  const outputFormats = new Set<"DOCX" | "PDF">();
  for (const output of candidate.outputs) {
    if (!validOutput(output)) {
      pushIssue(issues, "invalid_output", `${output.format} output metadata is incomplete or invalid.`);
      continue;
    }
    outputFormats.add(output.format);
  }
  for (const format of ["DOCX", "PDF"] as const) {
    if (!outputFormats.has(format)) {
      pushIssue(issues, "missing_output", `A polished ${format} output is required.`);
    }
  }

  if (
    candidate.limitations.some((limitation) =>
      /not (?:a )?(?:final|legal|submission)|pre-see|draft only/i.test(limitation),
    )
  ) {
    pushIssue(issues, "declared_non_final", "The artefact declares that it is not submission grade.");
  }

  const review = candidate.operatorReview;
  if (
    review.status !== "approved" ||
    !validTime(review.reviewedAt) ||
    !clean(review.checklistVersion) ||
    review.unresolvedIssues.length > 0
  ) {
    pushIssue(issues, "operator_review_incomplete", "Named checklist approval with no unresolved issues is required.");
  }

  return {
    status: issues.length === 0 ? "ready" : "blocked",
    ready: issues.length === 0,
    issues,
    evidence: {
      requiredSections: REQUIRED_SUBMISSION_SEE_SECTIONS.length,
      acceptedSections,
      citedSources: sourceIds.size,
      readyUploads,
      outputFormats: [...outputFormats].sort(),
    },
  };
}

export function assessPreSeeMemoForSubmission(
  memo: WorkspacePreSeePlanningMemoContent,
): SubmissionSeeAcceptance {
  const issues: SubmissionSeeIssue[] = [
    {
      code: "wrong_document_type",
      detail: "The current artefact is an MVP pre-SEE planning memo, not a submission SEE.",
    },
    {
      code: "wrong_product",
      detail: "The current memo is not bound to the A$749 submission SEE product.",
    },
    {
      code: "missing_output",
      detail: "The current memo has no accepted DOCX and PDF output pair.",
    },
    {
      code: "operator_review_incomplete",
      detail: "The current memo has no submission checklist approval.",
    },
  ];
  if (
    memo.limitations.some((limitation) =>
      /not (?:a )?(?:final|legal|submission)|pre-see|mvp/i.test(limitation),
    )
  ) {
    issues.push({
      code: "declared_non_final",
      detail: "The memo explicitly declares that it is not a final legal Statement of Environmental Effects.",
    });
  }
  return {
    status: "blocked",
    ready: false,
    issues,
    evidence: {
      requiredSections: REQUIRED_SUBMISSION_SEE_SECTIONS.length,
      acceptedSections: 0,
      citedSources: 0,
      readyUploads: 0,
      outputFormats: [],
    },
  };
}

import type {
  SubmissionSeeCandidate,
  SubmissionSeeSource,
} from "./submission-see-acceptance";
import type {
  WorkingSeeOutstandingEvidence,
  WorkingSeeRenderContext,
} from "./submission-see-renderer";

export type SubmissionSeePresentationSource = {
  id: string;
  type: SubmissionSeeSource["type"];
  title: string;
  provenance: string;
  checkedAt: string;
};

export type SubmissionSeePresentationSection = {
  id: string;
  number: string;
  title: string;
  narrative: string;
  sources: SubmissionSeePresentationSource[];
};

export type SubmissionSeePresentationRow = {
  label: string;
  value: string;
};

export type SubmissionSeePresentationEvidence = {
  name: string;
  kind: string;
  status: string;
  usedIn: string;
};

export type SubmissionSeePresentationModel = {
  brand: "PLANNERA";
  documentTitle: string;
  shortTitle: string;
  statusLabel: "SUBMISSION SEE" | "WORKING SEE - NOT SUBMISSION READY";
  statusDetail: string;
  siteLabel: string;
  locationLine: string;
  generatedDate: string;
  proposalSummary: string;
  documentControl: SubmissionSeePresentationRow[];
  contents: Array<{ number: string; title: string }>;
  sections: SubmissionSeePresentationSection[];
  sourceRegister: SubmissionSeePresentationSource[];
  evidenceSchedule: SubmissionSeePresentationEvidence[];
  outstandingEvidence: WorkingSeeOutstandingEvidence[];
  limitations: string[];
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

export const titleCaseSeeText = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const sourcePresentation = (
  source: SubmissionSeeSource,
): SubmissionSeePresentationSource => ({
  id: source.id,
  type: source.type,
  title: source.title,
  provenance:
    source.officialUrl ??
    (source.contentHash
      ? `SHA-256 ${source.contentHash}`
      : "No provenance recorded"),
  checkedAt: formatDate(source.retrievedAt),
});

const uploadStatus = (status: string, indexing: string) => {
  if (status === "READY" && indexing === "READY") return "Reviewed / Ready";
  return `${titleCaseSeeText(status)} / ${titleCaseSeeText(indexing)}`;
};

export function buildSubmissionSeePresentation(input: {
  candidate: SubmissionSeeCandidate;
  workingContext?: WorkingSeeRenderContext | null;
}): SubmissionSeePresentationModel {
  const { candidate } = input;
  const working = input.workingContext ?? null;
  const sourceById = new Map(
    candidate.sources.map((source) => [source.id, sourcePresentation(source)]),
  );
  const sections = candidate.sections.map((section, index) => ({
    id: section.id,
    number: String(index + 1),
    title: titleCaseSeeText(section.title || section.id),
    narrative: clean(section.narrative),
    sources: section.sourceIds.map((id) => {
      const source = sourceById.get(id);
      return (
        source ?? {
          id,
          type: "UPLOAD" as const,
          title: id,
          provenance: "Referenced source",
          checkedAt: "",
        }
      );
    }),
  }));

  const statusLabel = working
    ? ("WORKING SEE - NOT SUBMISSION READY" as const)
    : ("SUBMISSION SEE" as const);
  const statusDetail = working
    ? working.documentReadiness.customerMessage
    : "Operator-reviewed Statement of Environmental Effects prepared from the current cited project evidence chain.";

  const documentControl: SubmissionSeePresentationRow[] = [
    { label: "Document", value: working ? "Working Statement of Environmental Effects" : "Statement of Environmental Effects" },
    { label: "Site", value: candidate.site.label },
    {
      label: "Planning area",
      value: `${titleCaseSeeText(candidate.site.lgaCode)} | Zone ${candidate.site.zoneCode}`,
    },
    { label: "Generated", value: formatDate(candidate.generatedAt) },
    { label: "Status", value: statusLabel },
    {
      label: "Operator review",
      value: candidate.operatorReview.checklistVersion
        ? `${titleCaseSeeText(candidate.operatorReview.status)} | ${candidate.operatorReview.checklistVersion}`
        : titleCaseSeeText(candidate.operatorReview.status),
    },
  ];

  if (working) {
    documentControl.push({
      label: "Source DPP",
      value: working.sourceDetailedPlanningPackArtefactId,
    });
    if (working.predecessorDetailedPlanningPackArtefactId) {
      documentControl.push({
        label: "Strengthens DPP",
        value: working.predecessorDetailedPlanningPackArtefactId,
      });
    }
  }

  return {
    brand: "PLANNERA",
    documentTitle: working
      ? "Working Statement of Environmental Effects"
      : "Statement of Environmental Effects",
    shortTitle: "Statement of Environmental Effects",
    statusLabel,
    statusDetail,
    siteLabel: candidate.site.label,
    locationLine: `${titleCaseSeeText(candidate.site.lgaCode)} | Zone ${candidate.site.zoneCode}`,
    generatedDate: formatDate(candidate.generatedAt),
    proposalSummary: clean(candidate.proposalSummary),
    documentControl,
    contents: sections.map((section) => ({
      number: section.number,
      title: section.title,
    })),
    sections,
    sourceRegister: candidate.sources.map(sourcePresentation),
    evidenceSchedule: candidate.uploadEvidence.uploads.map((upload) => ({
      name: upload.name,
      kind: titleCaseSeeText(upload.kind),
      status: uploadStatus(upload.evidenceStatus, upload.indexingStatus),
      usedIn: upload.usedInSections
        .map((sectionId) => {
          const section = sections.find((item) => item.id === sectionId);
          return section ? `${section.number}. ${section.title}` : titleCaseSeeText(sectionId);
        })
        .join("; "),
    })),
    outstandingEvidence: working?.outstandingEvidence ?? [],
    limitations: [...candidate.limitations],
  };
}

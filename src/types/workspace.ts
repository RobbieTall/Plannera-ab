import type { SourceAttribution } from "@/lib/workspace-chat";
import type { QuickSiteCheckEvidenceSummary, QuickSiteCheckReport } from "@/types/quick-site-check";

export type UserTier = "guest" | "free" | "pro";

export type WorkspaceMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
  createdAt?: string;
  sourceAttribution?: SourceAttribution;
  confidenceScore?: number | null;
  lepSourceRefs?: string[];
  reactions?: Record<string, number>;
};

export type WorkspaceSessionSignals = {
  lga?: string;
  zone?: string;
  instruments?: string[];
  lastSummary?: string;
  recentSource?: string;
  lastIntent?: string;
};

export type WorkspaceArtefactType = "summary" | "brief" | "report" | "chat" | "note" | "feasibility" | "review_request" | "detailed_planning_pack";

export type FeasibilityItem = {
  label: string;
  verdict: "proceed" | "caution" | "redesign" | "blocked" | "unresolved";
  detail: string;
  confidence: "cited" | "inferred" | "unavailable";
  source?: string;
};

export type FeasibilityContent = {
  summaryType?: "planning_feasibility_summary";
  projectId?: string;
  developmentType: string;
  proposalBrief?: string;
  overallVerdict: "proceed" | "caution" | "redesign" | "blocked" | "unresolved";
  summary: string;
  items: FeasibilityItem[];
  generatedAt: string;
  sourceDetailedPlanningPack?: {
    artefactId: string;
    generatedAt: string | null;
    commercialReady: boolean;
    sourceQuickSiteCheckArtefactId: string;
  };
};

export type SeeSourceCitation = {
  ref: string;
  type: "LEP" | "DCP";
};

export type ConsultantNeedStatus =
  | "Required"
  | "Conditional"
  | "Recommended"
  | "Not identified from current evidence";

export type ConsultantNeedEvidence = {
  type: "LEP" | "DCP" | "PACK_GAP";
  ref: string;
  excerpt?: string | null;
};

export type ConsultantNeed = {
  disciplineId:
    | "town_planning"
    | "traffic_transport"
    | "architecture_urban_design"
    | "landscape_architecture"
    | "registered_surveying"
    | "bushfire"
    | "flood_hydraulic"
    | "ecology"
    | "heritage"
    | "contamination_geotechnical";
  disciplineLabel: string;
  status: ConsultantNeedStatus;
  reason: string;
  evidence: ConsultantNeedEvidence[];
  questions: string[];
};

export type DisciplineReferralPackage = {
  disciplineId: ConsultantNeed["disciplineId"];
  disciplineLabel: string;
  needStatus: Exclude<ConsultantNeedStatus, "Not identified from current evidence">;
  brief: string;
  requestedScope: string[];
  questions: string[];
  evidence: ConsultantNeedEvidence[];
  limitations: string[];
};


export type ReviewRequestContent = {
  requestType: "expert_review_request";
  generatedAt: string;
  projectId: string;
  site: {
    address: string | null;
    lga: string | null;
    zoneLabel: string | null;
  };
  packageSummary: string;
  includedArtefacts: Array<{
    type: "quick_site_check" | "detailed_planning_pack" | "pre_see_planning_memo";
    id: string;
    title: string;
    generatedAt: string | null;
  }>;
  citedSources: SeeSourceCitation[];
  lepEvidenceSummary?: QuickSiteCheckEvidenceSummary | null;
  confidenceGaps: string[];
  missingInputs: string[];
  assumptions: string[];
  recommendedReviewScope: string[];
  consultantNeedsVersion?: "consultant-needs.v1";
  consultantNeeds?: ConsultantNeed[];
  disciplinePackages?: DisciplineReferralPackage[];
  detailedPlanningPack?: {
    artefactId: string;
    title: string;
    generatedAt: string | null;
    proposalBrief: string;
    commercialReady: boolean;
    topicMatrix: DetailedPlanningPackContent["topicMatrix"];
    unresolvedTopics: string[];
    sourceQuickSiteCheckArtefactId: string;
    citedRequirements?: Array<{
      topicId: string;
      topicLabel: string;
      ref: string;
      title: string | null;
      headingPath: string[];
      excerpt: string;
    }>;
  } | null;
  sourceSeeMemo?: {
    artefactId: string;
    title: string;
    generatedAt: string | null;
    sourceDetailedPlanningPackArtefactId?: string | null;
  } | null;
};

export type DetailedPlanningPackTopicStatus = "Cited" | "Unavailable" | "Needs Expert Review";

export type DetailedPlanningPackContent = {
  packType: "detailed_planning_pack";
  generatedAt: string;
  projectId: string;
  site: {
    address: string | null;
    lga: string | null;
    lgaCode: string | null;
    zoneCode: string | null;
    zoneName: string | null;
    zoneLabel: string | null;
  };
  proposalBrief: string;
  sourceQuickSiteCheck: {
    artefactId: string;
    title: string;
    generatedAt: string | null;
    lepEvidenceSummary?: QuickSiteCheckEvidenceSummary | null;
  };
  carriedLepEvidenceSummary: QuickSiteCheckEvidenceSummary | null;
  dcpEvidence: Array<{
    topicId: string;
    topicLabel: string;
    status: DetailedPlanningPackTopicStatus;
    reason: string;
    citations: Array<{ ref: string; title: string | null; headingPath: string[]; excerpt: string; score: number }>;
  }>;
  topicMatrix: Array<{ topicId: string; topicLabel: string; status: DetailedPlanningPackTopicStatus; summary: string; sourceRefs: string[] }>;
  unresolvedTopics: string[];
  consultantReviewQuestions: string[];
  nextAction: string;
  commercialReady: boolean;
};

export type WorkspacePreSeePlanningMemoContent = {
  memoType: "pre_see_planning_memo";
  generatedAt: string;
  projectId: string;
  siteDescription: {
    address: string | null;
    lga: string | null;
    zoneCode: string | null;
    zoneName: string | null;
    zoneLabel: string | null;
  };
  proposedWorksSummary: string;
  applicableControls: {
    lepInstrument: { name?: string | null } | null;
    permissibility: { landUse?: string | null; status?: string | null; interpretation?: string | null } | null;
    quickSiteControls: Record<string, { label?: string | null; value?: string | null; interpretation?: string | null }>;
    dcpClauses: Array<{
      ref: string | null;
      title: string | null;
      headingPath: string[];
      bodyText: string;
      score: number;
    }>;
    sourceExcerpts: Array<{
      id: string;
      heading: string | null | undefined;
      sourceType: string;
      content: string;
      score: number;
    }>;
  };
  consistencyAssessment: Array<{
    topic: string;
    assessment: string;
    citations?: SeeSourceCitation[];
  }>;
  limitations: string[];
  sourceDetailedPlanningPack?: {
    artefactId: string;
    title: string;
    generatedAt: string | null;
    commercialReady: boolean;
    sourceQuickSiteCheckArtefactId: string;
  };
};

export type WorkspaceArtefact = {
  id: string;
  title: string;
  owner: string;
  updatedAt: string;
  createdAt?: string;
  type: WorkspaceArtefactType;
  noteType?: string;
  metadata?: string;
  messages?: WorkspaceMessage[];
  preSeeMemo?: WorkspacePreSeePlanningMemoContent;
  content?: FeasibilityContent;
  reviewRequest?: ReviewRequestContent;
  detailedPlanningPack?: DetailedPlanningPackContent;
  quickSiteCheck?: QuickSiteCheckReport;
  isCurrentSite?: boolean;
  staleReason?: string;
  staleAt?: string;
};

export type WorkspaceNoteCategory = "Note" | "Meeting minutes" | "Observation" | "Idea";

export type WorkspaceSourceType =
  | "email"
  | "document"
  | "link"
  | "pdf"
  | "spreadsheet"
  | "word"
  | "image"
  | "gis"
  | "other";

export type WorkspaceSource = {
  id: string;
  name: string;
  detail: string;
  type: WorkspaceSourceType;
  uploadedAt: string;
  sizeLabel: string;
  status?: string;
  statusDetail?: string;
  evidenceStatus?: "READY" | "PARTIALLY_READABLE" | "IMAGE_ONLY" | "NEEDS_REVIEW";
  indexingStatus?: "READY" | "PENDING" | "FAILED" | "NOT_APPLICABLE";
  contentHash?: string | null;
  url?: string;
  fileExtension?: string | null;
};

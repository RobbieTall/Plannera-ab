import type { SourceAttribution } from "@/lib/workspace-chat";

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

export type WorkspaceArtefactType = "summary" | "brief" | "report" | "chat" | "note";

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
  }>;
  limitations: string[];
};

export type WorkspaceArtefact = {
  id: string;
  title: string;
  owner: string;
  updatedAt: string;
  type: WorkspaceArtefactType;
  noteType?: string;
  metadata?: string;
  messages?: WorkspaceMessage[];
  preSeeMemo?: WorkspacePreSeePlanningMemoContent;
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
  url?: string;
  fileExtension?: string | null;
};

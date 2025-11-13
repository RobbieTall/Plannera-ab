export type UserTier = "anonymous" | "free" | "pro";

export type WorkspaceMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
};

export type WorkspaceArtefactType = "summary" | "brief" | "report" | "chat" | "note";

export type WorkspaceArtefact = {
  id: string;
  title: string;
  owner: string;
  updatedAt: string;
  type: WorkspaceArtefactType;
  noteType?: string;
  metadata?: string;
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
};

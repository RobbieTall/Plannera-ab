/** Browser-safe metadata contract. Never includes storage URLs, purchase IDs or bytes. */
export const WORKING_SEE_MIME = {
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  PDF: "application/pdf",
} as const;
export type SavedSeeFormat = keyof typeof WORKING_SEE_MIME;
export type SavedSeeVersion = {
  versionId: string;
  projectId: string;
  council: "BYRON" | "KEMPSEY";
  documentReference: string;
  generatedAt: string;
  rendererVersion: string;
  readiness: "WORKING_SEE";
  submissionReady: false;
  evidenceStatus: "CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
  warnings: string[];
  sourceDetailedPlanningPackArtefactId: string;
  sourceQuickSiteCheckArtefactId: string;
  files: { format: SavedSeeFormat; mimeType: string; byteLength: number; contentHash: string }[];
};
export type SavedSeeVersionPage = { versions: SavedSeeVersion[]; nextCursor: string | null };
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export const documentIdentifier = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const hash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const shortText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 4096;
const validDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

export function readSavedSeeVersion(value: unknown, projectId: string): SavedSeeVersion | null {
  if (!record(value) || !documentIdentifier(projectId) || value.projectId !== projectId ||
    !hash(value.versionId) || (value.council !== "BYRON" && value.council !== "KEMPSEY") ||
    !shortText(value.documentReference) || !shortText(value.rendererVersion) ||
    !validDate(value.generatedAt) || value.readiness !== "WORKING_SEE" ||
    value.submissionReady !== false ||
    (value.evidenceStatus !== "CONFIRMED" && value.evidenceStatus !== "MORE_EVIDENCE_REQUIRED") ||
    !documentIdentifier(value.sourceDetailedPlanningPackArtefactId) ||
    !documentIdentifier(value.sourceQuickSiteCheckArtefactId) ||
    !Array.isArray(value.warnings) || value.warnings.length > 100 ||
    !value.warnings.every(shortText) ||
    !value.warnings.includes("WORKING SEE - NOT SUBMISSION READY") ||
    !Array.isArray(value.files) || value.files.length !== 2) return null;
  const files: SavedSeeVersion["files"] = [];
  for (const file of value.files) {
    if (!record(file) || (file.format !== "DOCX" && file.format !== "PDF") ||
      file.mimeType !== WORKING_SEE_MIME[file.format] ||
      !Number.isInteger(file.byteLength) || typeof file.byteLength !== "number" ||
      file.byteLength < 1 || file.byteLength > 4 * 1024 * 1024 ||
      !hash(file.contentHash) || files.some((saved) => saved.format === file.format)) return null;
    files.push({
      format: file.format, mimeType: WORKING_SEE_MIME[file.format],
      byteLength: file.byteLength, contentHash: file.contentHash,
    });
  }
  // Explicit projection prevents accidental secret/internal-field forwarding.
  return {
    versionId: value.versionId, projectId, council: value.council,
    documentReference: value.documentReference, generatedAt: value.generatedAt,
    rendererVersion: value.rendererVersion, readiness: "WORKING_SEE", submissionReady: false,
    evidenceStatus: value.evidenceStatus, warnings: [...value.warnings] as string[],
    sourceDetailedPlanningPackArtefactId: value.sourceDetailedPlanningPackArtefactId,
    sourceQuickSiteCheckArtefactId: value.sourceQuickSiteCheckArtefactId, files,
  };
}

export function readVersionCursor(value: unknown): { createdAt: Date; id: string } | null {
  if (typeof value !== "string" || value.length > 240) return null;
  const [date, id, extra] = value.split("~");
  return extra === undefined && validDate(date) && documentIdentifier(id)
    ? { createdAt: new Date(date), id } : null;
}

export function readSavedSeeVersionPage(value: unknown, projectId: string): SavedSeeVersionPage | null {
  if (!record(value) || !Array.isArray(value.versions) || value.versions.length > 10 ||
    !(value.nextCursor === null || readVersionCursor(value.nextCursor))) return null;
  const versions: SavedSeeVersion[] = [];
  for (const entry of value.versions) {
    const parsed = readSavedSeeVersion(entry, projectId);
    if (!parsed || versions.some((version) => version.versionId === parsed.versionId)) return null;
    versions.push(parsed);
  }
  return { versions, nextCursor: value.nextCursor as string | null };
}

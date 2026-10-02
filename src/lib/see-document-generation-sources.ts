import { createHash } from "node:crypto";
import type { SubmissionSeeSource } from "./submission-see-acceptance";

export type WorkingSeeCouncil = "BYRON" | "KEMPSEY";
export type SavedPlanningSource = {
  id: string;
  kind: "LEP" | "DCP";
  reference: string;
  title: string;
  sourceUrl: string;
  sourceVersion: string | null;
  retrievedAt: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  staleAt: string | null;
  isCurrentAtAssessment: boolean;
  contentHash: string;
  snapshotBodyText: string;
  currentBodyText: string;
  snapshotClauseId: string;
  currentClauseId: string;
  currentClauseIsCurrent: boolean;
  currentClauseUpdatedAt: string;
  registrySourceUrl: string | null;
  council: WorkingSeeCouncil;
  markers: unknown;
};

export type WorkingSeeSourceBinding = {
  projectId: string;
  siteId: string;
  sourceDetailedPlanningPackArtefactId: string;
  sourceQuickSiteCheckArtefactId: string;
  assessmentId: string;
  assessmentProjectId: string;
  assessmentSiteId: string;
  assessmentCouncil: WorkingSeeCouncil;
  assessmentZone: string;
  assessmentIsCurrent: boolean;
  assessmentAt: string;
  assessmentStaleAt: string | null;
  bindingArtefactId: string;
  bindingAssessmentId: string;
  bindingEvidenceDigest: string;
  assessmentEvidenceDigest: string;
  bindingScopeKey: string;
  assessmentScopeKey: string;
  markers: unknown;
};

export class WorkingSeeSourceError extends Error {
  constructor(public readonly code:
    "source_scope_mismatch" | "source_evidence_missing" | "source_evidence_unverified") {
    super(code);
    this.name = "WorkingSeeSourceError";
  }
}

const fail = (code: WorkingSeeSourceError["code"]): never => { throw new WorkingSeeSourceError(code); };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const SHA = /^[a-f0-9]{64}$/;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const millis = (value: string | null) => value ? Date.parse(value) : NaN;
const marker = (value: unknown, depth = 0): boolean => {
  if (depth > 30) return true;
  if (Array.isArray(value)) return value.some((item) => marker(item, depth + 1));
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.fixture === true || row.synthetic === true || row.authoritative === false ||
    Object.values(row).some((item) => marker(item, depth + 1));
};
const suspectLabel = (value: string | null) => /synthetic|fixture|stand[- ]?in/i.test(value ?? "");
const canonicalUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
      url.port || url.search || url.hash || url.pathname === "/") return null;
    return url;
  } catch { return null; }
};
const officialUrl = (source: SavedPlanningSource, council: WorkingSeeCouncil) => {
  const url = canonicalUrl(source.sourceUrl);
  if (!url) return false;
  if (source.kind === "LEP") {
    const registry = source.registrySourceUrl && canonicalUrl(source.registrySourceUrl);
    return url.hostname === "legislation.nsw.gov.au" &&
      /^\/view\/(?:html|whole|pdf)\//.test(url.pathname) &&
      Boolean(registry && registry.href === url.href);
  }
  const host = council === "BYRON" ? "byron.nsw.gov.au" : "kempsey.nsw.gov.au";
  return (url.hostname === host || url.hostname === "www." + host) &&
    /\.pdf$/i.test(url.pathname);
};

/**
 * Internal, pure boundary for exact records loaded from protected server storage.
 * Never feed request JSON, browser claims or search snippets into this function.
 *
 * The caller must authorize the actor and load the real Artefact/assessment
 * relation plus linked current Clause/DCPClause rows. These fields are not an
 * alternative to that database join. No source fetch or promotion happens here.
 *
 * Snapshot contentHash must be SHA-256 of its full UTF-8 bodyText. Existing
 * file/container hashes or unsupported snapshot shapes are not silently rehashed
 * and labelled verified. They need an explicit reviewed ingestion adapter.
 */
export function resolveSavedWorkingSeePlanningSources(input: {
  projectId: string;
  siteId: string;
  siteUpdatedAt: string;
  council: WorkingSeeCouncil;
  zoneCode: string;
  sourceDetailedPlanningPackArtefactId: string;
  sourceQuickSiteCheckArtefactId: string;
  binding: WorkingSeeSourceBinding | null;
  requiredCitations: Array<{ type: "LEP" | "DCP"; ref: string; excerpt?: string }>;
  sources: SavedPlanningSource[];
  now: Date;
}): Array<SubmissionSeeSource & { type: "LEP" | "DCP" }> {
  const b = input.binding;
  const now = input.now.getTime();
  if (!Number.isFinite(now) || !b ||
    ![input.projectId, input.siteId, input.zoneCode,
      input.sourceDetailedPlanningPackArtefactId, input.sourceQuickSiteCheckArtefactId,
      b.assessmentId, b.assessmentScopeKey].every(text) ||
    !["BYRON", "KEMPSEY"].includes(input.council) ||
    b.projectId !== input.projectId || b.siteId !== input.siteId ||
    b.sourceDetailedPlanningPackArtefactId !== input.sourceDetailedPlanningPackArtefactId ||
    b.sourceQuickSiteCheckArtefactId !== input.sourceQuickSiteCheckArtefactId ||
    b.assessmentProjectId !== input.projectId || b.assessmentSiteId !== input.siteId ||
    b.assessmentCouncil !== input.council || b.assessmentZone !== input.zoneCode ||
    b.bindingArtefactId !== input.sourceDetailedPlanningPackArtefactId ||
    b.bindingAssessmentId !== b.assessmentId ||
    !SHA.test(b.assessmentEvidenceDigest) || b.bindingEvidenceDigest !== b.assessmentEvidenceDigest ||
    b.bindingScopeKey !== b.assessmentScopeKey || !b.assessmentIsCurrent ||
    !Number.isFinite(millis(input.siteUpdatedAt)) ||
    !Number.isFinite(millis(b.assessmentAt)) || millis(b.assessmentAt) > now ||
    millis(b.assessmentAt) < millis(input.siteUpdatedAt) ||
    !Number.isFinite(millis(b.assessmentStaleAt)) || millis(b.assessmentStaleAt) <= now ||
    marker(b.markers)) fail("source_scope_mismatch");


  return resolveWorkingSeeSourceCitations(input);
}

/**
 * Shared citation checks after the caller verifies its genuine saved binding.
 * This is not an authorization boundary. Ordinary-pack capture supplies the
 * original capture time because database persistence can follow source retrieval;
 * the retrieval timestamp in the output is never rewritten.
 */
export function resolveWorkingSeeSourceCitations(input: {
  council: WorkingSeeCouncil;
  requiredCitations: Array<{ type: "LEP" | "DCP"; ref: string; excerpt?: string }>;
  sources: SavedPlanningSource[];
  now: Date;
  recordCapturedAt?: string;
  markers?: unknown;
}): Array<SubmissionSeeSource & { type: "LEP" | "DCP" }> {
  const now = input.now.getTime();
  const capturedAt = input.recordCapturedAt === undefined ? null : millis(input.recordCapturedAt);
  if (!Number.isFinite(now) || !["BYRON", "KEMPSEY"].includes(input.council) ||
    marker(input.markers) ||
    (capturedAt !== null && (!Number.isFinite(capturedAt) || capturedAt > now))) {
    fail("source_evidence_unverified");
  }
  if (!input.requiredCitations.length ||
    !input.requiredCitations.some((item) => item.type === "LEP") ||
    !input.requiredCitations.some((item) => item.type === "DCP")) fail("source_evidence_missing");
  const result = new Map<string, SubmissionSeeSource & { type: "LEP" | "DCP" }>();
  for (const citation of input.requiredCitations) {
    if (!text(citation.ref) || !["LEP", "DCP"].includes(citation.type)) fail("source_evidence_unverified");
    const matches = input.sources.filter((source) =>
      source.kind === citation.type && source.reference === citation.ref);
    if (matches.length !== 1) fail("source_evidence_missing");
    const source = matches[0];
    const retrieved = millis(source.retrievedAt);
    const updated = millis(source.currentClauseUpdatedAt);
    if (!text(source.id) || !text(source.title) || !text(source.sourceVersion) ||
      source.council !== input.council || !officialUrl(source, input.council) ||
      !source.isCurrentAtAssessment || !source.currentClauseIsCurrent ||
      !text(source.snapshotClauseId) || source.snapshotClauseId !== source.currentClauseId ||
      !Number.isFinite(retrieved) || retrieved > now ||
      !Number.isFinite(updated) || updated > (capturedAt ?? retrieved) ||
      (capturedAt !== null && retrieved > capturedAt) ||
      !Number.isFinite(millis(source.staleAt)) || millis(source.staleAt) <= now ||
      (source.effectiveFrom !== null &&
        (!Number.isFinite(millis(source.effectiveFrom)) || millis(source.effectiveFrom) > now)) ||
      (source.effectiveTo !== null &&
        (!Number.isFinite(millis(source.effectiveTo)) || millis(source.effectiveTo) <= now)) ||
      !text(source.snapshotBodyText) || Buffer.byteLength(source.snapshotBodyText, "utf8") > 2 * 1024 * 1024 ||
      source.snapshotBodyText !== source.currentBodyText ||
      !SHA.test(source.contentHash) || digest(source.snapshotBodyText) !== source.contentHash ||
      suspectLabel(source.sourceVersion) || suspectLabel(source.title) || marker(source.markers)) {
      fail("source_evidence_unverified");
    }
    if (citation.excerpt !== undefined) {
      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      if (!text(citation.excerpt) ||
        !normalize(source.snapshotBodyText).includes(normalize(citation.excerpt))) {
        fail("source_evidence_unverified");
      }
    }
    const id = source.kind + ":" + source.reference;
    result.set(id, {
      id, type: source.kind, title: source.title, officialUrl: source.sourceUrl,
      contentHash: source.contentHash,
      // Preserve retrieval time. Do not substitute generation time.
      retrievedAt: new Date(retrieved).toISOString(),
    });
  }
  return [...result.values()];
}

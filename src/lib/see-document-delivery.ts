import { createHash } from "node:crypto";

import type { SubmissionSeeCandidate } from "./submission-see-acceptance";
import {
  buildSubmissionSeePresentation,
  SEE_PRESENTATION_VERSION,
} from "./submission-see-presentation";
import {
  renderWorkingSeeOutputs,
  type WorkingSeeRenderContext,
} from "./submission-see-renderer";

export const WORKING_SEE_SNAPSHOT_SCHEMA = "working-see-download.v1";
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const MIME = {
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  PDF: "application/pdf",
} as const;
export type WorkingSeeDownloadFormat = keyof typeof MIME;

type SnapshotFile = {
  format: WorkingSeeDownloadFormat;
  mimeType: string;
  contentHash: string;
  byteLength: number;
  base64: string;
};

export type WorkingSeeSnapshot = {
  schema: typeof WORKING_SEE_SNAPSHOT_SCHEMA;
  versionId: string;
  projectId: string;
  siteId: string;
  council: "BYRON" | "KEMPSEY";
  purchaseScopeKey: string;
  sourceDetailedPlanningPackArtefactId: string;
  sourceQuickSiteCheckArtefactId: string;
  rendererVersion: string;
  documentReference: string;
  generatedAt: string;
  readiness: "WORKING_SEE";
  submissionReady: false;
  evidenceStatus: WorkingSeeRenderContext["documentReadiness"]["evidenceStatus"];
  warnings: string[];
  files: [SnapshotFile, SnapshotFile];
};

export class WorkingSeeDeliveryError extends Error {
  constructor(
    public readonly code: "preview_only" | "unauthenticated" | "invalid_request" |
      "not_found" | "invalid_snapshot",
    public readonly status: 400 | 401 | 404 | 409,
  ) {
    super(code);
    this.name = "WorkingSeeDeliveryError";
  }
}

const failSnapshot = (): never => {
  throw new WorkingSeeDeliveryError("invalid_snapshot", 409);
};
const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 4096;
const text = (value: unknown): string =>
  nonempty(value) ? value : failSnapshot();

const manifest = (snapshot: Omit<WorkingSeeSnapshot, "versionId">) => ({
  schema: snapshot.schema,
  projectId: snapshot.projectId,
  siteId: snapshot.siteId,
  council: snapshot.council,
  purchaseScopeKey: snapshot.purchaseScopeKey,
  sourceDetailedPlanningPackArtefactId: snapshot.sourceDetailedPlanningPackArtefactId,
  sourceQuickSiteCheckArtefactId: snapshot.sourceQuickSiteCheckArtefactId,
  rendererVersion: snapshot.rendererVersion,
  documentReference: snapshot.documentReference,
  generatedAt: snapshot.generatedAt,
  readiness: snapshot.readiness,
  submissionReady: snapshot.submissionReady,
  evidenceStatus: snapshot.evidenceStatus,
  warnings: snapshot.warnings,
  files: snapshot.files.map((file) => ({
    format: file.format,
    mimeType: file.mimeType,
    contentHash: file.contentHash,
    byteLength: file.byteLength,
  })),
});

/**
 * Server-side only: candidate and scope must come from authorised, saved project
 * evidence and a verified purchase, never directly from a request body.
 * This creates a snapshot in memory. It does not persist files, charge a customer,
 * establish entitlement, or replace the protected application's authorisation.
 */
export function createWorkingSeeSnapshot(input: {
  candidate: SubmissionSeeCandidate;
  workingContext: WorkingSeeRenderContext;
  purchaseScopeKey: string;
}): WorkingSeeSnapshot {
  const { candidate, workingContext } = input;
  if (!nonempty(input.purchaseScopeKey)) failSnapshot();
  const council = candidate.site.lgaCode.toUpperCase();
  if (council !== "BYRON" && council !== "KEMPSEY") failSnapshot();
  const rendered = renderWorkingSeeOutputs(candidate, workingContext);
  const presentation = buildSubmissionSeePresentation({
    candidate,
    workingContext,
  });
  const file = (format: WorkingSeeDownloadFormat, bytes: Buffer): SnapshotFile => {
    if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES) failSnapshot();
    return {
      format, mimeType: MIME[format], contentHash: digest(bytes),
      byteLength: bytes.length, base64: bytes.toString("base64"),
    };
  };
  const snapshot: Omit<WorkingSeeSnapshot, "versionId"> = {
    schema: WORKING_SEE_SNAPSHOT_SCHEMA,
    projectId: candidate.projectId,
    siteId: candidate.site.confirmedSiteId,
    council: council as WorkingSeeSnapshot["council"],
    purchaseScopeKey: input.purchaseScopeKey,
    sourceDetailedPlanningPackArtefactId: workingContext.sourceDetailedPlanningPackArtefactId,
    sourceQuickSiteCheckArtefactId: text(candidate.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId),
    rendererVersion: SEE_PRESENTATION_VERSION,
    documentReference: presentation.documentReference,
    generatedAt: new Date(candidate.generatedAt).toISOString(),
    readiness: "WORKING_SEE",
    submissionReady: false,
    evidenceStatus: workingContext.documentReadiness.evidenceStatus,
    warnings: [...new Set([
      "WORKING SEE - NOT SUBMISSION READY",
      workingContext.documentReadiness.customerMessage,
      ...candidate.limitations,
      ...workingContext.outstandingEvidence.map((item) =>
        item.topic + ": " + item.recommendedEvidence + " " + item.effect),
    ])],
    files: [file("DOCX", rendered.docx), file("PDF", rendered.pdf)],
  };
  return readWorkingSeeSnapshot({
    ...snapshot, versionId: digest(JSON.stringify(manifest(snapshot))),
  });
}

/** Validate persisted data, including both file hashes, before serving either file. */
export function readWorkingSeeSnapshot(value: unknown): WorkingSeeSnapshot {
  if (!isRecord(value) || value.schema !== WORKING_SEE_SNAPSHOT_SCHEMA ||
    value.readiness !== "WORKING_SEE" || value.submissionReady !== false ||
    (value.council !== "BYRON" && value.council !== "KEMPSEY") ||
    (value.evidenceStatus !== "CONFIRMED" && value.evidenceStatus !== "MORE_EVIDENCE_REQUIRED") ||
    !Array.isArray(value.files) || value.files.length !== 2 ||
    !Array.isArray(value.warnings) || value.warnings.length === 0 ||
    !value.warnings.every((warning) => typeof warning === "string" && warning.trim().length > 0) ||
    !value.warnings.includes("WORKING SEE - NOT SUBMISSION READY")) failSnapshot();
  const record = value as Record<string, unknown>;
  const files = (record.files as unknown[]).map((entry, index): SnapshotFile => {
    if (!isRecord(entry)) return failSnapshot();
    const format = index === 0 ? "DOCX" : "PDF";
    if (entry.format !== format || entry.mimeType !== MIME[format] ||
      typeof entry.contentHash !== "string" || !HASH.test(entry.contentHash) ||
      !Number.isSafeInteger(entry.byteLength) || (entry.byteLength as number) <= 0 ||
      (entry.byteLength as number) > MAX_FILE_BYTES ||
      typeof entry.base64 !== "string" ||
      entry.base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4) return failSnapshot();
    const bytes = Buffer.from(entry.base64 as string, "base64");
    if (bytes.toString("base64") !== entry.base64 || bytes.length !== entry.byteLength ||
      digest(bytes) !== entry.contentHash ||
      (format === "PDF" ? bytes.subarray(0, 5).toString() !== "%PDF-" :
        bytes.subarray(0, 4).toString("hex") !== "504b0304")) return failSnapshot();
    return {
      format, mimeType: MIME[format], contentHash: entry.contentHash as string,
      byteLength: entry.byteLength as number, base64: entry.base64 as string,
    };
  }) as [SnapshotFile, SnapshotFile];
  const generatedAt = text(record.generatedAt);
  if (!Number.isFinite(Date.parse(generatedAt)) ||
    new Date(generatedAt).toISOString() !== generatedAt) failSnapshot();
  const snapshot: WorkingSeeSnapshot = {
    schema: WORKING_SEE_SNAPSHOT_SCHEMA,
    versionId: text(record.versionId),
    projectId: text(record.projectId),
    siteId: text(record.siteId),
    council: record.council as WorkingSeeSnapshot["council"],
    purchaseScopeKey: text(record.purchaseScopeKey),
    sourceDetailedPlanningPackArtefactId: text(record.sourceDetailedPlanningPackArtefactId),
    sourceQuickSiteCheckArtefactId: text(record.sourceQuickSiteCheckArtefactId),
    rendererVersion: text(record.rendererVersion),
    documentReference: text(record.documentReference),
    generatedAt,
    readiness: "WORKING_SEE",
    submissionReady: false,
    evidenceStatus: record.evidenceStatus as WorkingSeeSnapshot["evidenceStatus"],
    warnings: [...record.warnings as string[]],
    files,
  };
  if (!HASH.test(snapshot.versionId) ||
    !/^SEE-[A-F0-9]{16}$/.test(snapshot.documentReference) ||
    digest(JSON.stringify(manifest(snapshot))) !== snapshot.versionId) failSnapshot();
  return snapshot;
}

export type AuthorisedWorkingSeeSnapshot = {
  snapshot: unknown;
  grant: {
    actorId: string;
    projectId: string;
    versionId: string;
    purchaseScopeKey: string;
    status: "ACTIVE";
  };
};

/**
 * The loader MUST recheck current project access and the exact snapshot's active
 * purchase entitlement in trusted server storage on EVERY download. It must not
 * use client-supplied grants, checkout-enabled flags, or development auth bypass.
 * A revoked grant returns null. Historical versions use their original scope,
 * not today's DPP; reopening never regenerates or silently substitutes content.
 *
 * This adapter is deliberately not an HTTP route until the storage/entitlement
 * integration has been implemented and tested against protected Preview.
 */
export async function downloadWorkingSeeSnapshot(input: {
  deploymentEnvironment: string | undefined;
  actorId: string | null | undefined;
  projectId: string;
  versionId: string;
  format: string;
  loadAuthorisedSnapshot: (scope: {
    actorId: string; projectId: string; versionId: string;
  }) => Promise<AuthorisedWorkingSeeSnapshot | null>;
}): Promise<{
  bytes: Buffer;
  headers: Record<string, string>;
  versionId: string;
  documentReference: string;
  warnings: string[];
}> {
  if (input.deploymentEnvironment !== "preview") {
    throw new WorkingSeeDeliveryError("preview_only", 404);
  }
  if (!nonempty(input.actorId) || input.actorId === "dev-bypass-user") {
    throw new WorkingSeeDeliveryError("unauthenticated", 401);
  }
  if (!nonempty(input.projectId) || !HASH.test(input.versionId) ||
    (input.format !== "DOCX" && input.format !== "PDF")) {
    throw new WorkingSeeDeliveryError("invalid_request", 400);
  }
  const authorised = await input.loadAuthorisedSnapshot({
    actorId: input.actorId, projectId: input.projectId, versionId: input.versionId,
  });
  if (!authorised || authorised.grant.status !== "ACTIVE" ||
    authorised.grant.actorId !== input.actorId ||
    authorised.grant.projectId !== input.projectId ||
    authorised.grant.versionId !== input.versionId) {
    throw new WorkingSeeDeliveryError("not_found", 404);
  }
  const snapshot = readWorkingSeeSnapshot(authorised.snapshot);
  if (snapshot.projectId !== input.projectId || snapshot.versionId !== input.versionId ||
    snapshot.purchaseScopeKey !== authorised.grant.purchaseScopeKey) {
    throw new WorkingSeeDeliveryError("not_found", 404);
  }
  const file = snapshot.files[input.format === "DOCX" ? 0 : 1];
  const projectLabel = snapshot.projectId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
  const name = "working-see-" + projectLabel + "-" + snapshot.versionId.slice(0, 16) +
    "." + input.format.toLowerCase();
  return {
    bytes: Buffer.from(file.base64, "base64"),
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": 'attachment; filename="' + name + '"',
      "Content-Length": String(file.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "Vary": "Cookie, Authorization",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Plannera-Document-Version": snapshot.versionId,
      "X-Plannera-Document-Status": "WORKING_SEE",
    },
    versionId: snapshot.versionId,
    documentReference: snapshot.documentReference,
    warnings: [...snapshot.warnings],
  };
}

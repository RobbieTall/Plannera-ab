export const PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION =
  "item74h-private-evidence-scan.v1" as const;

export const PATHWAY_PRIVATE_EVIDENCE_DEFINITION_FRESHNESS_MS =
  24 * 60 * 60 * 1000;

export type PathwayPrivateEvidenceScanStatus =
  | "PENDING"
  | "CLEAN"
  | "INFECTED"
  | "ERROR";

export type PathwayPrivateEvidenceScanRecord = {
  recordSource: "SERVER_SECURITY_SCAN";
  evidenceRef: string;
  contentHash: string;
  status: PathwayPrivateEvidenceScanStatus;
  scannerEngine: string | null;
  engineVersion: string | null;
  definitionVersion: string | null;
  scannerSnapshotRef: string | null;
  snapshotCreatedAt: string | null;
  definitionsRetrievedAt: string | null;
  scannedAt: string | null;
  targetFileCount: number | null;
  maxFileSizeBytes: number | null;
  maxScanSizeBytes: number | null;
  maxRecursionDepth: number | null;
  maxScanTimeMs: number | null;
  fileSizeLimitHit: boolean | null;
  scanSizeLimitHit: boolean | null;
  recursionLimitHit: boolean | null;
  timeLimitHit: boolean | null;
  encryptedContent: boolean | null;
  networkDenied: boolean | null;
  sandboxStopped: boolean | null;
};

export type PathwayPrivateEvidenceScannerObservation = {
  recordSource: "SERVER_SECURITY_SCAN";
  contentHashBefore: string;
  contentHashAfter: string;
  detected: boolean;
  exitCode: number;
  targetFileCount: number;
  scannerEngine: string;
  engineVersion: string;
  definitionVersion: string;
  scannerSnapshotRef: string;
  snapshotCreatedAt: string;
  definitionsRetrievedAt: string;
  scannedAt: string;
  maxFileSizeBytes: number;
  maxScanSizeBytes: number;
  maxRecursionDepth: number;
  maxScanTimeMs: number;
  fileSizeLimitHit: boolean;
  scanSizeLimitHit: boolean;
  recursionLimitHit: boolean;
  timeLimitHit: boolean;
  encryptedContent: boolean;
  timedOut: boolean;
  crashed: boolean;
  malformedOutput: boolean;
  networkDenied: boolean;
  sandboxStopped: boolean;
};

export type PathwayPrivateEvidenceScanInput = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION;
  environment: "preview" | "production" | "development";
  featureEnabled: boolean;
  evaluatedAt: string;
  evidenceRef: string;
  expectedContentHash: string;
  observation: PathwayPrivateEvidenceScannerObservation;
};

export type PathwayPrivateEvidenceScanErrorCode =
  | "NONE"
  | "PREVIEW_ONLY"
  | "FEATURE_DISABLED"
  | "UNSUPPORTED_FIELD"
  | "IDENTITY_INVALID"
  | "HASH_MISMATCH"
  | "SCANNER_PROVENANCE_INVALID"
  | "DEFINITIONS_STALE"
  | "SCAN_SEQUENCE_INVALID"
  | "TIMEOUT"
  | "SCANNER_CRASH"
  | "MALFORMED_OUTPUT"
  | "ENCRYPTED_CONTENT"
  | "LIMIT_HIT"
  | "TARGET_COUNT_INVALID"
  | "NETWORK_BOUNDARY_REQUIRED"
  | "SANDBOX_STOP_REQUIRED"
  | "UNKNOWN_EXIT";

export type PathwayPrivateEvidenceScanEvaluation = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION;
  status: "CLEAN" | "INFECTED" | "ERROR";
  errorCode: PathwayPrivateEvidenceScanErrorCode;
  serverRecord: PathwayPrivateEvidenceScanRecord | null;
  deletionRequired: boolean;
  remainsQuarantined: true;
  redactedSummary: {
    exactHashMatched: boolean;
    definitionsCurrent: boolean;
    exactlyOneTargetScanned: boolean;
    noLimitHit: boolean;
    networkDenied: boolean;
    sandboxStopped: boolean;
    containsEvidenceReference: false;
    containsContentHash: false;
    containsRawScannerOutput: false;
    paidEligibilityUnlocked: false;
    productionCheckoutEnabled: false;
  };
};

const INPUT_KEYS = new Set([
  "version",
  "environment",
  "featureEnabled",
  "evaluatedAt",
  "evidenceRef",
  "expectedContentHash",
  "observation",
]);
const OBSERVATION_KEYS = new Set([
  "recordSource",
  "contentHashBefore",
  "contentHashAfter",
  "detected",
  "exitCode",
  "targetFileCount",
  "scannerEngine",
  "engineVersion",
  "definitionVersion",
  "scannerSnapshotRef",
  "snapshotCreatedAt",
  "definitionsRetrievedAt",
  "scannedAt",
  "maxFileSizeBytes",
  "maxScanSizeBytes",
  "maxRecursionDepth",
  "maxScanTimeMs",
  "fileSizeLimitHit",
  "scanSizeLimitHit",
  "recursionLimitHit",
  "timeLimitHit",
  "encryptedContent",
  "timedOut",
  "crashed",
  "malformedOutput",
  "networkDenied",
  "sandboxStopped",
]);

const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const VERSION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,127}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: unknown, allowed: Set<string>) =>
  isRecord(value) && Object.keys(value).every((key) => allowed.has(key));

const parsedTime = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const positiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const makeServerRecord = (
  input: PathwayPrivateEvidenceScanInput,
  status: PathwayPrivateEvidenceScanRecord["status"],
): PathwayPrivateEvidenceScanRecord => ({
  recordSource: "SERVER_SECURITY_SCAN",
  evidenceRef: input.evidenceRef,
  contentHash: input.expectedContentHash,
  status,
  scannerEngine: input.observation.scannerEngine,
  engineVersion: input.observation.engineVersion,
  definitionVersion: input.observation.definitionVersion,
  scannerSnapshotRef: input.observation.scannerSnapshotRef,
  snapshotCreatedAt: input.observation.snapshotCreatedAt,
  definitionsRetrievedAt: input.observation.definitionsRetrievedAt,
  scannedAt: input.observation.scannedAt,
  targetFileCount: input.observation.targetFileCount,
  maxFileSizeBytes: input.observation.maxFileSizeBytes,
  maxScanSizeBytes: input.observation.maxScanSizeBytes,
  maxRecursionDepth: input.observation.maxRecursionDepth,
  maxScanTimeMs: input.observation.maxScanTimeMs,
  fileSizeLimitHit: input.observation.fileSizeLimitHit,
  scanSizeLimitHit: input.observation.scanSizeLimitHit,
  recursionLimitHit: input.observation.recursionLimitHit,
  timeLimitHit: input.observation.timeLimitHit,
  encryptedContent: input.observation.encryptedContent,
  networkDenied: input.observation.networkDenied,
  sandboxStopped: input.observation.sandboxStopped,
});

export const evaluatePathwayPrivateEvidenceScan = (
  input: PathwayPrivateEvidenceScanInput,
): PathwayPrivateEvidenceScanEvaluation => {
  const shapeValid =
    input.version === PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION &&
    hasOnlyKeys(input, INPUT_KEYS) &&
    hasOnlyKeys(input.observation, OBSERVATION_KEYS) &&
    input.observation.recordSource === "SERVER_SECURITY_SCAN";
  const identityValid =
    OPAQUE_REF.test(input.evidenceRef) && SHA256.test(input.expectedContentHash);
  const exactHashMatched =
    identityValid &&
    input.observation.contentHashBefore === input.expectedContentHash &&
    input.observation.contentHashAfter === input.expectedContentHash;
  const evaluatedAt = parsedTime(input.evaluatedAt);
  const definitionsRetrievedAt = parsedTime(
    input.observation.definitionsRetrievedAt,
  );
  const snapshotCreatedAt = parsedTime(input.observation.snapshotCreatedAt);
  const scannedAt = parsedTime(input.observation.scannedAt);
  const definitionsCurrent =
    evaluatedAt !== null &&
    definitionsRetrievedAt !== null &&
    evaluatedAt - definitionsRetrievedAt >= 0 &&
    evaluatedAt - definitionsRetrievedAt <=
      PATHWAY_PRIVATE_EVIDENCE_DEFINITION_FRESHNESS_MS;
  const sequenceValid =
    definitionsRetrievedAt !== null &&
    snapshotCreatedAt !== null &&
    scannedAt !== null &&
    evaluatedAt !== null &&
    definitionsRetrievedAt <= snapshotCreatedAt &&
    snapshotCreatedAt <= scannedAt &&
    scannedAt <= evaluatedAt;
  const provenanceValid =
    VERSION_TOKEN.test(input.observation.scannerEngine) &&
    VERSION_TOKEN.test(input.observation.engineVersion) &&
    VERSION_TOKEN.test(input.observation.definitionVersion) &&
    OPAQUE_REF.test(input.observation.scannerSnapshotRef) &&
    positiveInteger(input.observation.maxFileSizeBytes) &&
    positiveInteger(input.observation.maxScanSizeBytes) &&
    positiveInteger(input.observation.maxRecursionDepth) &&
    positiveInteger(input.observation.maxScanTimeMs);
  const noLimitHit =
    !input.observation.fileSizeLimitHit &&
    !input.observation.scanSizeLimitHit &&
    !input.observation.recursionLimitHit &&
    !input.observation.timeLimitHit;

  const finish = (
    status: PathwayPrivateEvidenceScanEvaluation["status"],
    errorCode: PathwayPrivateEvidenceScanErrorCode,
  ): PathwayPrivateEvidenceScanEvaluation => ({
    version: PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
    status,
    errorCode,
    serverRecord: identityValid ? makeServerRecord(input, status) : null,
    deletionRequired: status === "INFECTED",
    remainsQuarantined: true,
    redactedSummary: {
      exactHashMatched,
      definitionsCurrent,
      exactlyOneTargetScanned: input.observation.targetFileCount === 1,
      noLimitHit,
      networkDenied: input.observation.networkDenied,
      sandboxStopped: input.observation.sandboxStopped,
      containsEvidenceReference: false,
      containsContentHash: false,
      containsRawScannerOutput: false,
      paidEligibilityUnlocked: false,
      productionCheckoutEnabled: false,
    },
  });

  if (!shapeValid) return finish("ERROR", "UNSUPPORTED_FIELD");
  if (input.environment !== "preview") return finish("ERROR", "PREVIEW_ONLY");
  if (!input.featureEnabled) return finish("ERROR", "FEATURE_DISABLED");
  if (!identityValid) return finish("ERROR", "IDENTITY_INVALID");
  if (!exactHashMatched) return finish("ERROR", "HASH_MISMATCH");
  if (!provenanceValid)
    return finish("ERROR", "SCANNER_PROVENANCE_INVALID");
  if (!definitionsCurrent) return finish("ERROR", "DEFINITIONS_STALE");
  if (!sequenceValid) return finish("ERROR", "SCAN_SEQUENCE_INVALID");
  if (input.observation.timedOut) return finish("ERROR", "TIMEOUT");
  if (input.observation.crashed) return finish("ERROR", "SCANNER_CRASH");
  if (input.observation.malformedOutput)
    return finish("ERROR", "MALFORMED_OUTPUT");
  if (input.observation.encryptedContent)
    return finish("ERROR", "ENCRYPTED_CONTENT");
  if (!noLimitHit) return finish("ERROR", "LIMIT_HIT");
  if (input.observation.targetFileCount !== 1)
    return finish("ERROR", "TARGET_COUNT_INVALID");
  if (!input.observation.networkDenied)
    return finish("ERROR", "NETWORK_BOUNDARY_REQUIRED");
  if (!input.observation.sandboxStopped)
    return finish("ERROR", "SANDBOX_STOP_REQUIRED");
  if (input.observation.detected && input.observation.exitCode === 1)
    return finish("INFECTED", "NONE");
  if (!input.observation.detected && input.observation.exitCode === 0)
    return finish("CLEAN", "NONE");
  return finish("ERROR", "UNKNOWN_EXIT");
};

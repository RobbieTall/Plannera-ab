import { createHash, randomUUID } from "node:crypto";

import {
  evaluatePathwayPrivateEvidenceUpload,
  PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION,
  type PathwayPrivateEvidenceRole,
  type PathwayPrivateEvidenceUploadBlocker,
  type PathwayPrivateEvidenceUploadInput,
} from "./pathway-private-evidence-upload";

export const PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION =
  "item74h-private-evidence-intake.v1" as const;

export type PathwayPrivateEvidenceIntakeBlocker =
  | PathwayPrivateEvidenceUploadBlocker
  | "UNSAFE_STORAGE_RESPONSE"
  | "QUARANTINE_SETUP_FAILED";

export type PathwayPrivateEvidenceIntakeInput = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION;
  environment: PathwayPrivateEvidenceUploadInput["environment"];
  featureEnabled: boolean;
  auth: PathwayPrivateEvidenceUploadInput["auth"];
  storage: Omit<
    PathwayPrivateEvidenceUploadInput["storage"],
    "objectRef"
  >;
  document: {
    role: PathwayPrivateEvidenceRole;
    mimeType: PathwayPrivateEvidenceUploadInput["document"]["mimeType"];
    bytes: Uint8Array;
  };
};

type QuarantinedObject = {
  access: "private" | "public" | "unknown";
  sdkVersion: string;
  host: string;
  objectRef: string;
};

export type PathwayPrivateEvidenceIntakeDependencies = {
  createObjectRef?: () => string;
  putQuarantined: (input: {
    ownerRef: string;
    objectRef: string;
    role: PathwayPrivateEvidenceRole;
    mimeType: PathwayPrivateEvidenceUploadInput["document"]["mimeType"];
    bytes: Uint8Array;
    contentHash: string;
  }) => Promise<QuarantinedObject>;
  enqueueSecurityScan: (input: {
    objectRef: string;
    role: PathwayPrivateEvidenceRole;
    contentHash: string;
  }) => Promise<void>;
  deleteQuarantined: (input: { objectRef: string }) => Promise<void>;
};

export type PathwayPrivateEvidenceIntakeResult = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION;
  status: "DENIED" | "QUARANTINED";
  blockers: PathwayPrivateEvidenceIntakeBlocker[];
  quarantineRequired: boolean;
  redactedSummary: {
    role: PathwayPrivateEvidenceRole | null;
    authenticatedProjectScopeConfirmed: boolean;
    privateStorageConfirmed: boolean;
    contentIntegrityConfirmed: boolean;
    securityScanStatus: "NOT_STARTED" | "PENDING";
    evidenceReviewStatus: "NOT_STARTED";
    containsRawSiteIdentifiers: false;
    returnsDirectObjectUrl: false;
    paidEligibilityUnlocked: false;
    productionCheckoutEnabled: false;
  };
};

const INPUT_KEYS = new Set([
  "version",
  "environment",
  "featureEnabled",
  "auth",
  "storage",
  "document",
]);
const AUTH_KEYS = new Set([
  "authEnabled",
  "sessionUserRef",
  "projectOwnerRef",
]);
const STORAGE_KEYS = new Set([
  "access",
  "sdkVersion",
  "host",
  "signedAccessTtlSeconds",
]);
const DOCUMENT_KEYS = new Set(["role", "mimeType", "bytes"]);
const STORED_OBJECT_KEYS = new Set([
  "access",
  "sdkVersion",
  "host",
  "objectRef",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: unknown, allowed: Set<string>) =>
  isRecord(value) && Object.keys(value).every((key) => allowed.has(key));

const createOpaqueObjectRef = () => `ev_${randomUUID().replaceAll("-", "")}`;

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const resultFromEvaluation = (
  input: PathwayPrivateEvidenceIntakeInput,
  blockers: PathwayPrivateEvidenceIntakeBlocker[],
  status: "DENIED" | "QUARANTINED",
  evaluation?: ReturnType<typeof evaluatePathwayPrivateEvidenceUpload>,
): PathwayPrivateEvidenceIntakeResult => ({
  version: PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION,
  status,
  blockers: unique(blockers),
  quarantineRequired: status === "QUARANTINED",
  redactedSummary: {
    role: evaluation?.redactedSummary.role ?? null,
    authenticatedProjectScopeConfirmed:
      evaluation?.redactedSummary.authenticatedProjectScopeConfirmed ?? false,
    privateStorageConfirmed:
      evaluation?.redactedSummary.privateStorageConfirmed ?? false,
    contentIntegrityConfirmed:
      evaluation?.redactedSummary.contentIntegrityConfirmed ?? false,
    securityScanStatus: status === "QUARANTINED" ? "PENDING" : "NOT_STARTED",
    evidenceReviewStatus: "NOT_STARTED",
    containsRawSiteIdentifiers: false,
    returnsDirectObjectUrl: false,
    paidEligibilityUnlocked: false,
    productionCheckoutEnabled: false,
  },
});

const safeDelete = async (
  deps: PathwayPrivateEvidenceIntakeDependencies,
  objectRef: string,
) => {
  try {
    await deps.deleteQuarantined({ objectRef });
  } catch {
    // The adapter must alert and reconcile cleanup failures without exposing
    // private object details through this privacy-minimal contract.
  }
};

export const intakePathwayPrivateEvidence = async (
  input: PathwayPrivateEvidenceIntakeInput,
  deps: PathwayPrivateEvidenceIntakeDependencies,
): Promise<PathwayPrivateEvidenceIntakeResult> => {
  const inputShapeValid =
    hasOnlyKeys(input, INPUT_KEYS) &&
    hasOnlyKeys(input.auth, AUTH_KEYS) &&
    hasOnlyKeys(input.storage, STORAGE_KEYS) &&
    hasOnlyKeys(input.document, DOCUMENT_KEYS);

  if (
    input.version !== PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION ||
    !inputShapeValid
  ) {
    return resultFromEvaluation(input, ["UNSUPPORTED_FIELD"], "DENIED");
  }

  const bytes =
    input.document.bytes instanceof Uint8Array
      ? input.document.bytes
      : new Uint8Array();
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const objectRef = (deps.createObjectRef ?? createOpaqueObjectRef)();

  const policyInput: PathwayPrivateEvidenceUploadInput = {
    version: PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION,
    environment: input.environment,
    featureEnabled: input.featureEnabled,
    auth: input.auth,
    storage: {
      ...input.storage,
      objectRef,
    },
    document: {
      role: input.document.role,
      contentHash,
      mimeType: input.document.mimeType,
      fileSizeBytes: bytes.byteLength,
      securityScanStatus: "PENDING",
      evidenceReviewStatus: "PENDING",
    },
  };

  const preflight = evaluatePathwayPrivateEvidenceUpload(policyInput);
  if (!preflight.privateUploadAuthorized) {
    return resultFromEvaluation(input, preflight.blockers, "DENIED", preflight);
  }

  let stored: QuarantinedObject;
  try {
    stored = await deps.putQuarantined({
      ownerRef: input.auth.projectOwnerRef!,
      objectRef,
      role: input.document.role,
      mimeType: input.document.mimeType,
      bytes,
      contentHash,
    });
  } catch {
    return resultFromEvaluation(
      input,
      ["QUARANTINE_SETUP_FAILED"],
      "DENIED",
      preflight,
    );
  }

  const storedShapeSafe = hasOnlyKeys(stored, STORED_OBJECT_KEYS);
  const storageEvaluation = evaluatePathwayPrivateEvidenceUpload({
    ...policyInput,
    storage: {
      ...policyInput.storage,
      access: stored.access,
      sdkVersion: stored.sdkVersion,
      host: stored.host,
      objectRef: stored.objectRef,
    },
  });

  if (
    !storedShapeSafe ||
    stored.objectRef !== objectRef ||
    !storageEvaluation.privateUploadAuthorized
  ) {
    await safeDelete(deps, stored.objectRef);
    return resultFromEvaluation(
      input,
      [
        ...storageEvaluation.blockers,
        ...(!storedShapeSafe || stored.objectRef !== objectRef
          ? (["UNSAFE_STORAGE_RESPONSE"] as const)
          : []),
      ],
      "DENIED",
      storageEvaluation,
    );
  }

  try {
    await deps.enqueueSecurityScan({
      objectRef,
      role: input.document.role,
      contentHash,
    });
  } catch {
    await safeDelete(deps, objectRef);
    return resultFromEvaluation(
      input,
      ["QUARANTINE_SETUP_FAILED", "SECURITY_SCAN_REQUIRED"],
      "DENIED",
      storageEvaluation,
    );
  }

  return resultFromEvaluation(
    input,
    ["SECURITY_SCAN_REQUIRED", "EVIDENCE_REVIEW_REQUIRED"],
    "QUARANTINED",
    storageEvaluation,
  );
};

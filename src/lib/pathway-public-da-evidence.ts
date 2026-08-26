import { createHash } from "node:crypto";

export const PATHWAY_PUBLIC_DA_EVIDENCE_VERSION =
  "pathway-public-da-evidence.v1" as const;

export const PATHWAY_PUBLIC_DA_DOCUMENT_ROLES = [
  "APPROVED_PLANS",
  "DETERMINATION",
  "FLOOR_ELEVATION_PLAN",
  "SITE_PLAN",
  "PLANNING_REPORT",
  "SUPPORTING",
] as const;

export type PathwayPublicDaDocumentRole =
  (typeof PATHWAY_PUBLIC_DA_DOCUMENT_ROLES)[number];

export type PathwayPublicDaDocument = {
  recordNumber: string;
  role: PathwayPublicDaDocumentRole;
  contentType: "application/pdf";
  sizeBytes: number;
  labelHash: string;
};

export type PathwayPublicDaEvidenceCatalog = {
  version: typeof PATHWAY_PUBLIC_DA_EVIDENCE_VERSION;
  authority: "BYRON_SHIRE_COUNCIL";
  applicationType: "DEVELOPMENT_APPLICATION";
  applicationNumber: string;
  proposalKind: "FARM_SHED";
  trackerUrl: string;
  addressFingerprint: string;
  propertyLotRefHash: string;
  proposalDescriptionHash: string;
  determination: {
    status: "APPROVED";
    determinedAt: string;
  };
  documents: PathwayPublicDaDocument[];
  sourceObservedAt: string;
  sourceStaleAt: string;
  rawAddressRetained: false;
  directDownloadTokensRetained: false;
};

export type PathwayPublicDaEvidenceAssessment = {
  status: "CATALOG_CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
  reasons: string[];
  catalogDigest: string | null;
  redactedSummary: {
    applicationNumber: string | null;
    proposalKind: "FARM_SHED" | null;
    documentCount: number;
    acceptedRoles: PathwayPublicDaDocumentRole[];
    rawAddressRetained: false;
    directDownloadTokensRetained: false;
    proposalMeasurementsVerified: false;
    planningControlsPackEligible: false;
    submissionSeeEligible: false;
    productionCheckoutEnabled: false;
  };
};

const REQUIRED_ROLES: PathwayPublicDaDocumentRole[] = [
  "APPROVED_PLANS",
  "DETERMINATION",
  "FLOOR_ELEVATION_PLAN",
  "SITE_PLAN",
  "PLANNING_REPORT",
];

const CATALOG_KEYS = new Set([
  "version",
  "authority",
  "applicationType",
  "applicationNumber",
  "proposalKind",
  "trackerUrl",
  "addressFingerprint",
  "propertyLotRefHash",
  "proposalDescriptionHash",
  "determination",
  "documents",
  "sourceObservedAt",
  "sourceStaleAt",
  "rawAddressRetained",
  "directDownloadTokensRetained",
]);

const DETERMINATION_KEYS = new Set(["status", "determinedAt"]);
const DOCUMENT_KEYS = new Set([
  "recordNumber",
  "role",
  "contentType",
  "sizeBytes",
  "labelHash",
]);

const SHA256 = /^[a-f0-9]{64}$/;
const APPLICATION_NUMBER = /^10\.(20\d{2})\.(\d{1,8})\.(\d{1,3})$/;
const RECORD_NUMBER = /^E20\d{2}\/\d{4,8}$/;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const unsupportedKeys = (value: unknown, allowed: Set<string>) =>
  isRecord(value)
    ? Object.keys(value).filter((key) => !allowed.has(key))
    : ["<not-an-object>"];

const parseTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};

const digest = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

const expectedTrackerPath = (applicationNumber: string) => {
  const match = APPLICATION_NUMBER.exec(applicationNumber);
  if (!match) return null;
  const [, year, sequence, suffix] = match;
  return (
    "/masterviewui-external/application/applicationdetails/" +
    ["010", year, sequence.padStart(8, "0"), suffix.padStart(3, "0")].join(".") +
    "/"
  );
};

const trackerUrlMatchesApplication = (
  trackerUrl: string,
  applicationNumber: string,
) => {
  const expectedPath = expectedTrackerPath(applicationNumber);
  if (!expectedPath) return false;
  try {
    const parsed = new URL(trackerUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "datracker.byron.nsw.gov.au" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.pathname.toLowerCase() === expectedPath
    );
  } catch {
    return false;
  }
};

export function assessPathwayPublicDaEvidenceCatalog(
  input: PathwayPublicDaEvidenceCatalog,
  now = new Date(),
): PathwayPublicDaEvidenceAssessment {
  const reasons: string[] = [];
  const nowMs = now.getTime();

  for (const key of unsupportedKeys(input, CATALOG_KEYS)) {
    reasons.push("Catalog contains unsupported field " + key + ".");
  }
  for (const key of unsupportedKeys(input.determination, DETERMINATION_KEYS)) {
    reasons.push("Determination contains unsupported field " + key + ".");
  }

  if (input.version !== PATHWAY_PUBLIC_DA_EVIDENCE_VERSION) {
    reasons.push("The public DA evidence catalog version is unsupported.");
  }
  if (input.authority !== "BYRON_SHIRE_COUNCIL") {
    reasons.push("The catalog authority must be Byron Shire Council.");
  }
  if (input.applicationType !== "DEVELOPMENT_APPLICATION") {
    reasons.push("The catalog must describe a development application.");
  }
  if (!APPLICATION_NUMBER.test(input.applicationNumber)) {
    reasons.push("The Byron development application number is invalid.");
  }
  if (!trackerUrlMatchesApplication(input.trackerUrl, input.applicationNumber)) {
    reasons.push("The tracker URL must be the token-free official application page.");
  }
  if (input.proposalKind !== "FARM_SHED") {
    reasons.push("The controlled catalog must describe a farm-shed proposal.");
  }

  for (const [label, value] of [
    ["Address fingerprint", input.addressFingerprint],
    ["Property lot reference", input.propertyLotRefHash],
    ["Proposal description", input.proposalDescriptionHash],
  ] as const) {
    if (!SHA256.test(value)) reasons.push(label + " must be a SHA-256 digest.");
  }

  if (input.rawAddressRetained !== false) {
    reasons.push("The catalog must not retain the raw address.");
  }
  if (input.directDownloadTokensRetained !== false) {
    reasons.push("The catalog must not retain direct document download tokens.");
  }
  if (input.determination.status !== "APPROVED") {
    reasons.push("The controlled public DA must be approved.");
  }

  const determinedAt = parseTimestamp(input.determination.determinedAt);
  const observedAt = parseTimestamp(input.sourceObservedAt);
  const staleAt = parseTimestamp(input.sourceStaleAt);
  if (determinedAt === null || determinedAt > nowMs) {
    reasons.push("The determination date is invalid or in the future.");
  }
  if (observedAt === null || observedAt > nowMs) {
    reasons.push("The source observation date is invalid or in the future.");
  }
  if (staleAt === null || staleAt <= nowMs) {
    reasons.push("The official application inventory is stale.");
  }
  if (
    determinedAt !== null &&
    observedAt !== null &&
    observedAt < determinedAt
  ) {
    reasons.push("The official source cannot be observed before determination.");
  }

  const documents = Array.isArray(input.documents) ? input.documents : [];
  if (documents.length < REQUIRED_ROLES.length || documents.length > 20) {
    reasons.push("The catalog must contain the required official documents.");
  }

  const recordNumbers = new Set<string>();
  documents.forEach((document, index) => {
    for (const key of unsupportedKeys(document, DOCUMENT_KEYS)) {
      reasons.push(
        "Document " + (index + 1) + " contains unsupported field " + key + ".",
      );
    }
    if (!RECORD_NUMBER.test(document.recordNumber)) {
      reasons.push("Document " + (index + 1) + " has an invalid record number.");
    }
    if (recordNumbers.has(document.recordNumber)) {
      reasons.push("Document record numbers must be unique.");
    }
    recordNumbers.add(document.recordNumber);
    if (!PATHWAY_PUBLIC_DA_DOCUMENT_ROLES.includes(document.role)) {
      reasons.push("Document " + (index + 1) + " has an unsupported role.");
    }
    if (document.contentType !== "application/pdf") {
      reasons.push("Document " + (index + 1) + " must be a PDF record.");
    }
    if (
      !Number.isSafeInteger(document.sizeBytes) ||
      document.sizeBytes <= 0 ||
      document.sizeBytes > MAX_DOCUMENT_BYTES
    ) {
      reasons.push("Document " + (index + 1) + " has an invalid file size.");
    }
    if (!SHA256.test(document.labelHash)) {
      reasons.push("Document " + (index + 1) + " label must be hashed.");
    }
  });

  const roles = documents.map((document) => document.role);
  for (const role of REQUIRED_ROLES) {
    if (roles.filter((candidate) => candidate === role).length !== 1) {
      reasons.push(role + " must be represented exactly once.");
    }
  }

  const acceptedRoles = [...new Set(roles)]
    .filter((role): role is PathwayPublicDaDocumentRole =>
      PATHWAY_PUBLIC_DA_DOCUMENT_ROLES.includes(role),
    )
    .sort();

  const redactedSummary: PathwayPublicDaEvidenceAssessment["redactedSummary"] = {
    applicationNumber: APPLICATION_NUMBER.test(input.applicationNumber)
      ? input.applicationNumber
      : null,
    proposalKind: input.proposalKind === "FARM_SHED" ? "FARM_SHED" : null,
    documentCount: documents.length,
    acceptedRoles,
    rawAddressRetained: false,
    directDownloadTokensRetained: false,
    proposalMeasurementsVerified: false,
    planningControlsPackEligible: false,
    submissionSeeEligible: false,
    productionCheckoutEnabled: false,
  };

  if (reasons.length) {
    return {
      status: "MORE_EVIDENCE_REQUIRED",
      reasons: [...new Set(reasons)],
      catalogDigest: null,
      redactedSummary,
    };
  }

  return {
    status: "CATALOG_CONFIRMED",
    reasons: [],
    catalogDigest: digest({
      ...input,
      documents: [...documents].sort((left, right) =>
        left.recordNumber.localeCompare(right.recordNumber),
      ),
    }),
    redactedSummary,
  };
}

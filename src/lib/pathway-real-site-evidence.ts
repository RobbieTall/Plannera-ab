import { createHash } from "node:crypto";

export const PATHWAY_REAL_SITE_EVIDENCE_VERSION =
  "byron-ru2-shed-real-site-evidence.v2" as const;

export type PathwayRealSiteDocumentRole =
  | "ROAD_CLASSIFICATION"
  | "REGISTERED_CADASTRAL_PLAN"
  | "CADASTRAL_SURVEY"
  | "PROPOSED_SHED_LAYOUT";

export type PathwayRealSiteAuthority =
  | "TRANSPORT_FOR_NSW"
  | "BYRON_SHIRE_COUNCIL"
  | "NSW_LAND_REGISTRY_SERVICES"
  | "REGISTERED_SURVEYOR"
  | "APPLICANT";

export type PathwayRealSiteDocument = {
  role: PathwayRealSiteDocumentRole;
  uploadRef: string;
  contentHash: string;
  evidenceStatus: "READY" | "PARTIALLY_READABLE" | "IMAGE_ONLY" | "NEEDS_REVIEW";
  indexingStatus: "READY" | "PENDING" | "FAILED" | "NOT_APPLICABLE";
  authority: PathwayRealSiteAuthority;
  sourceVersion: string;
  sourceReferenceHash: string;
  issuedAt: string;
  retrievedAt: string;
  staleAt: string;
  basisContentHash: string | null;
  verification: {
    status: "EVIDENCE_VERIFIED";
    reviewerRef: string;
    reviewedAt: string;
    reviewNotesHash: string;
  };
};

export type PathwayRealSiteMeasurementKey =
  | "SHED_FOOTPRINT_SQM"
  | "SHED_HEIGHT_M"
  | "ROAD_SETBACK_M"
  | "SIDE_SETBACK_M"
  | "REAR_SETBACK_M";

export type PathwayRealSiteMeasurement = {
  key: PathwayRealSiteMeasurementKey;
  value: number;
  unit: "m" | "sqm";
  sourceRole: "PROPOSED_SHED_LAYOUT";
  pageReference: string;
  method: "PLAN_DIMENSION" | "SURVEY_MEASUREMENT" | "DOCUMENT_STATED";
};

export type PathwayRealSiteParcelAreaReconciliation = {
  registeredPlanAreaSqm: number;
  detailSurveyAreaSqm: number;
  resolvedAreaSqm: number;
  resolutionMethod: "REGISTERED_PLAN_CONTROLS";
  registeredPlanSourceRole: "REGISTERED_CADASTRAL_PLAN";
  detailSurveySourceRole: "CADASTRAL_SURVEY";
  registeredPlanPageReference: string;
  detailSurveyPageReference: string;
};

export type PathwayRealSiteEvidencePackage = {
  version: typeof PATHWAY_REAL_SITE_EVIDENCE_VERSION;
  projectRef: string;
  documents: PathwayRealSiteDocument[];
  roadClassification: {
    category: "CLASSIFIED_ROAD" | "OTHER_ROAD";
    sourceRole: "ROAD_CLASSIFICATION";
    sourceReferenceHash: string;
    matchMethod:
      | "POSITIVE_TFNSW_STATE_OR_REGIONAL_MATCH"
      | "EXPLICIT_BYRON_COUNCIL_CONFIRMATION";
  };
  parcelAreaReconciliation: PathwayRealSiteParcelAreaReconciliation;
  measurements: PathwayRealSiteMeasurement[];
};

export type ConfirmedPathwayRealSiteEvidence = {
  version: typeof PATHWAY_REAL_SITE_EVIDENCE_VERSION;
  siteEvidenceDigest: string;
  roadCategory: "CLASSIFIED_ROAD" | "OTHER_ROAD";
  landAreaSqm: number;
  shedFootprintSqm: number;
  shedHeightM: number;
  roadSetbackM: number;
  sideSetbackM: number;
  rearSetbackM: number;
  evidenceVerifiedAt: string;
};

export type PathwayRealSiteEvidenceAssessment = {
  status: "EVIDENCE_CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
  reasons: string[];
  confirmedEvidence: ConfirmedPathwayRealSiteEvidence | null;
  redactedSummary: {
    acceptedDocumentCount: number;
    acceptedRoles: PathwayRealSiteDocumentRole[];
    acceptedMeasurementKeys: PathwayRealSiteMeasurementKey[];
    manuallyReviewedRoles: PathwayRealSiteDocumentRole[];
    roadCategory: "CLASSIFIED_ROAD" | "OTHER_ROAD" | null;
    registeredPlanVerified: boolean;
    parcelAreaReconciled: boolean;
    legalSetbacksVerified: boolean;
    containsRawSiteIdentifiers: false;
    packEligibilityUnlocked: false;
    submissionSeeEligibilityUnlocked: false;
    productionCheckoutEnabled: false;
  };
};

const PACKAGE_KEYS = new Set([
  "version",
  "projectRef",
  "documents",
  "roadClassification",
  "parcelAreaReconciliation",
  "measurements",
]);
const DOCUMENT_KEYS = new Set([
  "role",
  "uploadRef",
  "contentHash",
  "evidenceStatus",
  "indexingStatus",
  "authority",
  "sourceVersion",
  "sourceReferenceHash",
  "issuedAt",
  "retrievedAt",
  "staleAt",
  "basisContentHash",
  "verification",
]);
const VERIFICATION_KEYS = new Set([
  "status",
  "reviewerRef",
  "reviewedAt",
  "reviewNotesHash",
]);
const ROAD_KEYS = new Set([
  "category",
  "sourceRole",
  "sourceReferenceHash",
  "matchMethod",
]);
const PARCEL_RECONCILIATION_KEYS = new Set([
  "registeredPlanAreaSqm",
  "detailSurveyAreaSqm",
  "resolvedAreaSqm",
  "resolutionMethod",
  "registeredPlanSourceRole",
  "detailSurveySourceRole",
  "registeredPlanPageReference",
  "detailSurveyPageReference",
]);
const MEASUREMENT_KEYS = new Set([
  "key",
  "value",
  "unit",
  "sourceRole",
  "pageReference",
  "method",
]);

const REQUIRED_ROLES: PathwayRealSiteDocumentRole[] = [
  "ROAD_CLASSIFICATION",
  "REGISTERED_CADASTRAL_PLAN",
  "CADASTRAL_SURVEY",
  "PROPOSED_SHED_LAYOUT",
];
const REQUIRED_MEASUREMENTS: PathwayRealSiteMeasurementKey[] = [
  "SHED_FOOTPRINT_SQM",
  "SHED_HEIGHT_M",
  "ROAD_SETBACK_M",
  "SIDE_SETBACK_M",
  "REAR_SETBACK_M",
];
const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const PAGE_REF = /^(page|sheet)-[A-Za-z0-9._-]{1,40}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const unknownKeys = (value: unknown, allowed: Set<string>) =>
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

const pushUnknownKeyReasons = (
  reasons: string[],
  label: string,
  value: unknown,
  allowed: Set<string>,
) => {
  for (const key of unknownKeys(value, allowed)) {
    reasons.push(label + " contains unsupported field " + key + ".");
  }
};

const hasExactlyOnce = <T extends string>(values: T[], required: T) =>
  values.filter((value) => value === required).length === 1;

const measurementValue = (
  measurements: PathwayRealSiteMeasurement[],
  key: PathwayRealSiteMeasurementKey,
) => measurements.find((measurement) => measurement.key === key)?.value ?? null;

export const assessPathwayRealSiteEvidence = (
  input: PathwayRealSiteEvidencePackage,
  now = new Date(),
): PathwayRealSiteEvidenceAssessment => {
  const reasons: string[] = [];
  const nowMs = now.getTime();

  pushUnknownKeyReasons(reasons, "Evidence package", input, PACKAGE_KEYS);

  if (input.version !== PATHWAY_REAL_SITE_EVIDENCE_VERSION) {
    reasons.push("The real-site evidence contract version is unsupported.");
  }
  if (!OPAQUE_REF.test(input.projectRef)) {
    reasons.push("The project reference must be an opaque non-identifying token.");
  }
  if (!Array.isArray(input.documents)) {
    reasons.push("Evidence documents are required.");
  }
  if (!Array.isArray(input.measurements)) {
    reasons.push("Proposal measurements are required.");
  }
  pushUnknownKeyReasons(
    reasons,
    "Parcel-area reconciliation",
    input.parcelAreaReconciliation,
    PARCEL_RECONCILIATION_KEYS,
  );

  const documents = Array.isArray(input.documents) ? input.documents : [];
  const measurements = Array.isArray(input.measurements) ? input.measurements : [];
  const roles = documents.map((document) => document.role);
  const measurementKeys = measurements.map((measurement) => measurement.key);

  for (const role of REQUIRED_ROLES) {
    if (!hasExactlyOnce(roles, role)) {
      reasons.push(role + " must be supplied exactly once.");
    }
  }
  if (documents.length !== REQUIRED_ROLES.length) {
    reasons.push("The evidence package must contain only the four required document roles.");
  }

  const documentsByRole = new Map(
    documents.map((document) => [document.role, document] as const),
  );

  documents.forEach((document, index) => {
    pushUnknownKeyReasons(
      reasons,
      "Document " + (index + 1),
      document,
      DOCUMENT_KEYS,
    );
    pushUnknownKeyReasons(
      reasons,
      "Document " + (index + 1) + " verification",
      document.verification,
      VERIFICATION_KEYS,
    );

    if (!REQUIRED_ROLES.includes(document.role)) {
      reasons.push("Document " + (index + 1) + " has an unsupported role.");
    }
    if (!OPAQUE_REF.test(document.uploadRef)) {
      reasons.push(document.role + " upload reference must be opaque.");
    }
    if (!SHA256.test(document.contentHash)) {
      reasons.push(document.role + " content hash must be a SHA-256 digest.");
    }
    if (!SHA256.test(document.sourceReferenceHash)) {
      reasons.push(document.role + " source reference must be hashed.");
    }
    if (!document.sourceVersion || document.sourceVersion.length > 120) {
      reasons.push(document.role + " source version is required.");
    }
    if (document.evidenceStatus === "NEEDS_REVIEW") {
      reasons.push(document.role + " still needs evidence review.");
    }
    if (
      document.indexingStatus !== "READY" &&
      document.indexingStatus !== "NOT_APPLICABLE"
    ) {
      reasons.push(document.role + " indexing is not in an accepted terminal state.");
    }

    const issuedAt = parseTimestamp(document.issuedAt);
    const retrievedAt = parseTimestamp(document.retrievedAt);
    const staleAt = parseTimestamp(document.staleAt);
    const reviewedAt = parseTimestamp(document.verification.reviewedAt);

    if (issuedAt === null || issuedAt > nowMs) {
      reasons.push(document.role + " issued date is invalid or in the future.");
    }
    if (retrievedAt === null || retrievedAt > nowMs) {
      reasons.push(document.role + " retrieval date is invalid or in the future.");
    }
    if (staleAt === null || staleAt <= nowMs) {
      reasons.push(document.role + " evidence is stale or has no valid currentness boundary.");
    }
    if (
      reviewedAt === null ||
      reviewedAt > nowMs ||
      (retrievedAt !== null && reviewedAt < retrievedAt)
    ) {
      reasons.push(document.role + " evidence verification time is invalid.");
    }
    if (document.verification.status !== "EVIDENCE_VERIFIED") {
      reasons.push(document.role + " has not been evidence-verified.");
    }
    if (!OPAQUE_REF.test(document.verification.reviewerRef)) {
      reasons.push(document.role + " reviewer reference must be opaque.");
    }
    if (!SHA256.test(document.verification.reviewNotesHash)) {
      reasons.push(document.role + " review notes must be represented by a SHA-256 digest.");
    }
  });

  const roadDocument = documentsByRole.get("ROAD_CLASSIFICATION");
  const registeredPlanDocument = documentsByRole.get("REGISTERED_CADASTRAL_PLAN");
  const surveyDocument = documentsByRole.get("CADASTRAL_SURVEY");
  const layoutDocument = documentsByRole.get("PROPOSED_SHED_LAYOUT");

  if (
    registeredPlanDocument &&
    registeredPlanDocument.authority !== "NSW_LAND_REGISTRY_SERVICES"
  ) {
    reasons.push("The registered cadastral plan must be attributed to NSW Land Registry Services.");
  }

  if (
    surveyDocument &&
    surveyDocument.authority !== "REGISTERED_SURVEYOR"
  ) {
    reasons.push("The cadastral survey must be attributed to a registered surveyor.");
  }
  if (
    layoutDocument &&
    layoutDocument.authority !== "REGISTERED_SURVEYOR" &&
    layoutDocument.authority !== "APPLICANT"
  ) {
    reasons.push("The proposed shed layout has an unsupported authority.");
  }
  if (
    layoutDocument &&
    surveyDocument &&
    layoutDocument.basisContentHash !== surveyDocument.contentHash
  ) {
    reasons.push("The proposed shed layout must bind to the current cadastral survey hash.");
  }
  if (
    surveyDocument &&
    registeredPlanDocument &&
    surveyDocument.basisContentHash !== registeredPlanDocument.contentHash
  ) {
    reasons.push("The cadastral survey must reconcile to the registered cadastral plan hash.");
  }
  if (registeredPlanDocument?.basisContentHash !== null) {
    reasons.push("The registered cadastral plan cannot declare another document as its boundary basis.");
  }
  if (roadDocument?.basisContentHash !== null) {
    reasons.push("The road-classification document cannot declare a boundary basis.");
  }

  const reconciliation = input.parcelAreaReconciliation;
  const positiveArea = (value: number) => Number.isFinite(value) && value > 0;
  const parcelAreaReconciled =
    positiveArea(reconciliation?.registeredPlanAreaSqm) &&
    positiveArea(reconciliation?.detailSurveyAreaSqm) &&
    positiveArea(reconciliation?.resolvedAreaSqm) &&
    reconciliation?.resolvedAreaSqm === reconciliation?.registeredPlanAreaSqm &&
    reconciliation?.resolutionMethod === "REGISTERED_PLAN_CONTROLS" &&
    reconciliation?.registeredPlanSourceRole === "REGISTERED_CADASTRAL_PLAN" &&
    reconciliation?.detailSurveySourceRole === "CADASTRAL_SURVEY" &&
    PAGE_REF.test(reconciliation?.registeredPlanPageReference ?? "") &&
    PAGE_REF.test(reconciliation?.detailSurveyPageReference ?? "");
  if (!parcelAreaReconciled) {
    reasons.push("Parcel area must be explicitly reconciled to the registered cadastral plan.");
  }

  pushUnknownKeyReasons(
    reasons,
    "Road classification",
    input.roadClassification,
    ROAD_KEYS,
  );
  const road = input.roadClassification;
  if (road.sourceRole !== "ROAD_CLASSIFICATION") {
    reasons.push("Road classification must cite the road-classification document.");
  }
  if (!SHA256.test(road.sourceReferenceHash)) {
    reasons.push("Road classification source reference must be hashed.");
  }
  if (
    roadDocument &&
    road.sourceReferenceHash !== roadDocument.sourceReferenceHash
  ) {
    reasons.push("Road classification does not bind to the accepted source reference.");
  }
  if (road.category === "CLASSIFIED_ROAD") {
    if (road.matchMethod !== "POSITIVE_TFNSW_STATE_OR_REGIONAL_MATCH") {
      reasons.push("A classified road requires a positive current TfNSW State/Regional match.");
    }
    if (roadDocument?.authority !== "TRANSPORT_FOR_NSW") {
      reasons.push("A classified-road source must be Transport for NSW.");
    }
  } else if (road.category === "OTHER_ROAD") {
    if (road.matchMethod !== "EXPLICIT_BYRON_COUNCIL_CONFIRMATION") {
      reasons.push("An other road requires explicit current Byron Council confirmation.");
    }
    if (roadDocument?.authority !== "BYRON_SHIRE_COUNCIL") {
      reasons.push("An other-road source must be Byron Shire Council.");
    }
  } else {
    reasons.push("Road category is unsupported.");
  }

  for (const key of REQUIRED_MEASUREMENTS) {
    if (!hasExactlyOnce(measurementKeys, key)) {
      reasons.push(key + " must be supplied exactly once.");
    }
  }
  if (measurements.length !== REQUIRED_MEASUREMENTS.length) {
    reasons.push("The evidence package must contain only the five required measurements.");
  }

  measurements.forEach((measurement, index) => {
    pushUnknownKeyReasons(
      reasons,
      "Measurement " + (index + 1),
      measurement,
      MEASUREMENT_KEYS,
    );
    if (!REQUIRED_MEASUREMENTS.includes(measurement.key)) {
      reasons.push("Measurement " + (index + 1) + " has an unsupported key.");
    }
    if (!Number.isFinite(measurement.value) || measurement.value <= 0) {
      reasons.push(measurement.key + " must be a positive finite number.");
    }
    const requiredUnit = measurement.key === "SHED_FOOTPRINT_SQM" ? "sqm" : "m";
    if (measurement.unit !== requiredUnit) {
      reasons.push(measurement.key + " must use " + requiredUnit + ".");
    }
    if (measurement.sourceRole !== "PROPOSED_SHED_LAYOUT") {
      reasons.push(measurement.key + " must cite the proposed shed layout.");
    }
    if (!PAGE_REF.test(measurement.pageReference)) {
      reasons.push(measurement.key + " requires a non-identifying page or sheet reference.");
    }
    if (
      ["ROAD_SETBACK_M", "SIDE_SETBACK_M", "REAR_SETBACK_M"].includes(
        measurement.key,
      ) &&
      measurement.method !== "SURVEY_MEASUREMENT"
    ) {
      reasons.push(measurement.key + " must be promoted from a survey measurement.");
    }
  });

  const legalSetbacksVerified = ["ROAD_SETBACK_M", "SIDE_SETBACK_M", "REAR_SETBACK_M"].every(
    (key) =>
      measurements.find((measurement) => measurement.key === key)?.method ===
      "SURVEY_MEASUREMENT",
  );
  const registeredPlanVerified =
    registeredPlanDocument?.authority === "NSW_LAND_REGISTRY_SERVICES" &&
    registeredPlanDocument.verification.status === "EVIDENCE_VERIFIED";
  const acceptedRoles = REQUIRED_ROLES.filter((role) =>
    hasExactlyOnce(roles, role),
  );
  const acceptedMeasurementKeys = REQUIRED_MEASUREMENTS.filter((key) =>
    hasExactlyOnce(measurementKeys, key),
  );
  const manuallyReviewedRoles = documents
    .filter(
      (document) =>
        document.evidenceStatus === "IMAGE_ONLY" ||
        document.evidenceStatus === "PARTIALLY_READABLE",
    )
    .map((document) => document.role)
    .filter((role): role is PathwayRealSiteDocumentRole =>
      REQUIRED_ROLES.includes(role),
    );

  const redactedSummary: PathwayRealSiteEvidenceAssessment["redactedSummary"] = {
    acceptedDocumentCount: acceptedRoles.length,
    acceptedRoles,
    acceptedMeasurementKeys,
    manuallyReviewedRoles,
    roadCategory:
      road.category === "CLASSIFIED_ROAD" || road.category === "OTHER_ROAD"
        ? road.category
        : null,
    registeredPlanVerified,
    parcelAreaReconciled,
    legalSetbacksVerified,
    containsRawSiteIdentifiers: false,
    packEligibilityUnlocked: false,
    submissionSeeEligibilityUnlocked: false,
    productionCheckoutEnabled: false,
  };

  if (reasons.length) {
    return {
      status: "MORE_EVIDENCE_REQUIRED",
      reasons: Array.from(new Set(reasons)),
      confirmedEvidence: null,
      redactedSummary,
    };
  }

  const evidenceVerifiedAt = new Date(
    Math.max(
      ...documents.map(
        (document) => parseTimestamp(document.verification.reviewedAt) ?? 0,
      ),
    ),
  ).toISOString();
  const normalizedDocuments = [...documents].sort((left, right) =>
    left.role.localeCompare(right.role),
  );
  const normalizedMeasurements = [...measurements].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const siteEvidenceDigest = digest({
    version: input.version,
    projectRef: input.projectRef,
    documents: normalizedDocuments,
    roadClassification: input.roadClassification,
    parcelAreaReconciliation: input.parcelAreaReconciliation,
    measurements: normalizedMeasurements,
  });

  return {
    status: "EVIDENCE_CONFIRMED",
    reasons: [],
    confirmedEvidence: {
      version: PATHWAY_REAL_SITE_EVIDENCE_VERSION,
      siteEvidenceDigest,
      roadCategory: road.category,
      landAreaSqm: input.parcelAreaReconciliation.resolvedAreaSqm,
      shedFootprintSqm: measurementValue(measurements, "SHED_FOOTPRINT_SQM")!,
      shedHeightM: measurementValue(measurements, "SHED_HEIGHT_M")!,
      roadSetbackM: measurementValue(measurements, "ROAD_SETBACK_M")!,
      sideSetbackM: measurementValue(measurements, "SIDE_SETBACK_M")!,
      rearSetbackM: measurementValue(measurements, "REAR_SETBACK_M")!,
      evidenceVerifiedAt,
    },
    redactedSummary,
  };
};

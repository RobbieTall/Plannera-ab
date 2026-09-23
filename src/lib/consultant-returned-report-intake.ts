import type { ConsultantReferralStatus } from "@/types/consultant-referral";
import type { PathwayPrivateEvidenceRole } from "./pathway-private-evidence-upload";

export const CONSULTANT_RETURNED_REPORT_INTAKE_VERSION =
  "consultant-returned-report-intake.v1" as const;

export type ConsultantReturnedReportIntakeBlocker =
  | "PREVIEW_ONLY"
  | "FEATURE_DISABLED"
  | "INVALID_REQUEST"
  | "REFERRAL_NOT_FOUND"
  | "REFERRAL_NOT_DELIVERED"
  | "RETURN_BINDING_NOT_FOUND"
  | "PROJECT_SCOPE_MISMATCH"
  | "REFERRAL_SCOPE_MISMATCH"
  | "PACKAGE_DIGEST_MISMATCH"
  | "DISCIPLINE_NOT_REQUESTED"
  | "PRIVATE_EVIDENCE_NOT_FOUND"
  | "PRIVATE_EVIDENCE_ROLE_MISMATCH"
  | "CONTENT_HASH_MISMATCH"
  | "SECURITY_OR_REVIEW_PENDING"
  | "PRIVATE_EVIDENCE_REJECTED"
  | "PERSISTENCE_REQUIRED";

export type ConsultantReturnedReportIntakeRequest = {
  version: typeof CONSULTANT_RETURNED_REPORT_INTAKE_VERSION;
  environment: "preview" | "production" | "development";
  featureEnabled: boolean;
  referralId: string;
  evidenceRef: string;
};

export type ConsultantReturnedReportReferralRecord = {
  id: string;
  projectId: string;
  scopeKey: string;
  packageDigest: string;
  status: ConsultantReferralStatus;
  eventStatuses: ConsultantReferralStatus[];
  requestedDisciplineIds: string[];
};

export type ConsultantReturnedReportBindingRecord = {
  recordSource: "SERVER_CONSULTANT_REPORT_BINDING";
  evidenceRef: string;
  referralId: string;
  projectId: string;
  referralScopeKey: string;
  packageDigest: string;
  disciplineId: string;
  contentHash: string;
  receivedAt: string;
};

export type ConsultantReturnedReportPrivateEvidenceRecord = {
  evidenceRef: string;
  role: PathwayPrivateEvidenceRole;
  contentHash: string;
  status: "QUARANTINED" | "READY_FOR_EVIDENCE_PACKAGE" | "REJECTED";
};

export type ConsultantReturnedReportIntakeDependencies = {
  loadReferral: (
    referralId: string,
  ) => Promise<ConsultantReturnedReportReferralRecord | null>;
  loadReturnBinding: (
    evidenceRef: string,
  ) => Promise<ConsultantReturnedReportBindingRecord | null>;
  loadPrivateEvidence: (
    evidenceRef: string,
  ) => Promise<ConsultantReturnedReportPrivateEvidenceRecord | null>;
  markBoundForEvidencePackage: (input: {
    referralId: string;
    evidenceRef: string;
    projectId: string;
    disciplineId: string;
    contentHash: string;
  }) => Promise<void>;
};

export type ConsultantReturnedReportIntakeResult = {
  version: typeof CONSULTANT_RETURNED_REPORT_INTAKE_VERSION;
  status:
    | "DENIED"
    | "QUARANTINED"
    | "REJECTED"
    | "READY_FOR_EVIDENCE_PACKAGE";
  blockers: ConsultantReturnedReportIntakeBlocker[];
  redactedSummary: {
    referralDelivered: boolean;
    exactProjectScopeMatched: boolean;
    exactReferralScopeMatched: boolean;
    packageDigestMatched: boolean;
    requestedDisciplineMatched: boolean;
    consultantReportRoleConfirmed: boolean;
    contentHashMatched: boolean;
    privateEvidenceReady: boolean;
    enteredEvidencePackage: boolean;
    containsReferralIdentifier: false;
    containsEvidenceReference: false;
    containsContentHash: false;
    planningControlsPackEligible: false;
    submissionSeeEligible: false;
    productionCheckoutEnabled: false;
  };
};

const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DISCIPLINE_ID = /^[a-z0-9_]{2,80}$/;

const DELIVERED_REFERRAL_STATES = new Set<ConsultantReferralStatus>([
  "ASSIGNED",
  "CONSULTANT_ACKNOWLEDGED",
]);

const REQUEST_KEYS = new Set([
  "version",
  "environment",
  "featureEnabled",
  "referralId",
  "evidenceRef",
]);
const BINDING_KEYS = new Set([
  "recordSource",
  "evidenceRef",
  "referralId",
  "projectId",
  "referralScopeKey",
  "packageDigest",
  "disciplineId",
  "contentHash",
  "receivedAt",
]);
const EVIDENCE_KEYS = new Set(["evidenceRef", "role", "contentHash", "status"]);

const hasOnlyKeys = (value: unknown, allowed: Set<string>) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value as Record<string, unknown>).every((key) => allowed.has(key));

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const baseResult = (
  status: ConsultantReturnedReportIntakeResult["status"],
  blockers: ConsultantReturnedReportIntakeBlocker[],
  facts: Partial<ConsultantReturnedReportIntakeResult["redactedSummary"]> = {},
): ConsultantReturnedReportIntakeResult => ({
  version: CONSULTANT_RETURNED_REPORT_INTAKE_VERSION,
  status,
  blockers: unique(blockers),
  redactedSummary: {
    referralDelivered: false,
    exactProjectScopeMatched: false,
    exactReferralScopeMatched: false,
    packageDigestMatched: false,
    requestedDisciplineMatched: false,
    consultantReportRoleConfirmed: false,
    contentHashMatched: false,
    privateEvidenceReady: false,
    enteredEvidencePackage: false,
    containsReferralIdentifier: false,
    containsEvidenceReference: false,
    containsContentHash: false,
    planningControlsPackEligible: false,
    submissionSeeEligible: false,
    productionCheckoutEnabled: false,
    ...facts,
  },
});

const validRequest = (request: ConsultantReturnedReportIntakeRequest) =>
  hasOnlyKeys(request, REQUEST_KEYS) &&
  request.version === CONSULTANT_RETURNED_REPORT_INTAKE_VERSION &&
  OPAQUE_REF.test(request.referralId) &&
  OPAQUE_REF.test(request.evidenceRef);

export async function intakeConsultantReturnedReport(
  request: ConsultantReturnedReportIntakeRequest,
  deps: ConsultantReturnedReportIntakeDependencies,
): Promise<ConsultantReturnedReportIntakeResult> {
  if (!validRequest(request)) {
    return baseResult("DENIED", ["INVALID_REQUEST"]);
  }
  if (request.environment !== "preview") {
    return baseResult("DENIED", ["PREVIEW_ONLY"]);
  }
  if (!request.featureEnabled) {
    return baseResult("DENIED", ["FEATURE_DISABLED"]);
  }

  const referral = await deps.loadReferral(request.referralId);
  if (!referral) {
    return baseResult("DENIED", ["REFERRAL_NOT_FOUND"]);
  }

  const referralDelivered = referral.eventStatuses.some((status) =>
    DELIVERED_REFERRAL_STATES.has(status),
  );
  if (!referralDelivered) {
    return baseResult("DENIED", ["REFERRAL_NOT_DELIVERED"]);
  }

  const binding = await deps.loadReturnBinding(request.evidenceRef);
  if (!binding || !hasOnlyKeys(binding, BINDING_KEYS)) {
    return baseResult("DENIED", ["RETURN_BINDING_NOT_FOUND"], {
      referralDelivered,
    });
  }

  const bindingReferenceMatched = binding.evidenceRef === request.evidenceRef;
  const bindingSourceValid = binding.recordSource === "SERVER_CONSULTANT_REPORT_BINDING";
  const receivedAtValid = Number.isFinite(Date.parse(binding.receivedAt));
  if (!bindingReferenceMatched || !bindingSourceValid || !receivedAtValid) {
    return baseResult("DENIED", ["RETURN_BINDING_NOT_FOUND"], {
      referralDelivered,
    });
  }

  const exactProjectScopeMatched = binding.projectId === referral.projectId;
  const exactReferralScopeMatched =
    binding.referralId === referral.id &&
    binding.referralScopeKey === referral.scopeKey;
  const packageDigestMatched = binding.packageDigest === referral.packageDigest;
  const requestedDisciplineMatched =
    DISCIPLINE_ID.test(binding.disciplineId) &&
    referral.requestedDisciplineIds.includes(binding.disciplineId);

  const scopeBlockers: ConsultantReturnedReportIntakeBlocker[] = [];
  if (!exactProjectScopeMatched) scopeBlockers.push("PROJECT_SCOPE_MISMATCH");
  if (!exactReferralScopeMatched) scopeBlockers.push("REFERRAL_SCOPE_MISMATCH");
  if (!packageDigestMatched) scopeBlockers.push("PACKAGE_DIGEST_MISMATCH");
  if (!requestedDisciplineMatched) scopeBlockers.push("DISCIPLINE_NOT_REQUESTED");

  if (scopeBlockers.length) {
    return baseResult("DENIED", scopeBlockers, {
      referralDelivered,
      exactProjectScopeMatched,
      exactReferralScopeMatched,
      packageDigestMatched,
      requestedDisciplineMatched,
    });
  }

  const evidence = await deps.loadPrivateEvidence(request.evidenceRef);
  if (!evidence || !hasOnlyKeys(evidence, EVIDENCE_KEYS) || evidence.evidenceRef !== request.evidenceRef) {
    return baseResult("DENIED", ["PRIVATE_EVIDENCE_NOT_FOUND"], {
      referralDelivered,
      exactProjectScopeMatched,
      exactReferralScopeMatched,
      packageDigestMatched,
      requestedDisciplineMatched,
    });
  }

  const consultantReportRoleConfirmed =
    evidence.role === "CONSULTANT_REPORT";
  const contentHashMatched =
    SHA256.test(binding.contentHash) &&
    binding.evidenceRef === evidence.evidenceRef &&
    binding.contentHash === evidence.contentHash;

  if (!consultantReportRoleConfirmed || !contentHashMatched) {
    return baseResult(
      "DENIED",
      [
        ...(!consultantReportRoleConfirmed
          ? (["PRIVATE_EVIDENCE_ROLE_MISMATCH"] as const)
          : []),
        ...(!contentHashMatched
          ? (["CONTENT_HASH_MISMATCH"] as const)
          : []),
      ],
      {
        referralDelivered,
        exactProjectScopeMatched,
        exactReferralScopeMatched,
        packageDigestMatched,
        requestedDisciplineMatched,
        consultantReportRoleConfirmed,
        contentHashMatched,
      },
    );
  }

  if (evidence.status === "REJECTED") {
    return baseResult("REJECTED", ["PRIVATE_EVIDENCE_REJECTED"], {
      referralDelivered,
      exactProjectScopeMatched,
      exactReferralScopeMatched,
      packageDigestMatched,
      requestedDisciplineMatched,
      consultantReportRoleConfirmed,
      contentHashMatched,
    });
  }

  if (evidence.status !== "READY_FOR_EVIDENCE_PACKAGE") {
    return baseResult("QUARANTINED", ["SECURITY_OR_REVIEW_PENDING"], {
      referralDelivered,
      exactProjectScopeMatched,
      exactReferralScopeMatched,
      packageDigestMatched,
      requestedDisciplineMatched,
      consultantReportRoleConfirmed,
      contentHashMatched,
    });
  }

  try {
    await deps.markBoundForEvidencePackage({
      referralId: referral.id,
      evidenceRef: evidence.evidenceRef,
      projectId: referral.projectId,
      disciplineId: binding.disciplineId,
      contentHash: evidence.contentHash,
    });
  } catch {
    return baseResult("QUARANTINED", ["PERSISTENCE_REQUIRED"], {
      referralDelivered,
      exactProjectScopeMatched,
      exactReferralScopeMatched,
      packageDigestMatched,
      requestedDisciplineMatched,
      consultantReportRoleConfirmed,
      contentHashMatched,
      privateEvidenceReady: true,
    });
  }

  return baseResult("READY_FOR_EVIDENCE_PACKAGE", [], {
    referralDelivered,
    exactProjectScopeMatched,
    exactReferralScopeMatched,
    packageDigestMatched,
    requestedDisciplineMatched,
    consultantReportRoleConfirmed,
    contentHashMatched,
    privateEvidenceReady: true,
    enteredEvidencePackage: true,
  });
}

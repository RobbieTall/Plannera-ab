import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSULTANT_RETURNED_REPORT_INTAKE_VERSION,
  intakeConsultantReturnedReport,
  type ConsultantReturnedReportBindingRecord,
  type ConsultantReturnedReportPrivateEvidenceRecord,
  type ConsultantReturnedReportReferralRecord,
} from "../src/lib/consultant-returned-report-intake";

const referral: ConsultantReturnedReportReferralRecord = {
  id: "referral_123456",
  projectId: "project_123456",
  scopeKey: "scope_123456",
  packageDigest: "a".repeat(64),
  status: "CONSULTANT_ACKNOWLEDGED",
  eventStatuses: ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "CONSULTANT_ACKNOWLEDGED"],
  requestedDisciplineIds: ["traffic_transport", "town_planning"],
};

const binding: ConsultantReturnedReportBindingRecord = {
  recordSource: "SERVER_CONSULTANT_REPORT_BINDING",
  evidenceRef: "ev_1234567890abcdef",
  referralId: referral.id,
  projectId: referral.projectId,
  referralScopeKey: referral.scopeKey,
  packageDigest: referral.packageDigest,
  disciplineId: "traffic_transport",
  contentHash: "b".repeat(64),
  receivedAt: "2026-09-24T00:00:00.000Z",
};

const evidence: ConsultantReturnedReportPrivateEvidenceRecord = {
  evidenceRef: binding.evidenceRef,
  role: "CONSULTANT_REPORT",
  contentHash: binding.contentHash,
  status: "READY_FOR_EVIDENCE_PACKAGE",
};

const request = {
  version: CONSULTANT_RETURNED_REPORT_INTAKE_VERSION,
  environment: "preview" as const,
  featureEnabled: true,
  referralId: referral.id,
  evidenceRef: binding.evidenceRef,
};

const makeDeps = (overrides: {
  referral?: ConsultantReturnedReportReferralRecord | null;
  binding?: ConsultantReturnedReportBindingRecord | null;
  evidence?: ConsultantReturnedReportPrivateEvidenceRecord | null;
  persistError?: boolean;
} = {}) => {
  const persisted: unknown[] = [];
  return {
    persisted,
    deps: {
      loadReferral: async () =>
        "referral" in overrides ? overrides.referral ?? null : referral,
      loadReturnBinding: async () =>
        "binding" in overrides ? overrides.binding ?? null : binding,
      loadPrivateEvidence: async () =>
        "evidence" in overrides ? overrides.evidence ?? null : evidence,
      markBoundForEvidencePackage: async (input: unknown) => {
        if (overrides.persistError) throw new Error("write unavailable");
        persisted.push(input);
      },
    },
  };
};

test("binds a clean reviewed consultant report to the exact delivered referral without granting commercial readiness", async () => {
  const { deps, persisted } = makeDeps();

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "READY_FOR_EVIDENCE_PACKAGE");
  assert.deepEqual(result.blockers, []);
  assert.equal(result.redactedSummary.enteredEvidencePackage, true);
  assert.equal(result.redactedSummary.privateEvidenceReady, true);
  assert.equal(result.redactedSummary.planningControlsPackEligible, false);
  assert.equal(result.redactedSummary.submissionSeeEligible, false);
  assert.equal(result.redactedSummary.productionCheckoutEnabled, false);
  assert.equal(result.redactedSummary.containsReferralIdentifier, false);
  assert.equal(result.redactedSummary.containsEvidenceReference, false);
  assert.equal(result.redactedSummary.containsContentHash, false);
  assert.equal(persisted.length, 1);
});

test("keeps a returned report quarantined while malware scanning or operator review is still pending", async () => {
  const { deps, persisted } = makeDeps({
    evidence: { ...evidence, status: "QUARANTINED" },
  });

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "QUARANTINED");
  assert.deepEqual(result.blockers, ["SECURITY_OR_REVIEW_PENDING"]);
  assert.equal(result.redactedSummary.enteredEvidencePackage, false);
  assert.equal(persisted.length, 0);
});

test("rejects cross-project, cross-referral and package-digest mismatches before reading evidence readiness", async () => {
  const { deps, persisted } = makeDeps({
    binding: {
      ...binding,
      projectId: "project_other",
      referralId: "referral_other",
      referralScopeKey: "scope_other",
      packageDigest: "c".repeat(64),
    },
  });

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "DENIED");
  assert.deepEqual(
    new Set(result.blockers),
    new Set([
      "PROJECT_SCOPE_MISMATCH",
      "REFERRAL_SCOPE_MISMATCH",
      "PACKAGE_DIGEST_MISMATCH",
    ]),
  );
  assert.equal(persisted.length, 0);
});

test("rejects a report for a discipline that was not present in the original consultant package", async () => {
  const { deps, persisted } = makeDeps({
    binding: { ...binding, disciplineId: "ecology" },
  });

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "DENIED");
  assert.deepEqual(result.blockers, ["DISCIPLINE_NOT_REQUESTED"]);
  assert.equal(persisted.length, 0);
});

test("rejects content-hash substitution and non-consultant evidence roles", async () => {
  const hashMismatch = makeDeps({
    evidence: { ...evidence, contentHash: "d".repeat(64) },
  });
  const hashResult = await intakeConsultantReturnedReport(request, hashMismatch.deps);
  assert.equal(hashResult.status, "DENIED");
  assert.deepEqual(hashResult.blockers, ["CONTENT_HASH_MISMATCH"]);
  assert.equal(hashMismatch.persisted.length, 0);

  const wrongRole = makeDeps({
    evidence: { ...evidence, role: "CADASTRAL_SURVEY" },
  });
  const roleResult = await intakeConsultantReturnedReport(request, wrongRole.deps);
  assert.equal(roleResult.status, "DENIED");
  assert.deepEqual(roleResult.blockers, ["PRIVATE_EVIDENCE_ROLE_MISMATCH"]);
  assert.equal(wrongRole.persisted.length, 0);
});

test("does not accept returned reports before a referral has actually been delivered to a consultant", async () => {
  const { deps, persisted } = makeDeps({
    referral: { ...referral, status: "ACKNOWLEDGED", eventStatuses: ["SUBMITTED", "ACKNOWLEDGED"] },
  });

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "DENIED");
  assert.deepEqual(result.blockers, ["REFERRAL_NOT_DELIVERED"]);
  assert.equal(persisted.length, 0);
});

test("does not claim evidence-package entry when the durable binding write fails", async () => {
  const { deps } = makeDeps({ persistError: true });

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "QUARANTINED");
  assert.deepEqual(result.blockers, ["PERSISTENCE_REQUIRED"]);
  assert.equal(result.redactedSummary.privateEvidenceReady, true);
  assert.equal(result.redactedSummary.enteredEvidencePackage, false);
});

test("rejected private evidence stays rejected and never advances the referral evidence chain", async () => {
  const { deps, persisted } = makeDeps({
    evidence: { ...evidence, status: "REJECTED" },
  });

  const result = await intakeConsultantReturnedReport(request, deps);

  assert.equal(result.status, "REJECTED");
  assert.deepEqual(result.blockers, ["PRIVATE_EVIDENCE_REJECTED"]);
  assert.equal(persisted.length, 0);
});


test("allows a needs-information state only when the append-only history proves prior consultant delivery", async () => {
  const delivered = makeDeps({
    referral: {
      ...referral,
      status: "NEEDS_INFORMATION",
      eventStatuses: ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "NEEDS_INFORMATION"],
    },
  });
  const deliveredResult = await intakeConsultantReturnedReport(request, delivered.deps);
  assert.equal(deliveredResult.status, "READY_FOR_EVIDENCE_PACKAGE");

  const neverDelivered = makeDeps({
    referral: {
      ...referral,
      status: "NEEDS_INFORMATION",
      eventStatuses: ["SUBMITTED", "NEEDS_INFORMATION"],
    },
  });
  const deniedResult = await intakeConsultantReturnedReport(request, neverDelivered.deps);
  assert.equal(deniedResult.status, "DENIED");
  assert.deepEqual(deniedResult.blockers, ["REFERRAL_NOT_DELIVERED"]);
});

test("rejects untrusted binding records with extra fields or mismatched evidence references", async () => {
  const extraField = makeDeps({
    binding: { ...binding, unexpected: "do-not-trust" } as any,
  });
  const extraResult = await intakeConsultantReturnedReport(request, extraField.deps);
  assert.equal(extraResult.status, "DENIED");
  assert.deepEqual(extraResult.blockers, ["RETURN_BINDING_NOT_FOUND"]);

  const wrongRef = makeDeps({
    binding: { ...binding, evidenceRef: "ev_wrong_reference_123" },
  });
  const refResult = await intakeConsultantReturnedReport(request, wrongRef.deps);
  assert.equal(refResult.status, "DENIED");
  assert.deepEqual(refResult.blockers, ["RETURN_BINDING_NOT_FOUND"]);
});

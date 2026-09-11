import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeItem78aDurableCommercialBridge,
  type Item78aDurableCommercialBridgeFacts,
} from "../src/lib/item78a-durable-commercial-bridge";
import {
  ITEM78C_SEE_COMPILER_VERSION,
  summarizeItem78cWholeFunnelAcceptance,
  type Item78cCouncilJourneyEvidence,
  type Item78cWholeFunnelFacts,
} from "../src/lib/item78c-whole-funnel-acceptance";

const bridgeFacts = (): Item78aDurableCommercialBridgeFacts => ({
  environment: "preview",
  paidSource: {
    stripeTestMode: true,
    paidPurchaseResolved: true,
    activeEntitlementResolved: true,
    exactProject: true,
    exactQuickSiteCheck: true,
    exactProposal: true,
    exactProductAndPrice: true,
    exactlyOnePlanningPack: true,
  },
  evidence: {
    quarantinedBeforeScan: true,
    cleanServerScan: true,
    unreviewedEvidenceDenied: true,
    operatorReviewPersisted: true,
    promotionReplaySafe: true,
    evidenceDigestChanged: true,
    changedEvidenceDenied: true,
  },
  credit: {
    exactQuote: true,
    reservedOnce: true,
    consumedOnce: true,
    consumedReplaySafe: true,
    crossScopeDenied: true,
  },
  workingSee: {
    sameProject: true,
    exactSourcePack: true,
    twoIntentionalVersions: true,
    versionReplaySafe: true,
    outputHashesChanged: true,
    docxGenerated: true,
    pdfGenerated: true,
    notSubmissionReady: true,
    operatorReviewStillRequired: true,
  },
  safety: {
    productionCheckoutDisabled: true,
    productionMutationPerformed: false,
    sensitiveValuesEmitted: false,
    syntheticDatabaseResidue: 0,
    syntheticObjectResidue: 0,
  },
});

const journey = (
  council: Item78cCouncilJourneyEvidence["council"],
  role: Item78cCouncilJourneyEvidence["role"],
): Item78cCouncilJourneyEvidence => ({
  council,
  role,
  protectedPreviewFixture: true,
  persistedProject: true,
  authoritativeLineage: {
    quickSiteCheck: true,
    detailedPlanningPack: true,
    workingSee: true,
  },
  commercialBridge: summarizeItem78aDurableCommercialBridge(bridgeFacts()),
  seeCompiler: {
    runnerVersion: ITEM78C_SEE_COMPILER_VERSION,
    checks: {
      candidate_contract: true,
      dynamic_sections: true,
      statutory_s415: true,
      variation_merit: true,
      specialist_reports: true,
      evidence_finality: true,
      docx_rendered: true,
      pdf_rendered: true,
    },
  },
});

const acceptedFacts = (): Item78cWholeFunnelFacts => ({
  journeys: [
    journey("BYRON", "CONSULTANT_REFERRAL"),
    journey("KEMPSEY", "DIRECT_SEE"),
  ],
  consultantReferral: {
    runnerVersion: "consultant_referral_acceptance.v1",
    passed: true,
    reason: null,
    checks: {
      configuration: true,
      preflightEmpty: true,
      submitted: true,
      operatorQueue: true,
      transitions: true,
      userStatus: true,
      cleanup: true,
    },
    statuses: [
      "SUBMITTED",
      "ACKNOWLEDGED",
      "ASSIGNED",
      "CONSULTANT_ACKNOWLEDGED",
      "CLOSED",
    ],
    containsSensitiveValues: false,
  },
  safety: {
    productionCheckoutDisabled: true,
    productionMutationPerformed: false,
    containsSensitiveValues: false,
  },
});

test("accepts exactly one complete Byron journey and one complete Kempsey journey", () => {
  const summary = summarizeItem78cWholeFunnelAcceptance(acceptedFacts());
  assert.equal(summary.passed, true);
  assert.equal(summary.decision, "READY_FOR_NON_PRODUCTION_ACCEPTANCE");
  assert.equal(summary.failedCheck, null);
  assert.equal(Object.values(summary.checks).every(Boolean), true);
  assert.deepEqual(summary.journeys, [
    { council: "BYRON", role: "CONSULTANT_REFERRAL" },
    { council: "KEMPSEY", role: "DIRECT_SEE" },
  ]);
});

test("fails closed when council coverage or journey roles are duplicated", () => {
  const facts = acceptedFacts();
  facts.journeys[1] = journey("BYRON", "CONSULTANT_REFERRAL");
  const summary = summarizeItem78cWholeFunnelAcceptance(facts);
  assert.equal(summary.passed, false);
  assert.equal(summary.decision, "HOLD");
  assert.equal(summary.failedCheck, "council_coverage");
  assert.equal(summary.checks.journey_roles, false);
});

test("fails closed on an incomplete commercial bridge, compiler or referral", () => {
  const facts = acceptedFacts();
  facts.journeys[0].commercialBridge.checks.single_use_credit = false;
  facts.journeys[1].seeCompiler.checks.statutory_s415 = false;
  facts.consultantReferral.checks.cleanup = false;
  const summary = summarizeItem78cWholeFunnelAcceptance(facts);
  assert.equal(summary.passed, false);
  assert.equal(summary.checks.single_use_credit, false);
  assert.equal(summary.checks.canonical_see_compiler, false);
  assert.equal(summary.checks.consultant_referral, false);
});

test("fails closed on residue, replay loss or any Production mutation", () => {
  const facts = acceptedFacts();
  facts.journeys[0].commercialBridge.checks.zero_residue = false;
  facts.journeys[1].commercialBridge.checks.replay_safety = false;
  facts.safety.productionCheckoutDisabled = false;
  const summary = summarizeItem78cWholeFunnelAcceptance(facts);
  assert.equal(summary.passed, false);
  assert.equal(summary.checks.replay_and_zero_residue, false);
  assert.equal(summary.checks.production_disabled, false);
});

test("emits only privacy-minimal release evidence", () => {
  const serialized = JSON.stringify(
    summarizeItem78cWholeFunnelAcceptance(acceptedFacts()),
  );
  for (const forbidden of [
    "projectId",
    "artefactId",
    "sessionId",
    "paymentId",
    "address",
    "proposal",
    "cookie",
    "secret",
    "contactEmail",
    "packageDigest",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeItem78aDurableCommercialBridge,
  type Item78aDurableCommercialBridgeFacts,
} from "../src/lib/item78a-durable-commercial-bridge";

const acceptedFacts = (): Item78aDurableCommercialBridgeFacts => ({
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

test("accepts only the complete durable same-project bridge", () => {
  const summary = summarizeItem78aDurableCommercialBridge(acceptedFacts());
  assert.equal(summary.passed, true);
  assert.equal(summary.failedCheck, null);
  assert.equal(Object.values(summary.checks).every(Boolean), true);
});

test("fails closed when exact scope or replay safety is lost", () => {
  const facts = acceptedFacts();
  facts.paidSource.exactProposal = false;
  facts.workingSee.versionReplaySafe = false;
  const summary = summarizeItem78aDurableCommercialBridge(facts);
  assert.equal(summary.passed, false);
  assert.equal(summary.checks.exact_scope, false);
  assert.equal(summary.checks.replay_safety, false);
});

test("does not expose identifiers, credentials, addresses or proposal text", () => {
  const serialized = JSON.stringify(
    summarizeItem78aDurableCommercialBridge(acceptedFacts()),
  );
  for (const forbidden of [
    "sessionId",
    "cookie",
    "secret",
    "address",
    "proposal",
    "projectId",
    "evidenceRef",
    "contentHash",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

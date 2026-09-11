import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("keeps the paid pack and SEE product keys distinct across bridge replay", () => {
  const runner = readFileSync(
    new URL("../scripts/item78a-durable-commercial-bridge.ts", import.meta.url),
    "utf8",
  );
  const normalizedRunner = runner.replace(/\s+/g, " ");
  const paidPackPredicate =
    'scopeKey: planningPackScopeKey, productCode: PLANNING_CONTROLS_PACK_TERMS.productCode, productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion, status: "PAID",';

  assert.match(normalizedRunner, /const submissionScopeKey = submissionSeeScopeKey\(scope\);/);
  assert.match(normalizedRunner, /const planningPackScopeKey = sourcePurchase\.scopeKey;/);
  assert.match(normalizedRunner, /planningPackScopeKey !== submissionScopeKey/);
  assert.doesNotMatch(normalizedRunner, /sourcePurchase\.scopeKey === submissionScopeKey/);
  assert.equal(normalizedRunner.split(paidPackPredicate).length - 1, 2);
  assert.equal(normalizedRunner.split("scopeKey: submissionScopeKey,").length - 1, 2);
});

test("preserves safe stage diagnostics and classifies cleanup failures", () => {
  const runner = readFileSync(
    new URL("../scripts/item78a-durable-commercial-bridge.ts", import.meta.url),
    "utf8",
  );
  const normalizedRunner = runner.replace(/\s+/g, " ");

  assert.match(normalizedRunner, /catch \(error\) \{ if \(error instanceof BridgeFailure\) throw error; throw new BridgeFailure\(stage\); \} finally/);
  assert.match(normalizedRunner, /catch \{ throw new BridgeFailure\("cleanup"\); \}/);
  assert.match(normalizedRunner, /stage = "working_see_render"; const initialRendered/);
  assert.match(normalizedRunner, /stage = "working_see_persist"; const firstVersion/);
});

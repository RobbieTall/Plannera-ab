import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM78C_BRIDGE_CHECK_NAMES,
  ITEM78C_BRIDGE_FAILURE_STAGES,
  ITEM78C_BRIDGE_RUNNER_VERSION,
  sanitizeItem78cBridgeSummary,
} from "../scripts/item78c-sanitize-bridge-summary.mjs";

const acceptedSummary = () => ({
  runnerVersion: ITEM78C_BRIDGE_RUNNER_VERSION,
  passed: true,
  checks: Object.fromEntries(
    ITEM78C_BRIDGE_CHECK_NAMES.map((name) => [name, true]),
  ),
  failedCheck: null,
  productionCheckoutEnabled: false,
  productionMutationPerformed: false,
  syntheticOnly: true,
  containsSensitiveValues: false,
});

test("reconstructs only the privacy-minimal bridge allowlist", () => {
  const source = acceptedSummary();
  source.secret = "must-not-escape";
  source.projectId = "must-not-escape";
  source.checks["must-not-escape"] = true;

  const safe = sanitizeItem78cBridgeSummary(source);

  assert.deepEqual(Object.keys(safe), [
    "runnerVersion",
    "passed",
    "checks",
    "failedCheck",
    "productionCheckoutEnabled",
    "productionMutationPerformed",
    "syntheticOnly",
    "containsSensitiveValues",
  ]);
  assert.deepEqual(Object.keys(safe.checks), ITEM78C_BRIDGE_CHECK_NAMES);
  assert.equal(JSON.stringify(safe).includes("must-not-escape"), false);
});

test("publishes only an allowlisted privacy-minimal failure stage", () => {
  const source = {
    runnerVersion: ITEM78C_BRIDGE_RUNNER_VERSION,
    passed: false,
    failedStage: "working_see",
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
    containsSensitiveValues: false,
    secret: "must-not-escape",
    projectId: "must-not-escape",
  };

  const safe = sanitizeItem78cBridgeSummary(source);

  assert.deepEqual(safe, {
    runnerVersion: ITEM78C_BRIDGE_RUNNER_VERSION,
    passed: false,
    failedStage: "working_see",
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
    containsSensitiveValues: false,
  });
  assert.equal(JSON.stringify(safe).includes("must-not-escape"), false);
  assert.ok(ITEM78C_BRIDGE_FAILURE_STAGES.includes(safe.failedStage));

  assert.throws(
    () =>
      sanitizeItem78cBridgeSummary({
        ...source,
        failedStage: "not-allowlisted",
      }),
    /failed validation/,
  );
});
test("fails closed for unproven, incomplete or sensitive summaries", () => {
  const failedCheck = acceptedSummary();
  failedCheck.checks.zero_residue = false;
  assert.throws(
    () => sanitizeItem78cBridgeSummary(failedCheck),
    /failed validation/,
  );

  const missingCheck = acceptedSummary();
  delete missingCheck.checks.paid_source;
  assert.throws(
    () => sanitizeItem78cBridgeSummary(missingCheck),
    /failed validation/,
  );

  const sensitive = acceptedSummary();
  sensitive.containsSensitiveValues = true;
  assert.throws(
    () => sanitizeItem78cBridgeSummary(sensitive),
    /failed validation/,
  );

  const wrongVersion = acceptedSummary();
  wrongVersion.runnerVersion = "unexpected";
  assert.throws(
    () => sanitizeItem78cBridgeSummary(wrongVersion),
    /failed validation/,
  );
});

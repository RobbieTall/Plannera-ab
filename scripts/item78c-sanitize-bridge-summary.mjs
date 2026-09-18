import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const ITEM78C_BRIDGE_RUNNER_VERSION =
  "item78a-durable-commercial-bridge.v1";

export const ITEM78C_BRIDGE_CHECK_NAMES = Object.freeze([
  "protected_preview",
  "paid_source",
  "exact_scope",
  "single_pack",
  "evidence_boundaries",
  "evidence_regeneration",
  "single_use_credit",
  "cross_scope_denial",
  "working_outputs",
  "replay_safety",
  "production_disabled",
  "zero_residue",
]);

export const ITEM78C_BRIDGE_FAILURE_STAGES = Object.freeze([
  "configuration",
  "stripe_paid_source",
  "paid_scope",
  "evidence_intake",
  "evidence_scan",
  "operator_review",
  "credit",
  "working_see",
  "working_see_render",
  "working_see_persist",
  "replay",
  "cleanup",
  "unhandled",
]);
export const ITEM78C_STRIPE_FAILURE_REASONS = Object.freeze([
  "checkout_replay_failed",
  "configuration_invalid",
  "dpp_gate_failed",
  "duplicate_checkout",
  "live_mode_denied",
  "pagination_uncertain",
  "phase_mismatch",
  "provider_request_failed",
  "refund_mismatch",
  "scope_mismatch",
  "target_denied",
]);
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function sanitizeItem78cBridgeSummary(source) {
  if (
    !isRecord(source) ||
    source.runnerVersion !== ITEM78C_BRIDGE_RUNNER_VERSION ||
    source.productionCheckoutEnabled !== false ||
    source.productionMutationPerformed !== false ||
    source.containsSensitiveValues !== false
  ) {
    throw new Error("Item 78C bridge summary failed validation.");
  }

  if (source.passed === false) {
    if (!ITEM78C_BRIDGE_FAILURE_STAGES.includes(source.failedStage)) {
      throw new Error("Item 78C bridge summary failed validation.");
    }
    const failureReason =
      source.failedStage === "stripe_paid_source"
        ? source.failureReason
        : null;
    if (
      (source.failedStage === "stripe_paid_source" &&
        !ITEM78C_STRIPE_FAILURE_REASONS.includes(failureReason)) ||
      (source.failedStage !== "stripe_paid_source" &&
        source.failureReason !== null)
    ) {
      throw new Error("Item 78C bridge summary failed validation.");
    }
    return {
      runnerVersion: source.runnerVersion,
      passed: false,
      failedStage: source.failedStage,
      failureReason,
      productionCheckoutEnabled: false,
      productionMutationPerformed: false,
      containsSensitiveValues: false,
    };
  }

  if (!isRecord(source.checks)) {
    throw new Error("Item 78C bridge summary failed validation.");
  }
  const checks = Object.fromEntries(
    ITEM78C_BRIDGE_CHECK_NAMES.map((name) => [name, source.checks[name]]),
  );
  if (
    source.passed !== true ||
    source.failedCheck !== null ||
    source.syntheticOnly !== true ||
    Object.values(checks).some((value) => value !== true)
  ) {
    throw new Error("Item 78C bridge summary failed validation.");
  }

  return {
    runnerVersion: source.runnerVersion,
    passed: true,
    checks,
    failedCheck: null,
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
    syntheticOnly: true,
    containsSensitiveValues: false,
  };
}

async function main([inputPath, outputPath]) {
  if (!inputPath || !outputPath || inputPath === outputPath) {
    throw new Error("Item 78C bridge summary failed validation.");
  }
  const source = JSON.parse(await readFile(inputPath, "utf8"));
  const safeSummary = sanitizeItem78cBridgeSummary(source);
  await writeFile(outputPath, `${JSON.stringify(safeSummary)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch(() => {
    console.error("Item 78C bridge summary sanitization failed closed.");
    process.exitCode = 1;
  });
}

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

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function sanitizeItem78cBridgeSummary(source) {
  if (!isRecord(source) || !isRecord(source.checks)) {
    throw new Error("Item 78C bridge summary failed validation.");
  }

  const checks = Object.fromEntries(
    ITEM78C_BRIDGE_CHECK_NAMES.map((name) => [name, source.checks[name]]),
  );
  if (
    source.runnerVersion !== ITEM78C_BRIDGE_RUNNER_VERSION ||
    source.passed !== true ||
    source.failedCheck !== null ||
    source.productionCheckoutEnabled !== false ||
    source.productionMutationPerformed !== false ||
    source.syntheticOnly !== true ||
    source.containsSensitiveValues !== false ||
    Object.values(checks).some((value) => value !== true)
  ) {
    throw new Error("Item 78C bridge summary failed validation.");
  }

  return {
    runnerVersion: source.runnerVersion,
    passed: source.passed,
    checks,
    failedCheck: source.failedCheck,
    productionCheckoutEnabled: source.productionCheckoutEnabled,
    productionMutationPerformed: source.productionMutationPerformed,
    syntheticOnly: source.syntheticOnly,
    containsSensitiveValues: source.containsSensitiveValues,
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

import path from "node:path";
import { fileURLToPath } from "node:url";

const CLOUD_SUITES = new Set(["private-evidence", "public-da", "candidate-da"]);
const EXPECTED_CONFIRMATIONS = Object.freeze({
  migration: "AUTHORIZE PREVIEW MIGRATION",
  stateful: "AUTHORIZE PREVIEW STATEFUL ACCEPTANCE",
});

function enabled(value) {
  return String(value ?? "").toLowerCase() === "true";
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function databaseEndpointId(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Preview database credential is missing or invalid");
  }
  requireValue(parsed.protocol === "postgres:" || parsed.protocol === "postgresql:", "Preview database must use PostgreSQL");
  requireValue(parsed.hostname.endsWith(".neon.tech"), "Preview database must be a Neon endpoint");
  return parsed.hostname.split(".")[0].replace(/-pooler$/, "");
}

export function verifyPreviewWorkflowAuthorization({
  env,
  workflow,
  suite = "",
  confirmation,
  expectedCommit,
  databaseTarget,
  blobTarget = "",
}) {
  requireValue(EXPECTED_CONFIRMATIONS[workflow], "Unknown protected workflow");
  requireValue(confirmation === EXPECTED_CONFIRMATIONS[workflow], "Explicit confirmation phrase does not match");
  requireValue(/^[a-f0-9]{40}$/.test(expectedCommit), "Expected commit must be a full lowercase SHA");
  requireValue(env.GITHUB_SHA === expectedCommit, "Workflow dispatch commit does not match expected commit");
  requireValue(env.VERCEL_GIT_COMMIT_SHA === expectedCommit, "Hosted commit identity does not match expected commit");
  requireValue(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === expectedCommit, "Protected authorization is not scoped to this commit");
  requireValue(env.GITHUB_REF_NAME && env.GITHUB_REF_NAME !== "main", "Production/main refs are forbidden");
  requireValue(env.VERCEL_GIT_COMMIT_REF === env.GITHUB_REF_NAME, "Hosted branch identity mismatch");
  requireValue(env.VERCEL === "1" && env.VERCEL_ENV === "preview", "Only an identified Preview target is permitted");
  requireValue(!enabled(env.PLANNING_PACK_CHECKOUT_ENABLED), "Planning Pack checkout must remain disabled");
  requireValue(!enabled(env.SUBMISSION_SEE_CHECKOUT_ENABLED), "Submission SEE checkout must remain disabled");
  requireValue(enabled(env.ITEM74H_PREVIEW_MUTATION_APPROVED), "Protected Preview authorization is absent");
  requireValue(/^ep-[a-z0-9-]+$/.test(databaseTarget), "Database target must be an explicit Neon endpoint ID");
  requireValue(env.ITEM74H_AUTHORIZED_DATABASE_TARGET === databaseTarget, "Database target is not externally authorized");
  requireValue(databaseEndpointId(env.DATABASE_URL ?? "") === databaseTarget, "Database credential does not match the authorized Preview target");

  if (workflow === "stateful" && CLOUD_SUITES.has(suite)) {
    requireValue(Boolean(blobTarget), "Cloud acceptance requires an explicit Blob target");
    requireValue(env.ITEM74H_AUTHORIZED_BLOB_TARGET === blobTarget, "Blob target is not externally authorized");
    requireValue(env.ITEM74H_PRIVATE_BLOB_STORE_ID === blobTarget, "Blob credential does not match the authorized target");
  }

  return { workflow, suite, commit: expectedCommit, databaseTarget };
}

function parseArguments(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Invalid authorization arguments");
    parsed[key.slice(2)] = value;
  }
  return parsed;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const args = parseArguments(process.argv.slice(2));
  const result = verifyPreviewWorkflowAuthorization({
    env: process.env,
    workflow: args.workflow,
    suite: args.suite,
    confirmation: args.confirmation,
    expectedCommit: args["expected-commit"],
    databaseTarget: args["database-target"],
    blobTarget: args["blob-target"],
  });
  console.log(`Protected ${result.workflow} authorization passed for exact Preview commit and target.`);
}

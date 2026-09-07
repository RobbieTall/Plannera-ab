import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLOUD_SUITES = new Set(["private-evidence", "public-da", "candidate-da"]);
const STATEFUL_SUITES = new Set([
  "submission-credit",
  "pathway-persistence",
  "controlled-persistence",
  ...CLOUD_SUITES,
]);
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

function validateRequest({ workflow, suite, confirmation, expectedCommit, databaseTarget, blobTarget = "" }) {
  requireValue(EXPECTED_CONFIRMATIONS[workflow], "Unknown protected workflow");
  requireValue(confirmation === EXPECTED_CONFIRMATIONS[workflow], "Explicit confirmation phrase does not match");
  requireValue(/^[a-f0-9]{40}$/.test(expectedCommit), "Expected commit must be a full lowercase SHA");
  requireValue(/^ep-[a-z0-9-]+$/.test(databaseTarget), "Database target must be an explicit Neon endpoint ID");
  if (workflow === "stateful") requireValue(STATEFUL_SUITES.has(suite), "Unknown stateful acceptance suite");
  if (workflow === "stateful" && CLOUD_SUITES.has(suite)) {
    requireValue(/^[A-Za-z0-9_-]{3,128}$/.test(blobTarget), "Cloud acceptance requires an explicit Blob target");
  }
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

export function verifyCredentialFreeAuthorization({
  env,
  workflow,
  suite = "",
  confirmation,
  expectedCommit,
  databaseTarget,
  blobTarget = "",
  checkedOutCommit,
  isCommitOnMain,
}) {
  validateRequest({ workflow, suite, confirmation, expectedCommit, databaseTarget, blobTarget });
  requireValue(env.GITHUB_SHA === expectedCommit, "Workflow dispatch commit does not match expected commit");
  requireValue(checkedOutCommit === expectedCommit, "Checked-out Git commit does not match expected commit");
  requireValue(env.GITHUB_REF_NAME && env.GITHUB_REF_NAME !== "main", "Production/main refs are forbidden");
  requireValue(!isCommitOnMain(expectedCommit), "Authorized commit is already contained in main");
  return { workflow, suite, commit: expectedCommit, databaseTarget, blobTarget };
}

export function verifyProtectedAuthorization({
  env,
  workflow,
  suite = "",
  confirmation,
  expectedCommit,
  databaseTarget,
  blobTarget = "",
  checkedOutCommit,
  isCommitOnMain,
}) {
  validateRequest({ workflow, suite, confirmation, expectedCommit, databaseTarget, blobTarget });
  requireValue(env.GITHUB_SHA === expectedCommit, "Workflow dispatch commit does not match expected commit");
  requireValue(checkedOutCommit === expectedCommit, "Protected checkout does not match expected commit");
  requireValue(!isCommitOnMain(expectedCommit), "Authorized commit became contained in main before execution");
  requireValue(env.VERCEL_GIT_COMMIT_SHA === expectedCommit, "Hosted commit identity does not match expected commit");
  requireValue(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === expectedCommit, "Protected authorization is not scoped to this commit");
  requireValue(env.GITHUB_REF_NAME && env.GITHUB_REF_NAME !== "main", "Production/main refs are forbidden");
  requireValue(env.VERCEL_GIT_COMMIT_REF === env.GITHUB_REF_NAME, "Hosted branch identity mismatch");
  requireValue(env.VERCEL === "1" && env.VERCEL_ENV === "preview", "Only an identified Preview target is permitted");
  requireValue(!enabled(env.PLANNING_PACK_CHECKOUT_ENABLED), "Planning Pack checkout must remain disabled");
  requireValue(!enabled(env.SUBMISSION_SEE_CHECKOUT_ENABLED), "Submission SEE checkout must remain disabled");
  requireValue(enabled(env.ITEM74H_PREVIEW_MUTATION_APPROVED), "Protected Preview authorization is absent");
  requireValue(env.ITEM74H_AUTHORIZED_DATABASE_TARGET === databaseTarget, "Database target is not externally authorized");
  if (workflow === "stateful" && CLOUD_SUITES.has(suite)) {
    requireValue(env.ITEM74H_AUTHORIZED_BLOB_TARGET === blobTarget, "Blob target is not externally authorized");
  }
  return { workflow, suite, commit: expectedCommit, databaseTarget, blobTarget };
}

export function verifyCredentialTargets({ env, workflow, suite = "", databaseTarget, blobTarget = "" }) {
  requireValue(EXPECTED_CONFIRMATIONS[workflow], "Unknown protected workflow");
  requireValue(/^ep-[a-z0-9-]+$/.test(databaseTarget), "Database target must be an explicit Neon endpoint ID");
  requireValue(
    databaseEndpointId(env.DATABASE_URL ?? "") === databaseTarget,
    "Database credential does not match the authorized Preview target",
  );
  if (workflow === "stateful" && CLOUD_SUITES.has(suite)) {
    requireValue(/^[A-Za-z0-9_-]{3,128}$/.test(blobTarget), "Cloud acceptance requires an explicit Blob target");
    requireValue(env.ITEM74H_PRIVATE_BLOB_STORE_ID === blobTarget, "Blob credential does not match the authorized target");
  }
  return { workflow, suite, databaseTarget, blobTarget };
}

function runGit(args, cwd = process.cwd()) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  if (result.error) throw new Error("Unable to inspect Git commit evidence");
  return result;
}

function checkedOutCommit() {
  const result = runGit(["rev-parse", "HEAD"]);
  requireValue(result.status === 0, "Unable to identify checked-out Git commit");
  return result.stdout.trim();
}

export function isCommitOnMain(commit, cwd = process.cwd()) {
  const result = runGit(["merge-base", "--is-ancestor", commit, "refs/remotes/origin/main"], cwd);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error("Unable to compare authorized commit with origin/main");
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const request = {
    env: process.env,
    workflow: process.env.ITEM74H_AUTH_WORKFLOW,
    suite: process.env.ITEM74H_AUTH_SUITE,
    confirmation: process.env.ITEM74H_AUTH_CONFIRMATION,
    expectedCommit: process.env.ITEM74H_AUTH_EXPECTED_COMMIT,
    databaseTarget: process.env.ITEM74H_AUTH_DATABASE_TARGET,
    blobTarget: process.env.ITEM74H_AUTH_BLOB_TARGET,
  };
  let result;
  if (process.env.ITEM74H_AUTH_PHASE === "credential-free") {
    result = verifyCredentialFreeAuthorization({
      ...request,
      checkedOutCommit: checkedOutCommit(),
      isCommitOnMain,
    });
  } else if (process.env.ITEM74H_AUTH_PHASE === "protected") {
    result = verifyProtectedAuthorization({
      ...request,
      checkedOutCommit: checkedOutCommit(),
      isCommitOnMain,
    });
  } else if (process.env.ITEM74H_AUTH_PHASE === "credential-target") {
    result = verifyCredentialTargets(request);
  } else {
    throw new Error("Unknown authorization phase");
  }
  console.log("Protected " + result.workflow + " authorization phase passed without printing target or credential values.");
}

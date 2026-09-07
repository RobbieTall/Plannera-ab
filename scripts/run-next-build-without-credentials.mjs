import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_BUILD_VARIABLES = new Set([
  "CI",
  "HOME",
  "LANG",
  "LC_ALL",
  "NEXTAUTH_URL",
  "NEXT_TELEMETRY_DISABLED",
  "NODE_ENV",
  "NODE_OPTIONS",
  "PATH",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "VERCEL",
  "VERCEL_BRANCH_URL",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
  "VERCEL_GIT_COMMIT_AUTHOR_NAME",
  "VERCEL_GIT_COMMIT_MESSAGE",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_PREVIOUS_SHA",
  "VERCEL_GIT_PROVIDER",
  "VERCEL_GIT_PULL_REQUEST_ID",
  "VERCEL_GIT_REPO_ID",
  "VERCEL_GIT_REPO_OWNER",
  "VERCEL_GIT_REPO_SLUG",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_REGION",
  "VERCEL_TARGET_ENV",
  "VERCEL_URL",
]);

export function isAllowedBuildVariable(name) {
  return name.startsWith("NEXT_PUBLIC_") || ALLOWED_BUILD_VARIABLES.has(name);
}

export function sanitizedBuildEnvironment(source = process.env) {
  const env = {};
  for (const [name, value] of Object.entries(source)) {
    if (isAllowedBuildVariable(name)) env[name] = value;
  }
  env.PLANNING_PACK_CHECKOUT_ENABLED = "false";
  env.SUBMISSION_SEE_CHECKOUT_ENABLED = "false";
  env.ITEM74H_PREVIEW_MUTATION_APPROVED = "false";
  env.SUBMISSION_SEE_CREDIT_ACCEPTANCE_ENABLED = "false";
  env.ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE = "false";
  env.ITEM74H_PRIVATE_EVIDENCE_ACCEPTANCE_ENABLED = "false";
  env.ITEM74H_CLAMAV_ACCEPTANCE_ENABLED = "false";
  env.ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED = "false";
  env.ITEM74H_CANDIDATE_DA_ACCEPTANCE_ENABLED = "false";
  return env;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const nextBin = path.resolve("node_modules/next/dist/bin/next");
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    env: sanitizedBuildEnvironment(),
    shell: false,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

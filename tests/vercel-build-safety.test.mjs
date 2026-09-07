import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BUILD_ENTRY_CONTRACTS,
  EXPECTED_VERCEL_BUILD_STEPS,
  verifyBuildContract,
  verifyRepositoryBuildContract,
} from "../scripts/verify-vercel-build-safety.mjs";
import { verifyPreviewWorkflowAuthorization } from "../scripts/verify-preview-workflow-authorization.mjs";

function currentFixture() {
  const packageJson = { scripts: { "vercel-build": EXPECTED_VERCEL_BUILD_STEPS.join(" && ") } };
  const sourceByPath = {};
  for (const entry of BUILD_ENTRY_CONTRACTS) {
    if (entry.packageScript) packageJson.scripts[entry.packageScript] = entry.wrapper;
    sourceByPath[entry.file] = readFileSync(new URL(`../${entry.file}`, import.meta.url), "utf8");
  }
  return { packageJson, sourceByPath };
}

test("repository build safety contract accepts the reviewed checkout", () => {
  assert.equal(verifyRepositoryBuildContract().contractedEntries, 5);
});

test("build contract rejects an added command", () => {
  const fixture = currentFixture();
  fixture.packageJson.scripts["vercel-build"] += " && npm run migrate:item74h-preview";
  assert.throws(() => verifyBuildContract(fixture), /permitted-command list/);
});

test("build contract rejects wrapper drift before execution", () => {
  const fixture = currentFixture();
  fixture.packageJson.scripts["smoke:launch"] = "tsx scripts/mutating-wrapper.ts";
  assert.throws(() => verifyBuildContract(fixture), /wrapper changed/);
});

test("Preview authorization is exact-commit, exact-target and checkout-off", () => {
  const commit = "a".repeat(40);
  const env = {
    GITHUB_SHA: commit,
    GITHUB_REF_NAME: "agent/item74h-pathway-check",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "agent/item74h-pathway-check",
    VERCEL_GIT_COMMIT_SHA: commit,
    PLANNING_PACK_CHECKOUT_ENABLED: "false",
    SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
    ITEM74H_PREVIEW_MUTATION_APPROVED: "true",
    ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: commit,
    ITEM74H_AUTHORIZED_DATABASE_TARGET: "ep-safe-preview",
    DATABASE_URL: "postgresql://synthetic:synthetic@ep-safe-preview-pooler.ap-southeast-2.aws.neon.tech/neondb",
  };
  assert.equal(
    verifyPreviewWorkflowAuthorization({
      env,
      workflow: "migration",
      confirmation: "AUTHORIZE PREVIEW MIGRATION",
      expectedCommit: commit,
      databaseTarget: "ep-safe-preview",
    }).databaseTarget,
    "ep-safe-preview",
  );
});

test("Preview authorization rejects main and credential target drift", () => {
  const commit = "b".repeat(40);
  const base = {
    GITHUB_SHA: commit,
    GITHUB_REF_NAME: "main",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_GIT_COMMIT_SHA: commit,
    PLANNING_PACK_CHECKOUT_ENABLED: "false",
    SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
    ITEM74H_PREVIEW_MUTATION_APPROVED: "true",
    ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: commit,
    ITEM74H_AUTHORIZED_DATABASE_TARGET: "ep-authorized-preview",
    DATABASE_URL: "postgresql://synthetic:synthetic@ep-different-preview.ap-southeast-2.aws.neon.tech/neondb",
  };
  const input = {
    workflow: "stateful",
    suite: "pathway-persistence",
    confirmation: "AUTHORIZE PREVIEW STATEFUL ACCEPTANCE",
    expectedCommit: commit,
    databaseTarget: "ep-authorized-preview",
  };
  assert.throws(() => verifyPreviewWorkflowAuthorization({ env: base, ...input }), /main refs are forbidden/);
  assert.throws(
    () => verifyPreviewWorkflowAuthorization({
      env: { ...base, GITHUB_REF_NAME: "safe-preview", VERCEL_GIT_COMMIT_REF: "safe-preview" },
      ...input,
    }),
    /credential does not match/,
  );
});

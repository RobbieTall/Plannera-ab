import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const workflow = readFileSync(
  ".github/workflows/item78c-byron-kempsey-acceptance.yml",
  "utf8",
);

test("Item 78C workflow is manual, exact-commit and isolated by council", () => {
  assert.match(workflow, /^name: Item 78C Byron and Kempsey Whole-funnel Acceptance$/m);
  assert.match(workflow, /^  workflow_dispatch:$/m);
  assert.match(workflow, /ITEM74H_AUTH_EXPECTED_COMMIT: \$\{\{ inputs\.expected_commit \}\}/);
  assert.match(workflow, /environment: item78c-byron-preview/);
  assert.match(workflow, /environment: item78c-kempsey-preview/);
  assert.match(workflow, /ITEM78C_EXPECTED_COUNCIL: BYRON/);
  assert.match(workflow, /ITEM78C_EXPECTED_COUNCIL: KEMPSEY/);
  assert.match(workflow, /needs: \[authorize, byron, kempsey, see-compiler\]/);
});

test("Item 78C workflow reuses accepted bridge, compiler and referral paths", () => {
  assert.equal(
    workflow.match(/accept:item78a-durable-commercial-bridge/g)?.length,
    2,
  );
  assert.match(workflow, /accept:consultant-referral/);
  assert.match(workflow, /submission-see-sections\.test\.ts/);
  assert.match(workflow, /submission-see-candidate\.test\.ts/);
  assert.match(workflow, /submission-see-renderer\.test\.ts/);
  assert.match(workflow, /accept:item78c-whole-funnel/);
});

test("Item 78C Blob acceptance uses branch-scoped ephemeral Preview OIDC", () => {
  const blobSteps = workflow
    .split(/\n(?=      - name: )/)
    .filter((block) =>
      block.includes("Prove private Blob persistence and cleanup"),
    );

  assert.equal(blobSteps.length, 2);
  for (const block of blobSteps) {
    assert.match(
      block,
      /run: node \.\/node_modules\/tsx\/dist\/cli\.mjs scripts\/run-item74h-private-blob-with-preview-oidc\.ts/,
    );
    assert.doesNotMatch(block, /ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN/);
    assert.match(
      block,
      /VERCEL_TOKEN: \$\{\{ secrets\.ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN \}\}/,
    );
  }
});

test("Item 78C publishes only the sanitized decision and never targets Production", () => {
  assert.match(workflow, /item78c-whole-funnel-decision/);
  assert.match(workflow, /s\.containsSensitiveValues!==false/);
  assert.doesNotMatch(workflow, /environment:\s+production/i);
  assert.doesNotMatch(workflow, /PLANNING_PACK_CHECKOUT_ENABLED:\s*["']?true/i);
  assert.doesNotMatch(workflow, /SUBMISSION_SEE_CHECKOUT_ENABLED:\s*["']?true/i);
  assert.doesNotMatch(workflow, /consultant-referral-raw\.json\s*\n\s*if-no-files-found/);
});

test("release-gate CLI fails closed without protected evidence files", () => {
  const result = spawnSync(
    "./node_modules/.bin/tsx",
    ["scripts/item78c-whole-funnel-release-gate.ts"],
    {
      encoding: "utf8",
      env: { NODE_ENV: "test", PATH: process.env.PATH ?? "" },
    },
  );
  const summary = JSON.parse(result.stdout);
  assert.equal(result.status, 1);
  assert.equal(summary.passed, false);
  assert.equal(summary.decision, "HOLD");
  assert.equal(summary.failedCheck, "evidence_files");
  assert.equal(summary.containsSensitiveValues, false);
});

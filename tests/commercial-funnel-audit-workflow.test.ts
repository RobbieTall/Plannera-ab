import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/commercial-funnel-live-audit.yml";
const workflow = readFileSync(workflowPath, "utf8");

const count = (needle: string) => workflow.split(needle).length - 1;

test("commercial funnel audit workflow is manual-only with exact confirmation", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  for (const forbidden of ["push:", "pull_request:", "schedule:", "repository_dispatch:", "workflow_call:"]) {
    assert.equal(workflow.includes(forbidden), false, forbidden);
  }
  assert.equal(count("RUN APPROVED READ-ONLY AUDIT"), 3);
  assert.match(workflow, /type: choice\n        options:\n          - RUN APPROVED READ-ONLY AUDIT/);
});

test("workflow is protected, read-only, main-only, non-cancelling, and bounded", () => {
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /environment: commercial-funnel-audit/);
  assert.match(workflow, /if: \$\{\{ github\.ref == 'refs\/heads\/main' && inputs\.confirmation == 'RUN APPROVED READ-ONLY AUDIT' \}\}/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(workflow, /concurrency:\n  group: commercial-funnel-live-audit\n  cancel-in-progress: false/);
});

test("workflow maps only approved protected configuration and expected commit from dispatched SHA", () => {
  for (const required of [
    "PLANNERA_AUDIT_BASE_URL: ${{ vars.PLANNERA_AUDIT_BASE_URL }}",
    "PLANNERA_AUDIT_ADMIN_TOKEN: ${{ secrets.PLANNERA_AUDIT_ADMIN_TOKEN }}",
    "PLANNERA_BYRON_PROJECT_ID: ${{ vars.PLANNERA_BYRON_PROJECT_ID }}",
    "PLANNERA_KEMPSEY_PROJECT_ID: ${{ vars.PLANNERA_KEMPSEY_PROJECT_ID }}",
    "PLANNERA_AUDIT_EXPECTED_COMMIT: ${{ github.sha }}",
    "ref: ${{ github.sha }}",
    "persist-credentials: false",
    "package-manager-cache: false",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(workflow, /PLANNERA_AUDIT_EXPECTED_COMMIT:\s*\$\{\{\s*(inputs|vars|secrets)\./);
});

test("workflow invokes the existing runner exactly once and excludes unsafe commands", () => {
  assert.equal(count("./node_modules/.bin/tsx scripts/audit-commercial-funnel.ts"), 1);
  assert.match(workflow, /npm ci --ignore-scripts/);
  for (const forbidden of [
    "curl",
    "npm run build",
    "vercel-build",
    "prisma",
    "db push",
    "ingest",
    "generate",
    "generation",
    "set -x",
    "xtrace",
    "?token=",
    "adminToken=",
    "byron-public",
    "kempsey-public",
    "45 Broken Head",
    "52 Belgrave",
  ]) {
    assert.equal(workflow.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }
});

test("workflow captures stdout, validates JSON, uploads safe artifact, and gates on exit 0 only", () => {
  assert.match(workflow, /> commercial-funnel-audit\.json/);
  assert.match(workflow, /status=\$\?/);
  assert.match(workflow, /exit_code=%s/);
  assert.match(workflow, /JSON\.parse\(fs\.readFileSync\(path, 'utf8'\)\)/);
  assert.match(workflow, /cat commercial-funnel-audit\.json/);
  assert.match(workflow, /if: \$\{\{ always\(\) && steps\.validate\.outputs\.json_valid == 'true' \}\}/);
  assert.match(workflow, /name: commercial-funnel-audit-summary/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /retention-days: 14/);
  assert.match(workflow, /case "\$audit_exit" in\n            0\)/);
  assert.match(workflow, /1\)\n              echo 'Configuration\/contract failure: audit runner exited 1\.'/);
  assert.match(workflow, /2\)\n              echo 'Valid non-ready gate: audit runner exited 2\.'/);
});

test("workflow uses only approved official actions pinned to full commit SHAs", () => {
  const uses = [...workflow.matchAll(/uses: ([^\s#]+)/g)].map((match) => match[1]);
  assert.deepEqual(uses, [
    "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd",
    "actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  ]);
  for (const use of uses) {
    assert.match(use, /^actions\/(checkout|setup-node|upload-artifact)@[0-9a-f]{40}$/);
  }
  assert.match(workflow, /# actions\/checkout v6\.0\.2/);
  assert.match(workflow, /# actions\/setup-node v6\.4\.0/);
  assert.match(workflow, /# actions\/upload-artifact v7\.0\.1/);
});

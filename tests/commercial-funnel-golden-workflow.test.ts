import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/commercial-funnel-golden.yml";
const workflow = readFileSync(workflowPath, "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

test("commercial funnel golden workflow is ordinary secret-free CI", () => {
  assert.match(workflow, /^name: Commercial Funnel Golden Gate$/m);
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /^  push:$/m);
  assert.match(workflow, /^      - main$/m);
  assert.match(workflow, /^  workflow_dispatch:$/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(
    workflow,
    /actions\/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd/,
  );
  assert.match(
    workflow,
    /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e/,
  );
  assert.match(workflow, /npm ci --ignore-scripts --loglevel=error/);
  assert.match(workflow, /\.\/node_modules\/\.bin\/prisma generate/);
  assert.match(workflow, /npm run test:commercial-funnel/);

  assert.doesNotMatch(workflow, /\bsecrets\./);
  assert.doesNotMatch(workflow, /^\s*environment:/m);
  assert.doesNotMatch(workflow, /DATABASE_URL|OPENAI_API_KEY|INGEST_ADMIN_SECRET/);
  assert.doesNotMatch(
    workflow,
    /npm run (?:build|vercel-build|db:push)|prisma (?:db push|migrate)|curl |wget |audit:commercial-funnel/,
  );
});

test("commercial funnel test command covers generation, referral, audit and workflow contracts", () => {
  const command = packageJson.scripts?.["test:commercial-funnel"] ?? "";
  for (const requiredPath of [
    "tests/commercial-funnel-golden.test.ts",
    "tests/commercial-funnel-golden-workflow.test.ts",
    "tests/map-snapshot.test.ts",
    "tests/commercial-next-action.test.ts",
    "tests/quick-site-check-evidence.test.ts",
    "tests/commercial-funnel-audit-runner.test.ts",
    "src/lib/artefact-review-request.test.ts",
    "src/lib/review-request-handoff.test.ts",
    "src/lib/commercial-funnel-audit.test.ts",
    "src/app/api/admin/commercial-funnel-audit/route.test.ts",
  ]) {
    assert.match(
      command,
      new RegExp(requiredPath.replace(/[.*+?^()|[\]\\]/g, "\\$&")),
    );
  }
});

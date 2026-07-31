import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/stripe-test-acceptance.yml", "utf8");
const statusRoute = readFileSync("src/app/api/planning-pack/status/route.ts", "utf8");

test("protected workflow is three-phase, manual, least-privilege and production-resistant", () => {
  assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /\n\s+(push|pull_request|schedule):/);
  for (const phase of ["before_payment", "paid", "refunded"]) assert.match(workflow, new RegExp(`- ${phase}`));
  assert.match(workflow, /environment: stripe-test-acceptance/); assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /timeout-minutes: 10/); assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/); assert.match(workflow, /startsWith\(inputs\.checkout_session_id, 'cs_test_'\)/);
  assert.doesNotMatch(workflow, /PLANNING_PACK_CHECKOUT_ENABLED/); assert.doesNotMatch(workflow, /STRIPE_SECRET_KEY:/);
  for (const secret of ["STRIPE_TEST_SECRET_KEY", "PLANNERA_STRIPE_TEST_SESSION_COOKIE", "PLANNERA_STRIPE_TEST_PROPOSAL", "PLANNERA_STRIPE_TEST_OTHER_PROPOSAL", "PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON"]) assert.match(workflow, new RegExp(`secrets\\.${secret}`));
  assert.match(workflow, /PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL/); assert.doesNotMatch(workflow, /set -x|ACTIONS_STEP_DEBUG/);
  assert.match(workflow, /stripe_test_acceptance\.v2/); assert.match(workflow, /retention-days: 14/);
});

test("protected workflow generates Prisma client before importing application modules", () => {
  const installIndex = workflow.indexOf("npm ci --ignore-scripts --loglevel=error");
  const generateIndex = workflow.indexOf("./node_modules/.bin/prisma generate");
  const acceptanceIndex = workflow.indexOf("npm run --silent accept:stripe-test");

  assert.ok(installIndex >= 0);
  assert.ok(generateIndex > installIndex);
  assert.ok(acceptanceIndex > generateIndex);
  assert.match(workflow, /name: Generate Prisma client without database access/);\n  assert.match(workflow, /npm run --silent accept:stripe-test > stripe-test-acceptance\\.json/);\n  assert.doesNotMatch(workflow, /run: npm run accept:stripe-test/);
});

test("protected workflow preserves validated safe failure evidence before enforcing the result", () => {
  const acceptanceIndex = workflow.indexOf("name: Run fail-closed acceptance");
  const validationIndex = workflow.indexOf("name: Validate privacy-minimal summary");
  const summaryIndex = workflow.indexOf("name: Write safe job summary");
  const uploadIndex = workflow.indexOf("name: Upload safe acceptance evidence");
  const enforcementIndex = workflow.indexOf("name: Enforce acceptance result");

  assert.match(workflow, /id: acceptance\n\s+continue-on-error: true/);
  assert.ok(acceptanceIndex >= 0);
  assert.ok(validationIndex > acceptanceIndex);
  assert.ok(summaryIndex > validationIndex);
  assert.ok(uploadIndex > summaryIndex);
  assert.ok(enforcementIndex > uploadIndex);
  assert.match(workflow, /typeof s\.passed!=='boolean'/);
  assert.match(workflow, /s\.passed!==true/);
});

test("shipped status route is compile-time locked to enabled/state response type", () => {
  assert.match(statusRoute, /satisfies PlanningPackEnabledStatusResponse/);
  assert.doesNotMatch(statusRoute, /entitled/);
});

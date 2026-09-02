import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  prepareStripeTestSession,
  safeStripeTestSessionSummary,
} from "../src/lib/stripe-test-session-prepare";

const env = {
  PLANNERA_STRIPE_TEST_BASE_URL:
    "https://plannera-abc123-robbietalls-projects.vercel.app",
  PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:
    "https://plannera-abc123-robbietalls-projects.vercel.app",
  PLANNERA_STRIPE_TEST_PROJECT_ID: "project-a1",
  PLANNERA_STRIPE_TEST_PROPOSAL: "Protected synthetic proposal",
  PLANNERA_STRIPE_TEST_SESSION_COOKIE: "private-cookie",
  PLANNERA_STRIPE_TEST_VERCEL_BYPASS: "private-vercel-bypass",
};

const testSessionId = "cs_test_1234567890ABCDEF";
const fetchOk = async (input: string | URL | Request, init?: RequestInit) => {
  assert.equal(
    String(input),
    `${env.PLANNERA_STRIPE_TEST_BASE_URL}/api/planning-pack/checkout`,
  );
  assert.equal(init?.method, "POST");
  assert.equal((init?.headers as Record<string, string>).cookie, "private-cookie");
  assert.deepEqual(JSON.parse(String(init?.body)), {
    projectId: "project-a1",
    proposalBrief: "Protected synthetic proposal",
  });
  return Response.json({
    checkoutUrl: `https://checkout.stripe.com/c/pay/${testSessionId}#test`,
  });
};

test("prepares one strict test-mode Checkout handoff without exposing secrets", async () => {
  const artifact = await prepareStripeTestSession(
    env,
    fetchOk,
    () => new Date("2026-09-02T00:00:00.000Z"),
  );
  assert.equal(artifact.sessionId, testSessionId);
  assert.equal(artifact.target, "protected_non_production");
  const summary = JSON.stringify(safeStripeTestSessionSummary(artifact));
  assert.doesNotMatch(summary, /cs_test_|checkout\.stripe|private-cookie|proposal/i);
});

test("denies Production aliases and non-allowlisted hosts", async () => {
  await assert.rejects(
    prepareStripeTestSession(
      {
        ...env,
        PLANNERA_STRIPE_TEST_BASE_URL:
          "https://plannera-ab-robbietalls-projects.vercel.app",
        PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:
          "https://plannera-ab-robbietalls-projects.vercel.app",
      },
      fetchOk,
    ),
    /production_or_unprotected_host_denied/,
  );
  await assert.rejects(
    prepareStripeTestSession(
      {
        ...env,
        PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:
          "https://plannera-different-robbietalls-projects.vercel.app",
      },
      fetchOk,
    ),
    /base_url_not_allowlisted/,
  );
});

test("denies live, malformed and failed Checkout responses", async () => {
  await assert.rejects(
    prepareStripeTestSession(env, async () =>
      Response.json({
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_123",
      }),
    ),
    /test_session_id_invalid/,
  );
  await assert.rejects(
    prepareStripeTestSession(env, async () =>
      Response.json({ checkoutUrl: "https://example.com/c/pay/cs_test_123" }),
    ),
    /checkout_host_denied/,
  );
  await assert.rejects(
    prepareStripeTestSession(env, async () => new Response(null, { status: 503 })),
    /checkout_request_failed_503/,
  );
});

test("workflow is main-only, protected and never receives a Stripe key", () => {
  const workflow = readFileSync(
    ".github/workflows/stripe-test-session-prepare.yml",
    "utf8",
  );
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: stripe-test-acceptance/);
  assert.match(workflow, /PROTECTED NON-PRODUCTION/);
  assert.match(workflow, /retention-days: 1/);
  assert.match(workflow, /PLANNERA_STRIPE_TEST_VERCEL_BYPASS/);
  assert.doesNotMatch(workflow, /STRIPE_TEST_SECRET_KEY|STRIPE_SECRET_KEY/);
  assert.doesNotMatch(workflow, /set -x|ACTIONS_STEP_DEBUG/);
});

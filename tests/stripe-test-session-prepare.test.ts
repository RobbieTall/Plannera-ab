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
  PLANNERA_STRIPE_TEST_SESSION_COOKIE:
    "__Secure-next-auth.session-token=private-cookie-token",
  PLANNERA_STRIPE_TEST_VERCEL_BYPASS: "private-vercel-bypass",
};

const testSessionId = "cs_test_1234567890ABCDEF";
const checkoutResponse = () =>
  Response.json({
    checkoutUrl: `https://checkout.stripe.com/c/pay/${testSessionId}#test`,
  });
const authenticatedSessionResponse = () =>
  Response.json({ user: { id: "test-requester" } });

const withAuthenticatedSession = (
  checkout: () => Response | Promise<Response>,
) => async (input: string | URL | Request) => {
  if (String(input).endsWith("/api/auth/session")) {
    return authenticatedSessionResponse();
  }
  return checkout();
};

const fetchOk = async (input: string | URL | Request, init?: RequestInit) => {
  if (String(input).endsWith("/api/auth/session")) {
    assert.equal(init?.method, "GET");
    assert.equal(
      (init?.headers as Record<string, string>).cookie,
      env.PLANNERA_STRIPE_TEST_SESSION_COOKIE,
    );
    assert.equal(
      (init?.headers as Record<string, string>)["x-vercel-protection-bypass"],
      env.PLANNERA_STRIPE_TEST_VERCEL_BYPASS,
    );
    return authenticatedSessionResponse();
  }

  assert.equal(
    String(input),
    `${env.PLANNERA_STRIPE_TEST_BASE_URL}/api/planning-pack/checkout`,
  );
  assert.equal(init?.method, "POST");
  assert.equal(
    (init?.headers as Record<string, string>).cookie,
    env.PLANNERA_STRIPE_TEST_SESSION_COOKIE,
  );
  assert.deepEqual(JSON.parse(String(init?.body)), {
    projectId: "project-a1",
    proposalBrief: "Protected synthetic proposal",
  });
  return checkoutResponse();
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

test("allows only the dedicated stable acceptance alias", async () => {
  const alias =
    "https://plannera-ab-git-ops-stripe-test-acceptance-robbietalls-projects.vercel.app";
  const artifact = await prepareStripeTestSession(
    {
      ...env,
      PLANNERA_STRIPE_TEST_BASE_URL: alias,
      PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL: alias,
    },
    async (input) => {
      if (String(input).endsWith("/api/auth/session")) {
        return authenticatedSessionResponse();
      }
      assert.equal(String(input), `${alias}/api/planning-pack/checkout`);
      return checkoutResponse();
    },
  );
  assert.equal(artifact.baseUrl, alias);
});

test("denies Production aliases and non-allowlisted hosts", async () => {
  for (const productionUrl of [
    "https://plannera-ab-robbietalls-projects.vercel.app",
    "https://plannera-ab-git-main-robbietalls-projects.vercel.app",
  ]) {
    await assert.rejects(
      prepareStripeTestSession(
        {
          ...env,
          PLANNERA_STRIPE_TEST_BASE_URL: productionUrl,
          PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL: productionUrl,
        },
        fetchOk,
      ),
      /production_or_unprotected_host_denied/,
    );
  }
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

test("requires the exact secure NextAuth cookie pair before any request", async () => {
  let requests = 0;
  await assert.rejects(
    prepareStripeTestSession(
      {
        ...env,
        PLANNERA_STRIPE_TEST_SESSION_COOKIE: "private-cookie-token",
      },
      async () => {
        requests += 1;
        return authenticatedSessionResponse();
      },
    ),
    /session_cookie_invalid/,
  );
  assert.equal(requests, 0);
});

test("requires an authenticated session before posting Checkout", async () => {
  let checkoutPosts = 0;
  await assert.rejects(
    prepareStripeTestSession(env, async (input) => {
      if (String(input).endsWith("/api/auth/session")) {
        return Response.json({});
      }
      checkoutPosts += 1;
      return checkoutResponse();
    }),
    /session_cookie_not_authenticated/,
  );
  assert.equal(checkoutPosts, 0);

  await assert.rejects(
    prepareStripeTestSession(env, async () => new Response(null, { status: 401 })),
    /session_preflight_failed_401/,
  );
});

test("denies live, malformed and failed Checkout responses", async () => {
  await assert.rejects(
    prepareStripeTestSession(
      env,
      withAuthenticatedSession(() =>
        Response.json({
          checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_123",
        }),
      ),
    ),
    /test_session_id_invalid/,
  );
  await assert.rejects(
    prepareStripeTestSession(
      env,
      withAuthenticatedSession(() =>
        Response.json({
          checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123-invalid",
        }),
      ),
    ),
    /test_session_id_invalid/,
  );
  await assert.rejects(
    prepareStripeTestSession(
      env,
      withAuthenticatedSession(() =>
        Response.json({ checkoutUrl: "https://example.com/c/pay/cs_test_123" }),
      ),
    ),
    /checkout_host_denied/,
  );
  await assert.rejects(
    prepareStripeTestSession(
      env,
      withAuthenticatedSession(() => new Response(null, { status: 503 })),
    ),
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

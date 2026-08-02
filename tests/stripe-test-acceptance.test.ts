import assert from "node:assert/strict";
import test from "node:test";

import { parsePlanningPackStatus, runStripeTestAcceptance, validateAcceptanceConfiguration, type StripeAcceptancePhase } from "../src/lib/stripe-test-acceptance";

const baseEnv = {
  PLANNERA_STRIPE_TEST_BASE_URL: "https://item-72c-preview.vercel.app",
  PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL: "https://item-72c-preview.vercel.app",
  PLANNERA_STRIPE_TEST_TARGET: "PROTECTED NON-PRODUCTION",
  PLANNERA_STRIPE_TEST_CONFIRMATION: "RUN STRIPE TEST-MODE ACCEPTANCE",
  PLANNERA_STRIPE_TEST_PHASE: "paid",
  STRIPE_TEST_SECRET_KEY: "sk_test_placeholder",
  PLANNERA_STRIPE_TEST_SESSION_ID: "cs_test_123",
  PLANNERA_STRIPE_TEST_SESSION_COOKIE: "private-cookie",
  PLANNERA_STRIPE_TEST_VERCEL_BYPASS: "private-vercel-bypass",
  PLANNERA_STRIPE_TEST_PROJECT_ID: "project-a",
  PLANNERA_STRIPE_TEST_PROPOSAL: "private proposal a",
  PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID: "project-b",
  PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID: "qsc-opaque",
  PLANNERA_STRIPE_TEST_OTHER_PROPOSAL: "private proposal b",
  PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON: JSON.stringify({ projectId: "project-a", proposalBrief: "private proposal a" }),
};

const providerSession = (phase: StripeAcceptancePhase) => ({
  id: "cs_test_123", created: 100000, livemode: false, mode: "payment",
  status: phase === "before_payment" ? "open" : "complete", payment_status: phase === "before_payment" ? "unpaid" : "paid",
  amount_total: 4900, currency: "aud", total_details: { amount_tax: phase === "before_payment" ? 0 : 445 },
  metadata: { purchase_id: "purchase-opaque" }, line_items: { data: [{ amount_total: 4900, amount_tax: phase === "before_payment" ? 0 : 445, currency: "aud" }] },
  payment_intent: { latest_charge: { refunds: { data: phase === "refunded" ? [{ id: "re_test_1", amount: 4900, status: "succeeded" }] : [] } } },
});

function harness(phase: StripeAcceptancePhase, options: { paginate?: boolean; duplicate?: boolean; exactState?: string; paidCheckoutStatus?: number; dppStatus?: number } = {}) {
  const session = providerSession(phase); let listCall = 0; let dppCount = phase === "refunded" ? 1 : 0; const calls = { checkout: 0, exactDpp: 0, changedDpp: 0, pages: 0 };
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes(`/checkout/sessions/cs_test_123`)) return Response.json(session);
    if (url.includes("/checkout/sessions?")) {
      calls.pages += 1; listCall += 1;
      const secondPage = new URL(url).searchParams.has("starting_after");
      if (options.paginate && !secondPage) return Response.json({ data: [{ id: "irrelevant", metadata: {}, status: "complete" }], has_more: true });
      const data = [{ id: "cs_test_123", metadata: { purchase_id: "purchase-opaque" }, status: "open" }];
      if (options.duplicate) data.push({ id: "cs_test_duplicate", metadata: { purchase_id: "purchase-opaque" }, status: "complete" });
      return Response.json({ data, has_more: false });
    }
    if (url.includes("item-72c-preview.vercel.app")) {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-vercel-protection-bypass"), "private-vercel-bypass");
    }
    if (url.includes("/api/projects/project-a/artefacts")) return Response.json(Array.from({ length: dppCount }, (_, index) => ({ id: `dpp-${index}`, type: "detailed_planning_pack", payload: { projectId: "internal-project-a", proposalBrief: "private proposal a", sourceQuickSiteCheck: { artefactId: "qsc-opaque" } } })));
    const body = JSON.parse(String(init?.body)) as { projectId: string; proposalBrief: string };
    const exact = body.projectId === "project-a" && body.proposalBrief === "private proposal a";
    if (url.endsWith("/api/planning-pack/status")) return Response.json({ enabled: true, state: exact ? (options.exactState ?? (phase === "before_payment" ? "waiting" : phase)) : "available" });
    if (url.endsWith("/api/planning-pack/checkout")) { calls.checkout += 1; return new Response(null, { status: options.paidCheckoutStatus ?? 409 }); }
    if (url.endsWith("/api/artefacts/generate-detailed-planning-pack")) {
      if (exact) calls.exactDpp += 1; else calls.changedDpp += 1;
      const responseStatus = options.dppStatus ?? (phase === "paid" && exact ? 201 : 402);
      if (exact && responseStatus === 201) dppCount += 1;
      return new Response(null, { status: responseStatus });
    }
    throw new Error("unexpected test URL");
  };
  return { fetcher: fetcher as typeof fetch, calls, get listCalls() { return listCall; }, get dppCount() { return dppCount; } };
}

test("configuration exactly allowlists protected HTTPS target and denies live/production/local alternates", () => {
  validateAcceptanceConfiguration(baseEnv);
  for (const change of [
    { STRIPE_TEST_SECRET_KEY: "sk_live_nope" }, { PLANNERA_STRIPE_TEST_SESSION_ID: "cs_live_nope" },
    { PLANNERA_STRIPE_TEST_SESSION_ID: "cs_test_good\nsecret" }, { PLANNERA_STRIPE_TEST_SESSION_ID: "cs_test_bad?expand=secret" },
    { PLANNERA_STRIPE_TEST_SESSION_ID: `cs_test_${"a".repeat(248)}` }, { PLANNERA_STRIPE_TEST_SESSION_ID: "cs_test_bad/segment" },
    { PLANNERA_STRIPE_TEST_BASE_URL: "https://plannera-ab.vercel.app", PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL: "https://plannera-ab.vercel.app" },
    { PLANNERA_STRIPE_TEST_BASE_URL: "https://plannera.ai", PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL: "https://plannera.ai" },
    { PLANNERA_STRIPE_TEST_BASE_URL: "https://plannera-preview.vercel.app" },
    { PLANNERA_STRIPE_TEST_BASE_URL: "http://localhost:3000", PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL: "http://localhost:3000" },
  ]) assert.throws(() => validateAcceptanceConfiguration({ ...baseEnv, ...change }));
  assert.throws(() => validateAcceptanceConfiguration({ ...baseEnv, PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON: JSON.stringify({ projectId: "project-b", proposalBrief: "private proposal a" }) }));
  assert.throws(() => validateAcceptanceConfiguration({ ...baseEnv, PLANNERA_STRIPE_TEST_VERCEL_BYPASS: "" }));
  assert.throws(() => validateAcceptanceConfiguration({ ...baseEnv, PLANNERA_STRIPE_TEST_VERCEL_BYPASS: "bad value with spaces" }));
});

test("status parser locks acceptance to the exact shipped enabled/state response", () => {
  for (const state of ["available", "waiting", "paid", "failed", "cancelled", "refunded", "revoked"]) assert.deepEqual(parsePlanningPackStatus({ enabled: true, state }), { enabled: true, state });
  for (const invalid of [{ enabled: true, entitled: true, status: "PAID" }, { enabled: false, state: "free" }, { enabled: true, state: "pending" }, { enabled: true, state: "paid", extra: true }]) assert.throws(() => parsePlanningPackStatus(invalid));
});

test("three phases prove DPP gates when the public project ID differs from the internal payload ID", async () => {
  for (const phase of ["before_payment", "paid", "refunded"] as const) {
    const h = harness(phase);
    for (let repeat = 0; repeat < 2; repeat++) {
      const result = await runStripeTestAcceptance({ ...baseEnv, PLANNERA_STRIPE_TEST_PHASE: phase }, h.fetcher);
      assert.equal(result.exitCode, 0); assert.equal(result.summary.reason, null);
      assert.deepEqual(Object.keys(result.summary).sort(), ["checks", "opaque", "passed", "phase", "reason", "runnerVersion"]);
      assert.doesNotMatch(JSON.stringify(result.summary), /private proposal|private-cookie|private-vercel-bypass|sk_test/);
    }
    assert.equal(h.calls.exactDpp, phase === "paid" ? 1 : 2);
    assert.equal(h.calls.changedDpp, phase === "paid" ? 4 : 0); assert.equal(h.calls.checkout, phase === "paid" ? 4 : 0);
    assert.equal(h.dppCount, phase === "before_payment" ? 0 : 1);
  }
});

test("phase mismatch, status mismatch, checkout replay, DPP gates and partial refund fail closed", async () => {
  const cases: Array<[StripeAcceptancePhase, ReturnType<typeof harness>, string]> = [
    ["paid", harness("before_payment"), "phase_mismatch"],
    ["paid", harness("paid", { exactState: "waiting" }), "scope_mismatch"],
    ["paid", harness("paid", { paidCheckoutStatus: 200 }), "checkout_replay_failed"],
    ["before_payment", harness("before_payment", { dppStatus: 201 }), "dpp_gate_failed"],
    ["refunded", harness("refunded", { dppStatus: 201 }), "dpp_gate_failed"],
  ];
  for (const [requested, h, reason] of cases) { const result = await runStripeTestAcceptance({ ...baseEnv, PLANNERA_STRIPE_TEST_PHASE: requested }, h.fetcher); assert.equal(result.summary.reason, reason); }
  const partial = harness("refunded"); const session = providerSession("refunded"); session.payment_intent.latest_charge.refunds.data[0].amount = 100;
  const original = partial.fetcher; partial.fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => String(input).includes("/checkout/sessions/cs_test") ? Response.json(session) : original(input, init)) as typeof fetch;
  assert.equal((await runStripeTestAcceptance({ ...baseEnv, PLANNERA_STRIPE_TEST_PHASE: "refunded" }, partial.fetcher)).summary.reason, "refund_mismatch");
});

test("pagination follows starting_after, detects duplicates and fails on uncertain cursors", async () => {
  const paged = harness("paid", { paginate: true }); assert.equal((await runStripeTestAcceptance(baseEnv, paged.fetcher)).exitCode, 0); assert.equal(paged.calls.pages, 4);
  const duplicate = harness("paid", { duplicate: true }); assert.equal((await runStripeTestAcceptance(baseEnv, duplicate.fetcher)).summary.reason, "duplicate_checkout");
  const uncertain = harness("paid");
  uncertain.fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => String(input).includes("/checkout/sessions?") ? Response.json({ data: [], has_more: true }) : harness("paid").fetcher(input, init)) as typeof fetch;
  assert.equal((await runStripeTestAcceptance(baseEnv, uncertain.fetcher)).summary.reason, "pagination_uncertain");
});

test("arbitrary provider/request errors map to fixed safe reasons", async () => {
  const result = await runStripeTestAcceptance(baseEnv, (async () => { throw new Error("private proposal and provider payload"); }) as typeof fetch);
  assert.equal(result.summary.reason, "provider_request_failed"); assert.doesNotMatch(JSON.stringify(result.summary), /private proposal|provider payload/);
});

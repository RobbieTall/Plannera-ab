import { PLANNING_PACK_STATUS_STATES, type PlanningPackEnabledStatusResponse } from "@/lib/planning-pack-commerce";

export type StripeAcceptancePhase = "before_payment" | "paid" | "refunded";
export type AcceptanceEnv = Record<string, string | undefined>;
export type SafeAcceptanceSummary = {
  runnerVersion: "stripe_test_acceptance.v2";
  phase: StripeAcceptancePhase;
  passed: boolean;
  checks: {
    configuration: boolean; testMode: boolean; providerPhase: boolean; providerTerms: boolean;
    paginationComplete: boolean; checkoutReplaySafe: boolean; exactScope: boolean;
    changedScopesDenied: boolean; dppGate: boolean; terminalState: boolean;
    dppCreatedThisRun: boolean;
  };
  opaque: { checkoutSessionId: string };
  reason: AcceptanceReason | null;
};

export type AcceptanceReason =
  | "configuration_invalid" | "target_denied" | "live_mode_denied" | "provider_request_failed"
  | "provider_contract_invalid" | "phase_mismatch" | "terms_mismatch" | "pagination_uncertain"
  | "duplicate_checkout" | "application_request_failed" | "application_contract_invalid"
  | "scope_mismatch" | "checkout_replay_failed" | "dpp_gate_failed" | "refund_mismatch"
  | "acceptance_unhandled_failure";

class AcceptanceFailure extends Error { constructor(readonly code: AcceptanceReason) { super(code); } }
type ProviderSession = Record<string, unknown> & {
  livemode?: boolean; payment_status?: string; status?: string; mode?: string; amount_total?: number; currency?: string; created?: number;
  metadata?: { purchase_id?: string }; total_details?: { amount_tax?: number };
  line_items?: { data?: Array<{ amount_total?: number; amount_tax?: number; currency?: string }> };
  payment_intent?: { latest_charge?: { refunds?: { data?: Array<{ amount?: number; status?: string }> } } };
};
const fail = (code: AcceptanceReason): never => { throw new AcceptanceFailure(code); };
const required = (env: AcceptanceEnv, key: string): string => {
  const value = env[key]?.trim(); if (!value) return fail("configuration_invalid"); return value;
};
const safeUrl = (value: string): URL => { try { return new URL(value); } catch { return fail("target_denied"); } };
const appHeaders = (cookie: string, bypass: string, contentType = false): Record<string, string> => ({ ...(contentType ? { "content-type": "application/json" } : {}), cookie, "x-vercel-protection-bypass": bypass });

export function validateAcceptanceConfiguration(env: AcceptanceEnv) {
  const phase = required(env, "PLANNERA_STRIPE_TEST_PHASE") as StripeAcceptancePhase;
  if (!(["before_payment", "paid", "refunded"] as const).includes(phase)) fail("configuration_invalid");
  if (required(env, "PLANNERA_STRIPE_TEST_CONFIRMATION") !== "RUN STRIPE TEST-MODE ACCEPTANCE") fail("configuration_invalid");
  if (required(env, "PLANNERA_STRIPE_TEST_TARGET") !== "PROTECTED NON-PRODUCTION") fail("target_denied");
  const baseUrl = safeUrl(required(env, "PLANNERA_STRIPE_TEST_BASE_URL"));
  const allowed = safeUrl(required(env, "PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL"));
  const denied = new Set(["plannera-ab.vercel.app", "plannera.ai", "www.plannera.ai", "plannera.com.au", "www.plannera.com.au", "localhost", "127.0.0.1", "::1"]);
  if (baseUrl.protocol !== "https:" || allowed.protocol !== "https:" || baseUrl.origin !== allowed.origin || baseUrl.href !== allowed.href || denied.has(baseUrl.hostname.toLowerCase())) fail("target_denied");
  const stripeKey = required(env, "STRIPE_TEST_SECRET_KEY");
  const sessionId = required(env, "PLANNERA_STRIPE_TEST_SESSION_ID");
  if (!stripeKey.startsWith("sk_test_") || !/^cs_test_[A-Za-z0-9]{1,247}$/.test(sessionId)) fail("live_mode_denied");
  const cookie = required(env, "PLANNERA_STRIPE_TEST_SESSION_COOKIE");
  const vercelBypass = required(env, "PLANNERA_STRIPE_TEST_VERCEL_BYPASS");
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(vercelBypass)) fail("configuration_invalid");
  const projectId = required(env, "PLANNERA_STRIPE_TEST_PROJECT_ID");
  const proposal = required(env, "PLANNERA_STRIPE_TEST_PROPOSAL");
  const otherProjectId = required(env, "PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID");
  const quickSiteCheckArtefactId = required(env, "PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID");
  const otherProposal = required(env, "PLANNERA_STRIPE_TEST_OTHER_PROPOSAL");
  let dppBody: unknown;
  try { dppBody = JSON.parse(required(env, "PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON")); } catch { fail("configuration_invalid"); }
  if (!dppBody || typeof dppBody !== "object" || Array.isArray(dppBody)) fail("configuration_invalid");
  const record = dppBody as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "projectId,proposalBrief" || record.projectId !== projectId || record.proposalBrief !== proposal) fail("configuration_invalid");
  return { phase, baseUrl, stripeKey, sessionId, cookie, vercelBypass, projectId, proposal, otherProjectId, otherProposal, quickSiteCheckArtefactId, dppBody: record };
}

const stripeGet = async (fetcher: typeof fetch, key: string, path: string): Promise<Record<string, unknown>> => {
  const response = await fetcher(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${key}` }, redirect: "error" }).catch(() => fail("provider_request_failed"));
  if (!response.ok) fail("provider_request_failed");
  try { const value: unknown = await response.json(); if (!value || typeof value !== "object") return fail("provider_contract_invalid"); return value as Record<string, unknown>; } catch (error) { if (error instanceof AcceptanceFailure) throw error; return fail("provider_contract_invalid"); }
};

export function parsePlanningPackStatus(value: unknown): PlanningPackEnabledStatusResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("application_contract_invalid");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "enabled,state" || record.enabled !== true || !PLANNING_PACK_STATUS_STATES.includes(record.state as never)) fail("application_contract_invalid");
  return record as PlanningPackEnabledStatusResponse;
}

const appPost = async (fetcher: typeof fetch, url: URL, cookie: string, vercelBypass: string, body: unknown): Promise<Response> => {
  return fetcher(url, { method: "POST", redirect: "error", headers: appHeaders(cookie, vercelBypass, true), body: JSON.stringify(body) }).catch(() => fail("application_request_failed"));
};
const status = async (fetcher: typeof fetch, baseUrl: URL, cookie: string, vercelBypass: string, body: unknown): Promise<PlanningPackEnabledStatusResponse> => {
  const response = await appPost(fetcher, new URL("/api/planning-pack/status", baseUrl), cookie, vercelBypass, body);
  if (!response.ok) fail("application_request_failed");
  try { return parsePlanningPackStatus(await response.json()); } catch (error) { if (error instanceof AcceptanceFailure) throw error; return fail("application_contract_invalid"); }
};

const countExactAcceptanceDpps = async (fetcher: typeof fetch, baseUrl: URL, cookie: string, vercelBypass: string, projectId: string, proposal: string, quickSiteCheckArtefactId: string) => {
  const url = new URL(`/api/projects/${encodeURIComponent(projectId)}/artefacts`, baseUrl);
  const response = await fetcher(url, { method: "GET", redirect: "error", headers: appHeaders(cookie, vercelBypass) }).catch(() => fail("application_request_failed"));
  if (!response.ok) fail("application_request_failed");
  let value: unknown;
  try { value = await response.json(); } catch { return fail("application_contract_invalid"); }
  if (!Array.isArray(value)) fail("application_contract_invalid");
  const artefacts = value as unknown[];
  return artefacts.filter((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    const payload = record.payload as Record<string, unknown> | undefined;
    const source = payload?.sourceQuickSiteCheck as Record<string, unknown> | undefined;
    return record.type === "detailed_planning_pack" && payload?.proposalBrief === proposal && source?.artefactId === quickSiteCheckArtefactId;
  }).length;
};

const listPurchaseSessions = async (fetcher: typeof fetch, key: string, purchaseId: string, created: number) => {
  let after: string | undefined; let pages = 0; const ids: string[] = [];
  while (true) {
    if (++pages > 100) fail("pagination_uncertain");
    const query = new URLSearchParams({ limit: "100", "created[gte]": String(Math.max(0, created - 86400)) });
    if (after) query.set("starting_after", after);
    const page = await stripeGet(fetcher, key, `checkout/sessions?${query}`);
    if (!Array.isArray(page.data) || typeof page.has_more !== "boolean") fail("pagination_uncertain");
    const data = page.data as Array<Record<string, unknown>>;
    for (const item of data) {
      const metadata = item.metadata as Record<string, unknown> | undefined;
      if (metadata?.purchase_id === purchaseId && item.status !== "expired" && typeof item.id === "string") ids.push(item.id);
    }
    if (!page.has_more) return ids;
    const last = data.at(-1);
    if (!last || typeof last.id !== "string" || last.id === after || data.length === 0) fail("pagination_uncertain");
    after = typeof last?.id === "string" ? last.id : fail("pagination_uncertain");
  }
};

const initialChecks = (): SafeAcceptanceSummary["checks"] => ({ configuration: false, testMode: false, providerPhase: false, providerTerms: false, paginationComplete: false, checkoutReplaySafe: false, exactScope: false, changedScopesDenied: false, dppGate: false, terminalState: false, dppCreatedThisRun: false });

export async function runStripeTestAcceptance(env: AcceptanceEnv, fetcher: typeof fetch): Promise<{ exitCode: number; summary: SafeAcceptanceSummary }> {
  const checks = initialChecks(); let phase: StripeAcceptancePhase = "before_payment"; let sessionId = "unavailable"; let reason: AcceptanceReason | null = null;
  try {
    const config = validateAcceptanceConfiguration(env); ({ phase, sessionId } = config); checks.configuration = true;
    const session = await stripeGet(fetcher, config.stripeKey, `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items&expand[]=payment_intent.latest_charge.refunds`) as ProviderSession;
    if (session.livemode !== false) fail("live_mode_denied"); checks.testMode = true;
    const unpaid = session.payment_status === "unpaid" && session.status === "open";
    const paid = session.payment_status === "paid" && session.status === "complete" && session.mode === "payment";
    if ((phase === "before_payment" && !unpaid) || (phase !== "before_payment" && !paid)) fail("phase_mismatch"); checks.providerPhase = true;
    const line = session.line_items?.data?.[0];
    if (session.amount_total !== 4900 || String(session.currency).toUpperCase() !== "AUD" || session.line_items?.data?.length !== 1 || line?.amount_total !== 4900) fail("terms_mismatch");
    if (phase !== "before_payment" && (session.total_details?.amount_tax !== 445 || line?.amount_tax !== 445 || line?.currency !== "aud")) fail("terms_mismatch"); checks.providerTerms = true;
    const purchaseId = typeof session.metadata?.purchase_id === "string" ? session.metadata.purchase_id : fail("provider_contract_invalid");
    const sessionCreated = typeof session.created === "number" ? session.created : fail("provider_contract_invalid");
    const beforeIds = await listPurchaseSessions(fetcher, config.stripeKey, purchaseId, sessionCreated); checks.paginationComplete = true;
    if (beforeIds.length !== 1 || beforeIds[0] !== sessionId) fail("duplicate_checkout");
    const exactBody = config.dppBody; const otherProposalBody = { projectId: config.projectId, proposalBrief: config.otherProposal }; const otherProjectBody = { projectId: config.otherProjectId, proposalBrief: config.proposal };
    const exact = await status(fetcher, config.baseUrl, config.cookie, config.vercelBypass, exactBody);
    const changedProposal = await status(fetcher, config.baseUrl, config.cookie, config.vercelBypass, otherProposalBody);
    const otherProject = await status(fetcher, config.baseUrl, config.cookie, config.vercelBypass, otherProjectBody);
    const expected = phase === "before_payment" ? "waiting" : phase === "paid" ? "paid" : "refunded";
    if (exact.state !== expected) fail("scope_mismatch"); checks.exactScope = true;
    if (changedProposal.state === "paid" || otherProject.state === "paid") fail("scope_mismatch"); checks.changedScopesDenied = true;
    if (phase === "paid") {
      for (let attempt = 0; attempt < 2; attempt++) { const response = await appPost(fetcher, new URL("/api/planning-pack/checkout", config.baseUrl), config.cookie, config.vercelBypass, exactBody); if (response.status !== 409) fail("checkout_replay_failed"); }
      const afterIds = await listPurchaseSessions(fetcher, config.stripeKey, purchaseId, sessionCreated); if (afterIds.length !== beforeIds.length || afterIds.some((id, index) => id !== beforeIds[index])) fail("checkout_replay_failed"); checks.checkoutReplaySafe = true;
    } else checks.checkoutReplaySafe = true;
    const dppUrl = new URL("/api/artefacts/generate-detailed-planning-pack", config.baseUrl);
    const dppCountBefore = await countExactAcceptanceDpps(fetcher, config.baseUrl, config.cookie, config.vercelBypass, config.projectId, config.proposal, config.quickSiteCheckArtefactId);
    if (dppCountBefore > 1 || (phase === "before_payment" && dppCountBefore !== 0) || (phase === "refunded" && dppCountBefore !== 1)) fail("dpp_gate_failed");
    if (phase === "paid" && dppCountBefore === 0) {
      if ((await appPost(fetcher, dppUrl, config.cookie, config.vercelBypass, exactBody)).status !== 201) fail("dpp_gate_failed");
      checks.dppCreatedThisRun = true;
    } else if (phase !== "paid" && (await appPost(fetcher, dppUrl, config.cookie, config.vercelBypass, exactBody)).status !== 402) fail("dpp_gate_failed");
    if (phase === "paid") for (const body of [otherProposalBody, otherProjectBody]) { if ((await appPost(fetcher, dppUrl, config.cookie, config.vercelBypass, body)).status !== 402) fail("dpp_gate_failed"); }
    const dppCountAfter = await countExactAcceptanceDpps(fetcher, config.baseUrl, config.cookie, config.vercelBypass, config.projectId, config.proposal, config.quickSiteCheckArtefactId);
    if (dppCountAfter !== (phase === "before_payment" ? 0 : 1)) fail("dpp_gate_failed");
    checks.dppGate = true;
    const refunds = session.payment_intent?.latest_charge?.refunds?.data;
    if (phase === "refunded") { if (!Array.isArray(refunds) || refunds.length !== 1 || refunds[0]?.amount !== 4900 || refunds[0]?.status !== "succeeded") fail("refund_mismatch"); }
    else if (Array.isArray(refunds) && refunds.length) fail("phase_mismatch");
    checks.terminalState = true;
  } catch (error) { reason = error instanceof AcceptanceFailure ? error.code : "acceptance_unhandled_failure"; }
  const summary: SafeAcceptanceSummary = { runnerVersion: "stripe_test_acceptance.v2", phase, passed: reason === null, checks, opaque: { checkoutSessionId: sessionId }, reason };
  return { exitCode: summary.passed ? 0 : 1, summary };
}

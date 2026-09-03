export type StripeTestSessionPrepareEnvironment = Record<string, string | undefined>;

export type StripeTestSessionArtifact = {
  schemaVersion: "stripe_test_session.v1";
  createdAt: string;
  target: "protected_non_production";
  baseUrl: string;
  sessionId: string;
  checkoutUrl: string;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const PROTECTED_ACCEPTANCE_ALIAS =
  "plannera-ab-git-ops-stripe-test-acceptance-robbietalls-projects.vercel.app";

const required = (
  env: StripeTestSessionPrepareEnvironment,
  name: string,
): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
};

const protectedPreviewBaseUrl = (
  env: StripeTestSessionPrepareEnvironment,
): string => {
  const baseUrl = required(env, "PLANNERA_STRIPE_TEST_BASE_URL");
  const allowedBaseUrl = required(
    env,
    "PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL",
  );
  if (baseUrl !== allowedBaseUrl) throw new Error("base_url_not_allowlisted");

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("base_url_invalid");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error("base_url_invalid");
  }

  const protectedDeployment =
    /^plannera-[a-z0-9]{6,32}-robbietalls-projects\.vercel\.app$/;
  if (
    parsed.hostname !== PROTECTED_ACCEPTANCE_ALIAS &&
    !protectedDeployment.test(parsed.hostname)
  ) {
    throw new Error("production_or_unprotected_host_denied");
  }

  return parsed.origin;
};

const sessionIdFromCheckoutUrl = (checkoutUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(checkoutUrl);
  } catch {
    throw new Error("checkout_url_invalid");
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "checkout.stripe.com") {
    throw new Error("checkout_host_denied");
  }

  const sessionId = checkoutUrl.match(/cs_test_[A-Za-z0-9]{1,247}/)?.[0];
  if (!sessionId || !/^cs_test_[A-Za-z0-9]{1,247}$/.test(sessionId)) {
    throw new Error("test_session_id_invalid");
  }
  return sessionId;
};

export const prepareStripeTestSession = async (
  env: StripeTestSessionPrepareEnvironment,
  fetchImpl: FetchLike = fetch,
  now: () => Date = () => new Date(),
): Promise<StripeTestSessionArtifact> => {
  const baseUrl = protectedPreviewBaseUrl(env);
  const projectId = required(env, "PLANNERA_STRIPE_TEST_PROJECT_ID");
  const proposalBrief = required(env, "PLANNERA_STRIPE_TEST_PROPOSAL");
  const cookie = required(env, "PLANNERA_STRIPE_TEST_SESSION_COOKIE");
  const vercelBypass = required(env, "PLANNERA_STRIPE_TEST_VERCEL_BYPASS");

  if (!/^[A-Za-z0-9_-]{8,128}$/.test(projectId)) {
    throw new Error("project_id_invalid");
  }
  if (proposalBrief.length < 3 || proposalBrief.length > 2_000) {
    throw new Error("proposal_invalid");
  }
  if (
    cookie.length < 8 ||
    cookie.length > 4_096 ||
    /[\r\n]/.test(cookie)
  ) {
    throw new Error("session_cookie_invalid");
  }
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(vercelBypass)) {
    throw new Error("vercel_bypass_invalid");
  }

  const response = await fetchImpl(`${baseUrl}/api/planning-pack/checkout`, {
    method: "POST",
    redirect: "error",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-vercel-protection-bypass": vercelBypass,
    },
    body: JSON.stringify({ projectId, proposalBrief }),
  });
  if (!response.ok) throw new Error(`checkout_request_failed_${response.status}`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("checkout_response_invalid");
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { checkoutUrl?: unknown }).checkoutUrl !== "string"
  ) {
    throw new Error("checkout_response_invalid");
  }

  const checkoutUrl = (body as { checkoutUrl: string }).checkoutUrl;
  const sessionId = sessionIdFromCheckoutUrl(checkoutUrl);
  return {
    schemaVersion: "stripe_test_session.v1",
    createdAt: now().toISOString(),
    target: "protected_non_production",
    baseUrl,
    sessionId,
    checkoutUrl,
  };
};

export const safeStripeTestSessionSummary = (
  artifact: StripeTestSessionArtifact,
) => ({
  schemaVersion: artifact.schemaVersion,
  prepared: true,
  target: artifact.target,
  createdAt: artifact.createdAt,
});

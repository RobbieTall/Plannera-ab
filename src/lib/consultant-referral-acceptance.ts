const RUN_CONFIRMATION = "RUN CONSULTANT REFERRAL ACCEPTANCE";
const TARGET_CONFIRMATION = "PROTECTED NON-PRODUCTION";
const SYNTHETIC_NAME = "Plannera Referral Acceptance";
const SYNTHETIC_EMAIL = "referral-acceptance@plannera.invalid";

type Env = Record<string, string | undefined>;

export type ReferralAcceptanceReason =
  | "configuration_invalid"
  | "target_denied"
  | "application_request_failed"
  | "application_contract_invalid"
  | "preexisting_referral"
  | "submission_failed"
  | "queue_verification_failed"
  | "transition_failed"
  | "user_status_failed"
  | "cleanup_failed"
  | "acceptance_unhandled_failure";

export type ReferralAcceptanceSummary = {
  runnerVersion: "consultant_referral_acceptance.v1";
  passed: boolean;
  reason: ReferralAcceptanceReason | null;
  checks: {
    configuration: boolean;
    preflightEmpty: boolean;
    submitted: boolean;
    operatorQueue: boolean;
    transitions: boolean;
    userStatus: boolean;
    cleanup: boolean;
  };
  opaque: {
    referralId: string;
    reviewRequestArtefactId: string;
    packageDigest: string;
  };
  statuses: string[];
};

class AcceptanceFailure extends Error {
  constructor(public reason: ReferralAcceptanceReason) {
    super(reason);
  }
}

const fail = (reason: ReferralAcceptanceReason): never => {
  throw new AcceptanceFailure(reason);
};

const required = (env: Env, key: string) => env[key]?.trim() || fail("configuration_invalid");

export const validateConsultantReferralAcceptanceConfiguration = (env: Env) => {
  if (required(env, "PLANNERA_REFERRAL_TEST_CONFIRMATION") !== RUN_CONFIRMATION) fail("configuration_invalid");
  if (required(env, "PLANNERA_REFERRAL_TEST_TARGET") !== TARGET_CONFIRMATION) fail("target_denied");
  let baseUrl: URL;
  let allowedUrl: URL;
  try {
    baseUrl = new URL(required(env, "PLANNERA_REFERRAL_TEST_BASE_URL"));
    allowedUrl = new URL(required(env, "PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL"));
  } catch {
    return fail("target_denied");
  }
  const denied = new Set([
    "plannera-ab.vercel.app",
    "plannera.ai",
    "www.plannera.ai",
    "plannera.com.au",
    "www.plannera.com.au",
    "localhost",
    "127.0.0.1",
    "::1",
  ]);
  if (
    baseUrl.protocol !== "https:" ||
    allowedUrl.protocol !== "https:" ||
    baseUrl.href !== allowedUrl.href ||
    denied.has(baseUrl.hostname.toLowerCase())
  ) fail("target_denied");
  const vercelBypass = required(env, "PLANNERA_REFERRAL_TEST_VERCEL_BYPASS");
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(vercelBypass)) fail("configuration_invalid");
  const projectId = required(env, "PLANNERA_REFERRAL_TEST_PROJECT_ID");
  const reviewRequestArtefactId = required(env, "PLANNERA_REFERRAL_TEST_REVIEW_REQUEST_ARTEFACT_ID");
  const cookie = required(env, "PLANNERA_REFERRAL_TEST_SESSION_COOKIE");
  const adminToken = required(env, "PLANNERA_REFERRAL_TEST_ADMIN_TOKEN");
  return { baseUrl, projectId, reviewRequestArtefactId, cookie, adminToken, vercelBypass };
};

const json = async (response: Response, reason: ReferralAcceptanceReason) => {
  if (!response.ok) return fail(reason);
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail("application_contract_invalid");
    return value as Record<string, unknown>;
  } catch {
    return fail("application_contract_invalid");
  }
};

const userHeaders = (cookie: string, bypass: string, contentType = false): Record<string, string> => ({
  cookie,
  "x-vercel-protection-bypass": bypass,
  ...(contentType ? { "content-type": "application/json" } : {}),
});

const adminHeaders = (token: string, bypass: string, contentType = false): Record<string, string> => ({
  "x-admin-token": token,
  "x-vercel-protection-bypass": bypass,
  ...(contentType ? { "content-type": "application/json" } : {}),
});

const request = async (fetcher: typeof fetch, url: URL, init: RequestInit, reason: ReferralAcceptanceReason) =>
  fetcher(url, { ...init, redirect: "error" }).catch(() => fail(reason));

const referralFromPayload = (payload: Record<string, unknown>) => {
  const referral = payload.referral;
  if (!referral || typeof referral !== "object" || Array.isArray(referral)) fail("application_contract_invalid");
  return referral as Record<string, unknown>;
};

export async function runConsultantReferralAcceptance(
  env: Env,
  fetcher: typeof fetch = fetch,
): Promise<ReferralAcceptanceSummary> {
  const summary: ReferralAcceptanceSummary = {
    runnerVersion: "consultant_referral_acceptance.v1",
    passed: false,
    reason: null,
    checks: {
      configuration: false,
      preflightEmpty: false,
      submitted: false,
      operatorQueue: false,
      transitions: false,
      userStatus: false,
      cleanup: false,
    },
    opaque: {
      referralId: "unavailable",
      reviewRequestArtefactId: "unavailable",
      packageDigest: "unavailable",
    },
    statuses: [],
  };
  let configuration: ReturnType<typeof validateConsultantReferralAcceptanceConfiguration> | null = null;
  let createdThisRun = false;
  try {
    configuration = validateConsultantReferralAcceptanceConfiguration(env);
    summary.checks.configuration = true;
    summary.opaque.reviewRequestArtefactId = configuration.reviewRequestArtefactId;
    const userEndpoint = new URL(
      `/api/projects/${encodeURIComponent(configuration.projectId)}/consultant-referrals?reviewRequestArtefactId=${encodeURIComponent(configuration.reviewRequestArtefactId)}`,
      configuration.baseUrl,
    );
    const preflight = await json(await request(fetcher, userEndpoint, {
      headers: userHeaders(configuration.cookie, configuration.vercelBypass),
    }, "application_request_failed"), "application_request_failed");
    if (preflight.enabled !== true) fail("configuration_invalid");
    if (preflight.referral !== null) fail("preexisting_referral");
    summary.checks.preflightEmpty = true;

    const submissionEndpoint = new URL(userEndpoint.pathname, configuration.baseUrl);
    const submission = await json(await request(fetcher, submissionEndpoint, {
      method: "POST",
      headers: userHeaders(configuration.cookie, configuration.vercelBypass, true),
      body: JSON.stringify({
        reviewRequestArtefactId: configuration.reviewRequestArtefactId,
        contactName: SYNTHETIC_NAME,
        contactEmail: SYNTHETIC_EMAIL,
        consent: true,
      }),
    }, "submission_failed"), "submission_failed");
    const submittedReferral = referralFromPayload(submission);
    if (submission.created !== true || submittedReferral.status !== "SUBMITTED" || typeof submittedReferral.id !== "string") fail("submission_failed");
    const submittedReferralId = submittedReferral.id as string;
    createdThisRun = true;
    summary.opaque.referralId = submittedReferralId;
    summary.statuses.push("SUBMITTED");
    summary.checks.submitted = true;

    const queueEndpoint = new URL("/api/admin/consultant-referrals?status=SUBMITTED&limit=100", configuration.baseUrl);
    const queue = await json(await request(fetcher, queueEndpoint, {
      headers: adminHeaders(configuration.adminToken, configuration.vercelBypass),
    }, "queue_verification_failed"), "queue_verification_failed");
    if (!Array.isArray(queue.referrals)) fail("queue_verification_failed");
    const queued = (queue.referrals as unknown[]).find((item) =>
      Boolean(item) && typeof item === "object" && (item as Record<string, unknown>).id === submittedReferralId) as Record<string, unknown> | undefined;
    const snapshot = queued?.packageSnapshot;
    if (
      !queued ||
      queued.contactName !== SYNTHETIC_NAME ||
      queued.contactEmail !== SYNTHETIC_EMAIL ||
      typeof queued.packageDigest !== "string" ||
      !/^[a-f0-9]{64}$/.test(queued.packageDigest) ||
      !snapshot ||
      typeof snapshot !== "object" ||
      (snapshot as Record<string, unknown>).snapshotVersion !== "consultant-referral-package.v1" ||
      (snapshot as Record<string, unknown>).reviewRequestArtefactId !== configuration.reviewRequestArtefactId
    ) fail("queue_verification_failed");
    summary.opaque.packageDigest = queued!.packageDigest as string;
    summary.checks.operatorQueue = true;

    const transitionEndpoint = new URL("/api/admin/consultant-referrals", configuration.baseUrl);
    for (const [toStatus, reasonCode] of [
      ["ACKNOWLEDGED", "acceptance_queue_reviewed"],
      ["ASSIGNED", "acceptance_sent_to_consultant"],
      ["CONSULTANT_ACKNOWLEDGED", "acceptance_consultant_acknowledged"],
      ["CLOSED", "acceptance_complete"],
    ] as const) {
      const transitioned = await json(await request(fetcher, transitionEndpoint, {
        method: "PATCH",
        headers: adminHeaders(configuration.adminToken, configuration.vercelBypass, true),
        body: JSON.stringify({ referralId: submittedReferralId, toStatus, reasonCode }),
      }, "transition_failed"), "transition_failed");
      if (referralFromPayload(transitioned).status !== toStatus) fail("transition_failed");
      summary.statuses.push(toStatus);
    }
    summary.checks.transitions = true;

    const userStatus = await json(await request(fetcher, userEndpoint, {
      headers: userHeaders(configuration.cookie, configuration.vercelBypass),
    }, "user_status_failed"), "user_status_failed");
    const userReferral = referralFromPayload(userStatus);
    if (
      userReferral.status !== "CLOSED" ||
      "contactEmail" in userReferral ||
      "contactName" in userReferral ||
      "packageSnapshot" in userReferral ||
      !Array.isArray(userReferral.events) ||
      userReferral.events.length !== 5
    ) fail("user_status_failed");
    summary.checks.userStatus = true;
  } catch (error) {
    summary.reason = error instanceof AcceptanceFailure ? error.reason : "acceptance_unhandled_failure";
  } finally {
    if (createdThisRun && configuration && summary.opaque.referralId !== "unavailable") {
      try {
        const deleteUrl = new URL(`/api/admin/consultant-referrals?referralId=${encodeURIComponent(summary.opaque.referralId)}`, configuration.baseUrl);
        const deleted = await json(await request(fetcher, deleteUrl, {
          method: "DELETE",
          headers: adminHeaders(configuration.adminToken, configuration.vercelBypass),
        }, "cleanup_failed"), "cleanup_failed");
        if (deleted.deleted !== true) fail("cleanup_failed");
        summary.checks.cleanup = true;
      } catch {
        summary.reason = "cleanup_failed";
      }
    }
  }
  summary.passed = Object.values(summary.checks).every(Boolean) && summary.reason === null;
  return summary;
}

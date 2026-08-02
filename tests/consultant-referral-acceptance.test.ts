import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  runConsultantReferralAcceptance,
  validateConsultantReferralAcceptanceConfiguration,
} from "../src/lib/consultant-referral-acceptance";

const env = {
  PLANNERA_REFERRAL_TEST_CONFIRMATION: "RUN CONSULTANT REFERRAL ACCEPTANCE",
  PLANNERA_REFERRAL_TEST_TARGET: "PROTECTED NON-PRODUCTION",
  PLANNERA_REFERRAL_TEST_BASE_URL: "https://plannera-item73-preview.vercel.app/",
  PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL: "https://plannera-item73-preview.vercel.app/",
  PLANNERA_REFERRAL_TEST_PROJECT_ID: "proj-acceptance",
  PLANNERA_REFERRAL_TEST_REVIEW_REQUEST_ARTEFACT_ID: "review-acceptance",
  PLANNERA_REFERRAL_TEST_SESSION_COOKIE: "__Secure-next-auth.session-token=opaque-test-cookie",
  PLANNERA_REFERRAL_TEST_VERCEL_BYPASS: "opaque_bypass_token_123456789",
  PLANNERA_REFERRAL_TEST_ADMIN_TOKEN: "opaque-admin-token",
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json" },
});

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
};

const digest = (value: unknown) => createHash("sha256")
  .update(JSON.stringify(stableValue(value)))
  .digest("hex");

const acceptanceSnapshot = {
  snapshotVersion: "consultant-referral-package.v1",
  reviewRequestArtefactId: "review-acceptance",
  sourceDetailedPlanningPackArtefactId: "dpp-acceptance",
  sourceQuickSiteCheckArtefactId: "qsc-acceptance",
  reviewRequest: {
    consultantNeedsVersion: "consultant-needs.v1",
    consultantNeeds: [{ disciplineId: "town_planning" }],
    disciplinePackages: [{ disciplineId: "town_planning" }],
  },
};

test("acceptance workflow is manual, protected and privacy-minimal", () => {
  const workflow = readFileSync(".github/workflows/consultant-referral-acceptance.yml", "utf8");
  assert.match(workflow, /^name: Consultant Referral Non-production Acceptance$/m);
  assert.match(workflow, /^  workflow_dispatch:$/m);
  assert.match(workflow, /environment: consultant-referral-test-acceptance/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /PLANNERA_REFERRAL_TEST_SESSION_COOKIE: \$\{\{ secrets\./);
  assert.match(workflow, /PLANNERA_REFERRAL_TEST_ADMIN_TOKEN: \$\{\{ secrets\./);
  assert.match(workflow, /accept:consultant-referral/);
  assert.doesNotMatch(workflow, /referral-acceptance@plannera\.invalid/);
});

test("acceptance CLI runs in the repository CommonJS tsx mode", () => {
  const result = spawnSync(
    "./node_modules/.bin/tsx",
    ["scripts/consultant-referral-acceptance.ts"],
    {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    },
  );

  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /Top-level await|Transform failed/);
  assert.deepEqual(JSON.parse(result.stdout), {
    runnerVersion: "consultant_referral_acceptance.v1",
    passed: false,
    reason: "configuration_invalid",
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
  });
});

test("acceptance configuration denies production and non-exact targets", () => {
  assert.throws(() => validateConsultantReferralAcceptanceConfiguration({
    ...env,
    PLANNERA_REFERRAL_TEST_BASE_URL: "https://plannera.ai/",
    PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL: "https://plannera.ai/",
  }), /target_denied/);
  assert.throws(() => validateConsultantReferralAcceptanceConfiguration({
    ...env,
    PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL: "https://another-preview.vercel.app/",
  }), /target_denied/);
});

test("acceptance proves submission, protected queue, truthful transitions, user-safe status and cleanup", async () => {
  let userGets = 0;
  const statuses = ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "CONSULTANT_ACKNOWLEDGED", "CLOSED"];
  let transitionIndex = 1;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    if (url.pathname.includes("/api/projects/") && method === "GET") {
      userGets += 1;
      if (userGets === 1) return json({ enabled: true, referral: null });
      return json({
        enabled: true,
        referral: {
          id: "referral-acceptance",
          status: "CLOSED",
          events: statuses.map((toStatus, index) => ({ fromStatus: index ? statuses[index - 1] : null, toStatus })),
        },
      });
    }
    if (url.pathname.includes("/api/projects/") && method === "POST") {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.contactEmail, "referral-acceptance@plannera.invalid");
      assert.equal(body.consent, true);
      return json({ created: true, referral: { id: "referral-acceptance", status: "SUBMITTED" } }, 201);
    }
    if (url.pathname === "/api/admin/consultant-referrals" && method === "GET") {
      assert.equal((init?.headers as Record<string, string>)["x-admin-token"], env.PLANNERA_REFERRAL_TEST_ADMIN_TOKEN);
      return json({
        referrals: [{
          id: "referral-acceptance",
          contactName: "Plannera Referral Acceptance",
          contactEmail: "referral-acceptance@plannera.invalid",
          packageDigest: digest(acceptanceSnapshot),
          packageSnapshot: acceptanceSnapshot,
        }],
      });
    }
    if (url.pathname === "/api/admin/consultant-referrals" && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.toStatus, statuses[transitionIndex]);
      transitionIndex += 1;
      return json({ referral: { id: "referral-acceptance", status: body.toStatus } });
    }
    if (url.pathname === "/api/admin/consultant-referrals" && method === "DELETE") {
      return json({ deleted: true });
    }
    return json({ error: "unexpected" }, 500);
  };

  const result = await runConsultantReferralAcceptance(env, fetcher);

  assert.equal(result.passed, true);
  assert.equal(result.reason, null);
  assert.deepEqual(result.statuses, statuses);
  assert.deepEqual(result.checks, {
    configuration: true,
    preflightEmpty: true,
    submitted: true,
    operatorQueue: true,
    transitions: true,
    userStatus: true,
    cleanup: true,
  });
  assert.equal(result.opaque.packageDigest, digest(acceptanceSnapshot));
  assert.doesNotMatch(JSON.stringify(result), /@|contactEmail|contactName|packageSnapshot/);
});

test("acceptance rejects a stored package whose digest does not match its exact snapshot", async () => {
  let userGets = 0;
  let deleted = false;
  const result = await runConsultantReferralAcceptance(env, async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    if (url.pathname.includes("/api/projects/") && method === "GET") {
      userGets += 1;
      return json({ enabled: true, referral: null });
    }
    if (url.pathname.includes("/api/projects/") && method === "POST") {
      return json({ created: true, referral: { id: "referral-acceptance", status: "SUBMITTED" } }, 201);
    }
    if (url.pathname === "/api/admin/consultant-referrals" && method === "GET") {
      return json({
        referrals: [{
          id: "referral-acceptance",
          contactName: "Plannera Referral Acceptance",
          contactEmail: "referral-acceptance@plannera.invalid",
          packageDigest: "a".repeat(64),
          packageSnapshot: acceptanceSnapshot,
        }],
      });
    }
    if (url.pathname === "/api/admin/consultant-referrals" && method === "DELETE") {
      deleted = true;
      return json({ deleted: true });
    }
    return json({ error: "unexpected" }, 500);
  });

  assert.equal(userGets, 1);
  assert.equal(result.passed, false);
  assert.equal(result.reason, "queue_verification_failed");
  assert.equal(result.checks.operatorQueue, false);
  assert.equal(result.checks.cleanup, true);
  assert.equal(deleted, true);
});

test("acceptance fails without mutating or deleting a pre-existing exact referral", async () => {
  const calls: string[] = [];
  const result = await runConsultantReferralAcceptance(env, async (input, init) => {
    calls.push(init?.method ?? "GET");
    return json({ enabled: true, referral: { id: "existing", status: "SUBMITTED" } });
  });

  assert.equal(result.passed, false);
  assert.equal(result.reason, "preexisting_referral");
  assert.deepEqual(calls, ["GET"]);
  assert.equal(result.checks.cleanup, false);
});

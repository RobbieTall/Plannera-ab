import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyVercelPreviewOidcFailure,
  fetchVercelPreviewOidcToken,
  resolveVercelPreviewOidcRequest,
} from "../src/lib/vercel-preview-oidc";

const validEnvironment = {
  GITHUB_REF_NAME: "accept/item-78c-byron-kempsey-20260914",
  GITHUB_SHA: "a".repeat(40),
  PLANNING_PACK_CHECKOUT_ENABLED: "false",
  SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "accept/item-78c-byron-kempsey-20260914",
  VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
  VERCEL_PROJECT_ID: "prj_example12345",
  VERCEL_TEAM_ID: "team_example12345",
  VERCEL_TOKEN: "synthetic-access-token",
};

test("requests a short-lived credential for the exact Preview branch", async () => {
  let requestedUrl = "";
  let authorization = "";

  const token = await fetchVercelPreviewOidcToken(
    validEnvironment,
    async (input, init) => {
      requestedUrl = input;
      authorization = init.headers.authorization;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          env: { VERCEL_OIDC_TOKEN: "header.payload.signature" },
        }),
      };
    },
  );

  assert.equal(token, "header.payload.signature");
  assert.match(
    requestedUrl,
    /\/preview\/accept%2Fitem-78c-byron-kempsey-20260914\?/,
  );
  assert.match(requestedUrl, /teamId=team_example12345/);
  assert.equal(authorization, "Bearer synthetic-access-token");
});

test("fails closed outside Preview or when checkout is enabled", () => {
  assert.throws(
    () =>
      resolveVercelPreviewOidcRequest({
        ...validEnvironment,
        VERCEL_ENV: "production",
      }),
    /restricted to the Preview environment/,
  );
  assert.throws(
    () =>
      resolveVercelPreviewOidcRequest({
        ...validEnvironment,
        PLANNING_PACK_CHECKOUT_ENABLED: "true",
      }),
    /checkout to remain disabled/,
  );
});

test("requires matching non-main branch and exact commit evidence", () => {
  assert.throws(
    () =>
      resolveVercelPreviewOidcRequest({
        ...validEnvironment,
        GITHUB_REF_NAME: "main",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    /branch evidence is invalid/,
  );
  assert.throws(
    () =>
      resolveVercelPreviewOidcRequest({
        ...validEnvironment,
        GITHUB_SHA: "b".repeat(40),
      }),
    /commit evidence is invalid/,
  );
});

test("rejects malformed credentials without exposing provider response data", async () => {
  const secretProviderDetail = "sensitive-provider-detail";

  await assert.rejects(
    fetchVercelPreviewOidcToken(validEnvironment, async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: secretProviderDetail }),
    })),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /status 403/);
      assert.doesNotMatch(error.message, new RegExp(secretProviderDetail));
      assert.equal(
        classifyVercelPreviewOidcFailure(error),
        "REQUEST_REJECTED_403",
      );
      return true;
    },
  );

  await assert.rejects(
    fetchVercelPreviewOidcToken(validEnvironment, async () => ({
      ok: true,
      status: 200,
      json: async () => ({ env: { VERCEL_OIDC_TOKEN: "not-a-jwt" } }),
    })),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(
        classifyVercelPreviewOidcFailure(error),
        "OIDC_CREDENTIAL_MISSING_OR_INVALID",
      );
      return true;
    },
  );
});

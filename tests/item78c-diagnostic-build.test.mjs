import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { authorizeDiagnosticBuild, diagnosticBuildEnvironment, runDiagnosticBuild } from "../scripts/item78c-diagnostic-build.mjs";

const now = Date.parse("2026-09-25T12:00:00Z");
const env = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "accept/item-78c-byron-repaired-20260919",
  VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
  ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: "ep-synthetic-byron,ep-synthetic-kempsey",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-synthetic-byron.ap-southeast-2.aws.neon.tech/synthetic",
};
test("each council branch only permits its own confirmed endpoint and pooled form", () => {
  for (const [branch, endpoint] of [
    ["accept/item-78c-byron-repaired-20260919", "ep-synthetic-byron"],
    ["accept/item-78c-byron-kempsey-20260914", "ep-synthetic-kempsey"],
  ]) {
    for (const suffix of ["", "-pooler"]) {
      assert.equal(authorizeDiagnosticBuild({ ...env, VERCEL_GIT_COMMIT_REF: branch,
        DATABASE_URL: env.DATABASE_URL.replace("ep-synthetic-byron", endpoint + suffix) }, now), true);
    }
  }
});
test("cross-council target mismatches never invoke the build", () => {
  for (const [branch, endpoint] of [
    ["accept/item-78c-byron-repaired-20260919", "ep-synthetic-kempsey"],
    ["accept/item-78c-byron-kempsey-20260914", "ep-synthetic-byron"],
  ]) {
    let calls = 0;
    const result = runDiagnosticBuild({ ...env, VERCEL_GIT_COMMIT_REF: branch,
      DATABASE_URL: env.DATABASE_URL.replace("ep-synthetic-byron", endpoint) },
      () => { calls += 1; }, now);
    assert.equal(calls, 0);
    assert.deepEqual(result, { status: 1, decision: "TARGET_REFUSED" });
  }
});
test("invalid scope is rejected before database configuration is accessed", () => {
  for (const changes of [
    { VERCEL_ENV: "production" }, { VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_GIT_COMMIT_REF: undefined },
    { VERCEL_GIT_COMMIT_REF: env.VERCEL_GIT_COMMIT_REF + "-other" },
  ]) {
    const configuration = { ...env, ...changes };
    Object.defineProperty(configuration, "DATABASE_URL", { get() { throw new Error("MUST NOT READ"); } });
    assert.deepEqual(runDiagnosticBuild(configuration, () => { throw new Error("MUST NOT RUN"); }, now),
      { status: 1, decision: "TARGET_REFUSED" });
  }
});
for (const changes of [
  { VERCEL_ENV: "production" }, { VERCEL_ENV: undefined },
  { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_REF: env.VERCEL_GIT_COMMIT_REF + "-copy" },
  { VERCEL_GIT_COMMIT_SHA: undefined }, { VERCEL_GIT_COMMIT_SHA: "$(bad)" },
  { ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE: "true" },
  { ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: undefined },
  { ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: "ep-synthetic-byron,ep-synthetic-byron" },
  { ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: "ep-synthetic-byron" },
  { ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: "ep-synthetic-byron,ep-synthetic-kempsey,ep-third" },
  { ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: "ep-synthetic-byron, ep-synthetic-kempsey" },
  { ITEM78C_DIAGNOSTIC_DATABASE_TARGETS: "ep-synthetic-byron-pooler,ep-synthetic-kempsey" },
  { DATABASE_URL: undefined }, { DATABASE_URL: "bad" },
  { DATABASE_URL: env.DATABASE_URL.replace("ep-synthetic-byron", "ep-unapproved-production") },
  { DATABASE_URL: env.DATABASE_URL.replace(".neon.tech", ".neon.tech.attacker.invalid") },
  { DATABASE_URL: env.DATABASE_URL.replace("postgresql:", "https:") },
  { DATABASE_URL: env.DATABASE_URL + "#fragment" },
]) {
  test("invalid configuration never starts the build: " + Object.keys(changes)[0], () => {
    let called = false;
    const result = runDiagnosticBuild({ ...env, ...changes }, () => { called = true; }, now);
    assert.equal(called, false);
    assert.deepEqual(result, { status: 1, decision: "TARGET_REFUSED" });
  });
}
test("expiry refuses execution", () => {
  for (const at of [NaN, Infinity, Date.parse("2026-09-24T00:00:00Z"), Date.parse("2026-09-28T00:00:00Z")]) {
    assert.equal(authorizeDiagnosticBuild(env, at), false);
  }
});
test("remaining build gates run unchanged with a restricted environment", () => {
  const input = { ...env, STRIPE_SECRET_KEY: "synthetic-hidden", VERCEL_TOKEN: "synthetic-hidden",
    POSTGRES_URL: "synthetic-other", NODE_OPTIONS: "--require malicious", PATH: "/synthetic" };
  const result = runDiagnosticBuild(input, (command, args, options) => {
    assert.equal(command, "npm");
    assert.deepEqual(args, ["run", "vercel-build"]);
    assert.equal(options.shell, false);
    assert.equal(options.env.DATABASE_URL, env.DATABASE_URL);
    for (const key of ["STRIPE_SECRET_KEY", "VERCEL_TOKEN", "POSTGRES_URL", "NODE_OPTIONS"]) {
      assert.equal(options.env[key], undefined);
    }
    assert.deepEqual(options.stdio, ["ignore", "pipe", "pipe"]);
    return { status: 0, stdout: "synthetic-private-output", stderr: "synthetic-private-error" };
  }, now);
  assert.deepEqual(result, { status: 0, decision: "BUILD_PASSED" });
  assert.equal(JSON.stringify(result).includes("synthetic-private"), false);
});
test("failures preserve failure without exposing child diagnostics", () => {
  for (const result of [{ status: 1, stderr: "synthetic-private" }, { status: null, error: new Error("synthetic-private") }]) {
    assert.deepEqual(runDiagnosticBuild(env, () => result, now), { status: 1, decision: "BUILD_FAILED" });
  }
  assert.deepEqual(runDiagnosticBuild(env, () => { throw new Error("synthetic-private"); }, now),
    { status: 1, decision: "BUILD_FAILED" });
});
test("deployment wiring disables install scripts, retains existing build gates and automatic-deployment suppression", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.installCommand, "npm ci --ignore-scripts");
  assert.equal(config.buildCommand, "node ./scripts/item78c-diagnostic-build.mjs");
  for (const branch of ["accept/item-78c-byron-repaired-20260919", "accept/item-78c-byron-kempsey-20260914"]) {
    assert.equal(config.git.deploymentEnabled[branch], false);
  }
  assert.equal(config.git.deploymentEnabled["fix/item78c-database-target-20260925"], false);
  assert.equal(diagnosticBuildEnvironment(env).DATABASE_URL, env.DATABASE_URL);
});

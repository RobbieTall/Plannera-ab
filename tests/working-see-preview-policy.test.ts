import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { canGenerateUncitedWorkingSee, workingSeeRequestRejection } from "../src/lib/working-see-preview-policy";
import { createWorkingSeeGenerationHandler } from "../src/lib/see-document-generation";

const eligible = {
  deploymentEnvironment: "preview",
  generationEnabled: "1",
  commercialReady: false,
  unresolvedTopics: ["Setbacks", "Parking and access"],
};

test("an explicitly enabled Preview can retain an uncited working evidence-gap memo", () => {
  assert.equal(canGenerateUncitedWorkingSee(eligible), true);
});

for (const [name, changes] of [
  ["Production", { deploymentEnvironment: "production" }],
  ["local environment", { deploymentEnvironment: "development" }],
  ["unknown environment", { deploymentEnvironment: undefined }],
  ["disabled flag", { generationEnabled: "0" }],
  ["absent flag", { generationEnabled: undefined }],
  ["truthy but incorrect flag", { generationEnabled: "true" }],
  ["commercially ready claim", { commercialReady: true }],
  ["unknown readiness", { commercialReady: undefined }],
  ["missing evidence gaps", { unresolvedTopics: [] }],
  ["malformed evidence gaps", { unresolvedTopics: "Setbacks" }],
  ["blank evidence gap", { unresolvedTopics: [" "] }],
  ["non-text evidence gap", { unresolvedTopics: [null] }],
] as const) {
  test(`uncited exception fails closed for ${name}`, () => {
    assert.equal(canGenerateUncitedWorkingSee({ ...eligible, ...changes }), false);
  });
}

function request(headers: Record<string, string> = {}, method = "POST") {
  return new Request("https://preview.example/api/projects/project-test/working-see/generate", {
    method,
    headers: { origin: "https://preview.example", "content-type": "application/json", ...headers },
    ...(method === "POST" ? { body: JSON.stringify({
      acknowledgeWorkingDocument: true,
      sourceDetailedPlanningPackArtefactId: "pack-test",
      sourceMemoArtefactId: "memo-test",
    }) } : {}),
  });
}

test("same-origin JSON request retains the existing allowed behaviour", () => {
  assert.equal(workingSeeRequestRejection(request(), "project-test"), null);
  assert.equal(workingSeeRequestRejection(request({ "content-type": "application/json; charset=utf-8" }), "project-test"), null);
});

for (const [name, build, projectId, reason] of [
  ["method", () => request({}, "GET"), "project-test", "method"],
  ["project identifier", () => request(), "../other", "project_identifier"],
  ["foreign origin", () => request({ origin: "https://foreign.example" }), "project-test", "origin"],
  ["null origin", () => request({ origin: "null" }), "project-test", "origin"],
  ["wrong content type", () => request({ "content-type": "text/plain" }), "project-test", "content_type"],
  ["untrusted proxy headers", () => request({ origin: "https://foreign.example", "x-forwarded-host": "foreign.example", "x-forwarded-proto": "https" }), "project-test", "origin"],
] as const) {
  test(`request diagnostic identifies ${name} before authentication or persistence`, async () => {
    let calls = 0;
    const handler = createWorkingSeeGenerationHandler({
      deploymentEnvironment: "preview",
      enabled: true,
      getActorId: async () => { calls++; return null; },
      prepare: async () => { calls++; throw new Error("must not prepare"); },
      save: async () => { calls++; throw new Error("must not save"); },
    });
    const response = await handler(build(), projectId);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_generation_request", reason });
    assert.equal(calls, 0);
  });
}

test("diagnostic does not expose authentication cookies or request values", async () => {
  const handler = createWorkingSeeGenerationHandler({
    deploymentEnvironment: "preview", enabled: true,
    getActorId: async () => { throw new Error("must not authenticate"); },
    prepare: async () => { throw new Error("must not prepare"); },
    save: async () => { throw new Error("must not save"); },
  });
  const response = await handler(request({ origin: "https://foreign.example", cookie: "synthetic=never-return-this" }), "project-test");
  assert.deepEqual(await response.json(), { error: "invalid_generation_request", reason: "origin" });
});

const trustedPreview = {
  deploymentEnvironment: "preview", vercel: "1",
  deploymentUrl: "plannera-synthetic-deployment.vercel.app",
  branchUrl: "plannera-git-synthetic-preview.vercel.app",
};
function proxyRequest(origin: string, fetchSite: string | null = "same-origin", headers: Record<string, string> = {}) {
  return new Request("http://internal.invalid/api/projects/project-test/working-see/generate", {
    method: "POST",
    headers: { origin, "content-type": "application/json",
      ...(fetchSite === null ? {} : { "sec-fetch-site": fetchSite }), ...headers },
    body: JSON.stringify({ acknowledgeWorkingDocument: true,
      sourceDetailedPlanningPackArtefactId: "pack-test", sourceMemoArtefactId: "memo-test" }),
  });
}

for (const host of [trustedPreview.deploymentUrl, trustedPreview.branchUrl]) {
  test(`exact platform Preview origin survives internal Request.url: ${host}`, () => {
    assert.equal(workingSeeRequestRejection(proxyRequest(`https://${host}`), "project-test", trustedPreview), null);
  });
}
for (const origin of [
  "https://other-preview.vercel.app", "https://plannera-ab.vercel.app",
  "https://plannera-git-synthetic-preview.vercel.app.attacker.example",
  "https://attacker-plannera-git-synthetic-preview.vercel.app",
  "http://plannera-git-synthetic-preview.vercel.app",
  "https://plannera-git-synthetic-preview.vercel.app:444",
  "https://plannera-git-synthetic-preview.vercel.app/",
  "https://user@plannera-git-synthetic-preview.vercel.app",
  "https://plannera-git-synthetic-preview.vercel.app, https://attacker.example", "null",
]) {
  test(`proxy origin fails closed: ${origin}`, () => {
    assert.equal(workingSeeRequestRejection(proxyRequest(origin), "project-test", trustedPreview), "origin");
  });
}
for (const fetchSite of [null, "same-site", "cross-site", "none", "Same-Origin"]) {
  test(`proxy origin requires browser same-origin metadata: ${fetchSite}`, () => {
    assert.equal(workingSeeRequestRejection(proxyRequest(`https://${trustedPreview.branchUrl}`, fetchSite),
      "project-test", trustedPreview), "origin");
  });
}
for (const change of [
  { deploymentEnvironment: "production" }, { deploymentEnvironment: "development" },
  { deploymentEnvironment: undefined }, { vercel: undefined }, { vercel: "0" },
  { branchUrl: undefined, deploymentUrl: undefined },
]) {
  test(`proxy trust requires enabled platform Preview configuration: ${JSON.stringify(change)}`, () => {
    assert.equal(workingSeeRequestRejection(proxyRequest(`https://${trustedPreview.branchUrl}`),
      "project-test", { ...trustedPreview, ...change }), "origin");
  });
}
for (const host of ["*.vercel.app", "attacker.example", "https://safe.vercel.app", "safe.vercel.app/path",
  "safe.vercel.app:443", "user@safe.vercel.app", "safe.vercel.app.attacker.example", "safe.vercel.app "]) {
  test(`malformed or non-platform server host is not trusted: ${host}`, () => {
    assert.equal(workingSeeRequestRejection(proxyRequest(`https://${host}`), "project-test",
      { ...trustedPreview, deploymentUrl: host, branchUrl: undefined }), "origin");
  });
}
test("forwarded host and origin-looking client headers cannot establish trust", () => {
  assert.equal(workingSeeRequestRejection(proxyRequest("https://attacker.example", "same-origin", {
    host: "attacker.example", forwarded: "host=attacker.example;proto=https",
    "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https",
    "x-vercel-deployment-url": "attacker.example",
  }), "project-test", trustedPreview), "origin");
});
test("missing Origin and contradictory cross-site metadata remain rejected", () => {
  const missing = proxyRequest(`https://${trustedPreview.branchUrl}`);
  missing.headers.delete("origin");
  assert.equal(workingSeeRequestRejection(missing, "project-test", trustedPreview), "origin");
  assert.equal(workingSeeRequestRejection(request({ "sec-fetch-site": "cross-site" }), "project-test", trustedPreview), "origin");
});
test("platform-origin acceptance still requires authentication and does not reach storage", async () => {
  let authentication = 0; let prepare = 0; let save = 0;
  const handler = createWorkingSeeGenerationHandler({
    deploymentEnvironment: "preview", enabled: true, previewOrigin: trustedPreview,
    getActorId: async () => { authentication++; return null; },
    prepare: async () => { prepare++; throw new Error("must not prepare"); },
    save: async () => { save++; throw new Error("must not save"); },
  });
  const response = await handler(proxyRequest(`https://${trustedPreview.branchUrl}`), "project-test");
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "sign_in_required" });
  assert.deepEqual([authentication, prepare, save], [1, 0, 0]);
});
test("foreign origin fails before authentication even with platform metadata configured", async () => {
  let calls = 0;
  const handler = createWorkingSeeGenerationHandler({
    deploymentEnvironment: "preview", enabled: true, previewOrigin: trustedPreview,
    getActorId: async () => { calls++; return "actor-test"; },
    prepare: async () => { calls++; throw new Error("must not prepare"); },
    save: async () => { calls++; throw new Error("must not save"); },
  });
  const response = await handler(proxyRequest("https://other-preview.vercel.app"), "project-test");
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_generation_request", reason: "origin" });
  assert.equal(calls, 0);
});
test("Preview origin configuration cannot enable the Production generation route", async () => {
  const handler = createWorkingSeeGenerationHandler({
    deploymentEnvironment: "production", enabled: true, previewOrigin: trustedPreview,
    getActorId: async () => { throw new Error("must not authenticate"); },
    prepare: async () => { throw new Error("must not prepare"); },
    save: async () => { throw new Error("must not save"); },
  });
  const response = await handler(proxyRequest(`https://${trustedPreview.branchUrl}`), "project-test");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "generation_disabled" });
});
test("the route wires only server-side Vercel deployment metadata", () => {
  const route = readFileSync(new URL("../src/app/api/projects/[projectId]/working-see/generate/route.ts", import.meta.url), "utf8");
  assert.match(route, /vercel: process\.env\.VERCEL\b/);
  assert.match(route, /deploymentUrl: process\.env\.VERCEL_URL\b/);
  assert.match(route, /branchUrl: process\.env\.VERCEL_BRANCH_URL\b/);
  assert.doesNotMatch(route, /x-forwarded-host|VERCEL_PROJECT_PRODUCTION_URL|NEXTAUTH_URL/);
});

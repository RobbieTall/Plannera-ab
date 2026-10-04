import assert from "node:assert/strict";
import test from "node:test";
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

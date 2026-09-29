import assert from "node:assert/strict";
import test from "node:test";
import {
  lookupWorkingSeeCouncilIdentity, readWorkingSeeCouncilIdentity, resolveWorkingSeeCouncilForCandidate,
  WORKING_SEE_COUNCIL_LAYER, WORKING_SEE_COUNCIL_MAX_AGE_MS,
} from "../src/lib/see-document-council-identity";

// In-memory responses only; these are not authentic council evidence.
const point = { lat: -30, lng: 153 };
const clock = new Date("2026-09-29T02:00:00Z");
function payload(council = "Byron") {
  return { features: [{ attributes: {
    rid: 1, lganame: council, councilname: council + " Shire Council",
    abscode: 99999, enddate: null,
  } }] };
}
function response(value: unknown, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": contentType } });
}
function fetcher(value: unknown): typeof fetch {
  return async () => response(value);
}
async function saved(council = "Byron") {
  const result = await lookupWorkingSeeCouncilIdentity(point, { fetcher: fetcher(payload(council)), now: () => clock });
  assert.ok(result);
  return result;
}
for (const council of ["Byron", "Kempsey"]) {
  test(council + " uses official point-query metadata and retains the original response", async () => {
    const proof = await saved(council);
    assert.equal(proof.council, council.toUpperCase());
    assert.equal(proof.sourceUrl, WORKING_SEE_COUNCIL_LAYER);
    assert.equal(proof.featureIdentifier, "rid:1");
    assert.deepEqual(readWorkingSeeCouncilIdentity(proof, point, clock), proof);
    assert.equal(proof.responseText, JSON.stringify(payload(council)));
  });
}
test("query has a fixed official endpoint, explicit CRS, bounded matches and no credentials", async () => {
  let calls = 0;
  const f: typeof fetch = async (input, options) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin + url.pathname, WORKING_SEE_COUNCIL_LAYER + "/query");
    assert.equal(url.searchParams.get("geometry"), "153,-30");
    assert.equal(url.searchParams.get("inSR"), "4326");
    assert.equal(url.searchParams.get("resultRecordCount"), "2");
    assert.equal(url.searchParams.get("returnGeometry"), "false");
    assert.equal(url.searchParams.has("token"), false);
    assert.equal(options?.redirect, "error");
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return response(payload());
  };
  assert.ok(await lookupWorkingSeeCouncilIdentity(point, { fetcher: f, now: () => clock }));
  assert.equal(calls, 1);
});
test("invalid or extra coordinate fields do not initiate a request", async () => {
  let calls = 0;
  const never: typeof fetch = async () => { calls++; throw new Error("must not fetch"); };
  for (const input of [{ lat: NaN, lng: 153 }, { lat: -91, lng: 153 },
    { lat: -30, lng: 181 }, { ...point, token: "not-a-credential" }]) {
    assert.equal(await lookupWorkingSeeCouncilIdentity(input, { fetcher: never }), null);
  }
  assert.equal(calls, 0);
});
test("missing, duplicate and truncated matches are not resolved by picking the first row", async () => {
  for (const value of [
    { features: [] }, { features: [...payload().features, ...payload("Kempsey").features] },
    { ...payload(), exceededTransferLimit: true }, { ...payload(), error: { message: "unavailable" } },
  ]) assert.equal(await lookupWorkingSeeCouncilIdentity(point, { fetcher: fetcher(value) }), null);
});
test("unknown council and retired or malformed feature metadata remain unresolved", async () => {
  for (const value of [
    payload("Ballina"),
    { features: [{ attributes: { ...payload().features[0].attributes, enddate: 1 } }] },
    { features: [{ attributes: { ...payload().features[0].attributes, rid: -1 } }] },
    { features: [{ attributes: { ...payload().features[0].attributes, abscode: null } }] },
    { features: [{ attributes: { ...payload().features[0].attributes, councilname: "" } }] },
  ]) assert.equal(await lookupWorkingSeeCouncilIdentity(point, { fetcher: fetcher(value) }), null);
});
test("network failure, HTTP errors, invalid JSON and non-JSON content fail closed", async () => {
  const cases: Array<typeof fetch> = [
    async () => { throw new Error("provider error must not escape"); },
    async () => response(payload(), 503),
    async () => new Response("not json", { headers: { "content-type": "application/json" } }),
    async () => response(payload(), 200, "text/html"),
  ];
  for (const f of cases) assert.equal(await lookupWorkingSeeCouncilIdentity(point, { fetcher: f }), null);
});
test("oversized response streams are rejected", async () => {
  assert.equal(await lookupWorkingSeeCouncilIdentity(point, {
    fetcher: fetcher({ ...payload(), padding: "x".repeat(20 * 1024) }),
  }), null);
});
test("stored council, point, authority, URL, response and fingerprint cannot be substituted", async () => {
  const proof = await saved();
  for (const patch of [
    { council: "KEMPSEY" }, { sourceUrl: "https://example.com/query" },
    { authority: "User supplied" }, { coordinates: { lat: -31, lng: 153 } },
    { featureIdentifier: "rid:2" }, { responseSha256: "0".repeat(64) },
    { responseText: JSON.stringify(payload("Kempsey")) },
    { providerCode: 12345 }, { synthetic: true },
  ]) assert.equal(readWorkingSeeCouncilIdentity({ ...proof, ...patch }, point, clock), null);
  assert.equal(readWorkingSeeCouncilIdentity(proof, { lat: -31, lng: 153 }, clock), null);
});
test("expired, future and invalid times never get refreshed on read", async () => {
  const proof = await saved();
  assert.equal(readWorkingSeeCouncilIdentity(proof, point, new Date(clock.getTime() - 1)), null);
  assert.equal(readWorkingSeeCouncilIdentity(proof, point, new Date(clock.getTime() + WORKING_SEE_COUNCIL_MAX_AGE_MS)), null);
  assert.equal(readWorkingSeeCouncilIdentity(proof, point, new Date(NaN)), null);
  assert.equal(proof.retrievedAt, clock.toISOString());
});

test("Production, disabled and unknown environments never start the council request", async () => {
  let calls = 0;
  const f: typeof fetch = async () => { calls++; return response(payload()); };
  for (const [deploymentEnvironment, enabled] of [
    ["production", true], ["development", true], [undefined, true], ["preview", false],
  ] as const) {
    assert.equal(await resolveWorkingSeeCouncilForCandidate({
      candidate: { latitude: point.lat, longitude: point.lng, lgaName: null },
      deploymentEnvironment, enabled,
    }, { fetcher: f, now: () => clock }), null);
  }
  assert.equal(calls, 0);
});
test("Preview saves canonical identity from the response, not candidate labels", async () => {
  for (const labels of [{}, { lgaName: "Byron Shire Council", lgaCode: "BYRON" },
    { lgaName: "Byron", lgaCode: "99999" }]) {
    const candidate = { latitude: point.lat, longitude: point.lng, lgaName: null, ...labels };
    const original = structuredClone(candidate);
    const proof = await resolveWorkingSeeCouncilForCandidate({
      candidate, deploymentEnvironment: "preview", enabled: true,
    }, { fetcher: fetcher(payload()), now: () => clock });
    assert.equal(proof?.council, "BYRON");
    assert.deepEqual(candidate, original);
  }
});
test("conflicting candidate names or codes cannot be silently overridden", async () => {
  for (const labels of [{ lgaName: "Kempsey" }, { lgaCode: "KEMPSEY" },
    { lgaCode: "12345" }, { lgaName: "Unknown" }]) {
    assert.equal(await resolveWorkingSeeCouncilForCandidate({
      candidate: { latitude: point.lat, longitude: point.lng, lgaName: null, ...labels },
      deploymentEnvironment: "preview", enabled: true,
    }, { fetcher: fetcher(payload()), now: () => clock }), null);
  }
});
test("candidate labels without coordinates or a provider match are not evidence", async () => {
  let calls = 0;
  const f: typeof fetch = async () => { calls++; return response({ features: [] }); };
  assert.equal(await resolveWorkingSeeCouncilForCandidate({
    candidate: { lgaName: "Byron", lgaCode: "BYRON" }, deploymentEnvironment: "preview", enabled: true,
  }, { fetcher: f }), null);
  assert.equal(calls, 0);
  assert.equal(await resolveWorkingSeeCouncilForCandidate({
    candidate: { latitude: point.lat, longitude: point.lng, lgaName: null, lgaCode: "BYRON" },
    deploymentEnvironment: "preview", enabled: true,
  }, { fetcher: f }), null);
  assert.equal(calls, 1);
});

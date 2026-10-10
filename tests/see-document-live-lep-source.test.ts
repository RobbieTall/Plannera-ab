import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";
import { fetchLivePreviewLepSource, LIVE_LEP_MAX_BYTES, LivePreviewLepSourceError } from "../src/lib/legislation/live-preview-lep-source";

const originalEnv = process.env.VERCEL_ENV;
const originalFetch = globalThis.fetch;
before(() => {
  process.env.VERCEL_ENV = "preview";
  globalThis.fetch = async () => { throw new Error("Unexpected real network access"); };
});
after(() => {
  if (originalEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalEnv;
  globalThis.fetch = originalFetch;
});
const url = "https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2014-0297";
const body = "<legislation><title>Synthetic fixture, not planning evidence</title></legislation>";
function response(text: string | Uint8Array = body, overrides: { url?: string; type?: string; status?: number; length?: string; redirected?: boolean } = {}) {
  const headers = new Headers({ "content-type": overrides.type ?? "application/xml" });
  if (overrides.length !== undefined) headers.set("content-length", overrides.length);
  const payload = typeof text === "string" ? text : new Uint8Array(text).buffer;
  const result = new Response(payload, { status: overrides.status ?? 200, headers });
  Object.defineProperty(result, "url", { value: overrides.url ?? url });
  Object.defineProperty(result, "redirected", { value: overrides.redirected ?? false });
  return result;
}
const mockFetch = (result: Response): typeof fetch => async () => result;
async function rejects(code: string, result: Response) {
  await assert.rejects(fetchLivePreviewLepSource("BYRON", { fetch: mockFetch(result) }),
    (error: unknown) => error instanceof LivePreviewLepSourceError && error.code === code);
}

test("refuses Production before any fetch", async () => {
  process.env.VERCEL_ENV = "production";
  let calls = 0;
  try {
    await assert.rejects(fetchLivePreviewLepSource("BYRON", { fetch: async () => { calls++; return response(); } }), /preview_required/);
    assert.equal(calls, 0);
  } finally { process.env.VERCEL_ENV = "preview"; }
});
test("refuses unknown council before fetch", async () => {
  await assert.rejects(fetchLivePreviewLepSource("SYDNEY"), /unsupported_council/);
});
test("retains original bytes, digest, source and retrieval time for Byron", async () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  const result = await fetchLivePreviewLepSource("BYRON", { fetch: mockFetch(response()), now: () => now });
  assert.equal(result.document, body);
  assert.equal(result.receipt.documentSha256, createHash("sha256").update(body).digest("hex"));
  assert.equal(result.receipt.byteLength, Buffer.byteLength(body));
  assert.equal(result.receipt.retrievedAt, now.toISOString());
  assert.equal(result.receipt.usedFixture, false);
  assert.equal(result.receipt.retrievalUrl, url);
  assert.equal(result.receipt.sourceUrl, "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297");
});
test("uses a distinct fixed official Kempsey source", async () => {
  const result = await fetchLivePreviewLepSource("KEMPSEY", { fetch: async (input, init) => {
    assert.equal(input, "https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2013-0712");
    assert.equal(init?.redirect, "error"); assert.equal(init?.credentials, "omit");
    assert.equal(init?.cache, "no-store"); assert.equal(init?.referrerPolicy, "no-referrer");
    assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).has("authorization"), false);
    return response(body, { url: String(input) });
  } });
  assert.equal(result.receipt.council, "KEMPSEY");
  assert.equal(result.receipt.sourceUrl, "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2013-0712");
});
test("fixture flags cannot replace the live request", async () => {
  const old = process.env.LEGISLATION_USE_FIXTURES;
  process.env.LEGISLATION_USE_FIXTURES = "true";
  let calls = 0;
  try {
    await fetchLivePreviewLepSource("BYRON", { fetch: async () => { calls++; return response(); } });
    assert.equal(calls, 1);
  } finally {
    if (old === undefined) delete process.env.LEGISLATION_USE_FIXTURES; else process.env.LEGISLATION_USE_FIXTURES = old;
  }
});
test("refuses redirects", () => rejects("source_mismatch", response(body, { redirected: true })));
test("refuses another council or unknown final URL", () => rejects("source_mismatch", response(body, { url: url.replace("2014-0297", "2013-0712") })));
test("refuses missing final URL", () => rejects("source_mismatch", response(body, { url: "" })));
test("refuses non-success HTTP status", () => rejects("http_failed", response(body, { status: 503 })));
test("refuses HTML challenge pages", () => rejects("unexpected_content_type", response("<html>Challenge</html>", { type: "text/html" })));
test("refuses empty source bytes", () => rejects("empty_source", response("")));
test("refuses whitespace-only source", () => rejects("empty_source", response("  ")));
test("refuses invalid UTF-8", () => rejects("invalid_utf8", response(new Uint8Array([0xff]))));
test("refuses declared oversize", () => rejects("source_too_large", response(body, { length: String(LIVE_LEP_MAX_BYTES + 1) })));
test("bounds actual streamed size independently of Content-Length", () => rejects("source_too_large", response(new Uint8Array(LIVE_LEP_MAX_BYTES + 1), { length: "1" })));
test("refuses malformed length metadata", () => rejects("invalid_length", response(body, { length: "-1" })));
test("redacts network failures and never falls back", async () => {
  await assert.rejects(fetchLivePreviewLepSource("BYRON", { fetch: async () => { throw new Error("sensitive-provider-diagnostic"); } }),
    (error: unknown) => error instanceof LivePreviewLepSourceError && error.message === "retrieval_failed");
});
test("redacts streaming failures", async () => {
  const broken = new Response(new ReadableStream({ start(controller) { controller.error(new Error("private diagnostic")); } }),
    { headers: { "content-type": "text/xml; charset=utf-8" } });
  Object.defineProperty(broken, "url", { value: url });
  await rejects("retrieval_failed", broken);
});

test("rejects the superseded incorrect Byron identifier", () =>
  rejects("source_mismatch", response(body, { url: "https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2014-355" })));
test("rejects the superseded incorrect Kempsey identifier", async () => {
  await assert.rejects(fetchLivePreviewLepSource("KEMPSEY", { fetch: mockFetch(response(body, {
    url: "https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2013-437",
  })) }), (error: unknown) => error instanceof LivePreviewLepSourceError && error.code === "source_mismatch");
});

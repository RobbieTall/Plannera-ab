import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { decideSiteFromCandidates, resolveSiteFromText } from "../src/lib/site-resolver";

const originalEnv = {
  url: process.env.NSW_PROPERTY_API_URL,
  key: process.env.NSW_PROPERTY_API_KEY,
};
const originalFetch = global.fetch;

describe("site-resolver", () => {
  beforeEach(() => {
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "example-key";
  });

  afterEach(() => {
    process.env.NSW_PROPERTY_API_URL = originalEnv.url;
    process.env.NSW_PROPERTY_API_KEY = originalEnv.key;
    global.fetch = originalFetch;
  });

  it("returns ranked NSW candidates and an automatic decision", async () => {
    let receivedUrl = "";
    global.fetch = (async (input: RequestInfo | URL) => {
      receivedUrl = input.toString();
      return new Response(
        JSON.stringify({
          results: [
            { id: "1", formattedAddress: "6 Myola Road, Newport NSW 2106", lgaName: "Northern Beaches" },
            { id: "2", formattedAddress: "1 Example Street, Sydney NSW 2000", lgaName: "Sydney" },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await resolveSiteFromText("6 myola rd newpoet", { source: "site-search" });

    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.ok(result.candidates[0]?.formattedAddress.includes("Myola"));
      assert.equal(result.decision, "auto");
    }
    assert.ok(receivedUrl.includes("NSW"));
  });

  it("gracefully reports missing NSW configuration", async () => {
    delete process.env.NSW_PROPERTY_API_URL;
    delete process.env.NSW_PROPERTY_API_KEY;

    const result = await resolveSiteFromText("10 Test Street", { source: "chat" });
    assert.equal(result.status, "property_search_not_configured");
  });

  it("returns a failed status when the property API errors", async () => {
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "key";
    global.fetch = (async () => new Response("Server error", { status: 500 })) as typeof fetch;

    const result = await resolveSiteFromText("1 Broken Road", { source: "site-search" });
    assert.equal(result.status, "property_search_failed");
  });

  it("flags ambiguous candidates when scores are close", () => {
    const decision = decideSiteFromCandidates([
      { id: "a", formattedAddress: "10 Alpha Street NSW", lgaName: "Test", confidence: 0.7 },
      { id: "b", formattedAddress: "12 Alpha Street NSW", lgaName: "Test", confidence: 0.65 },
    ]);
    assert.equal(decision, "ambiguous");
  });
});

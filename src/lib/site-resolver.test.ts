import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideSiteFromCandidates, resolveSiteFromText } from "./site-resolver";

const originalEnv = {
  url: process.env.NSW_PROPERTY_API_URL,
  key: process.env.NSW_PROPERTY_API_KEY,
  google: process.env.GOOGLE_MAPS_API_KEY,
};

const originalFetch = global.fetch;

describe("site-resolver (nsw property fallback)", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "example-key";
  });

  afterEach(() => {
    process.env.NSW_PROPERTY_API_URL = originalEnv.url;
    process.env.NSW_PROPERTY_API_KEY = originalEnv.key;
    process.env.GOOGLE_MAPS_API_KEY = originalEnv.google;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
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

    expect(result.status).toEqual("ok");
    if (result.status === "ok") {
      expect(result.candidates[0]?.formattedAddress).toContain("Myola");
      expect(result.decision).toEqual("auto");
    }
    expect(receivedUrl).toContain("NSW");
  });

  it("gracefully reports missing NSW configuration when Google is unavailable", async () => {
    delete process.env.NSW_PROPERTY_API_URL;
    delete process.env.NSW_PROPERTY_API_KEY;

    const result = await resolveSiteFromText("10 Test Street", { source: "chat" });
    expect(result.status).toEqual("property_search_not_configured");
  });

  it("returns a failed status when the property API errors", async () => {
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "key";
    global.fetch = (async () => new Response("Server error", { status: 500 })) as typeof fetch;

    const result = await resolveSiteFromText("1 Broken Road", { source: "site-search" });
    expect(result.status).toEqual("property_search_failed");
  });

  it("flags ambiguous candidates when scores are close", () => {
    const decision = decideSiteFromCandidates([
      { id: "a", formattedAddress: "10 Alpha Street NSW", lgaName: "Test", confidence: 0.7 },
      { id: "b", formattedAddress: "12 Alpha Street NSW", lgaName: "Test", confidence: 0.65 },
    ]);
    expect(decision).toEqual("ambiguous");
  });
});

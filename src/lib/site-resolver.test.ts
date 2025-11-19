import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveSiteFromText } from "./site-resolver";

const canonicalRecord = {
  id: "nb-6-myola",
  formattedAddress: "6 Myola Road, Newport NSW 2106",
  lgaName: "Northern Beaches",
  lgaCode: "NB123",
  latitude: -33.6501,
  longitude: 151.3189,
};

const buildResponse = (records: unknown[]) =>
  new Response(JSON.stringify(records), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("resolveSiteFromText", () => {
  beforeEach(() => {
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a high-confidence candidate for a canonical address", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(buildResponse([canonicalRecord])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveSiteFromText("6 Myola Road Newport", { source: "site-search" });

    expect(result.status).toBe("ok");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.lgaName).toBe("Northern Beaches");
    expect(result.candidates[0]?.score).toBeGreaterThan(0.8);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles minor typos by falling back to secondary search", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      const query = url.searchParams.get("address") ?? "";
      if (query.includes("newpoet")) {
        return Promise.resolve(buildResponse([]));
      }
      return Promise.resolve(buildResponse([canonicalRecord]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveSiteFromText("6 myola rd newpoet", { source: "chat" });

    expect(result.status).toBe("ok");
    expect(result.candidates[0]?.formattedAddress).toContain("Myola");
    expect(result.candidates[0]?.score).toBeGreaterThan(0.7);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("returns candidates for partial street input", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(buildResponse([canonicalRecord])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveSiteFromText("6 myola rd", { source: "site-search" });

    expect(result.status).toBe("ok");
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0]?.score).toBeGreaterThan(0.6);
  });

  it("returns an empty candidate list for invalid queries", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(buildResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveSiteFromText("xyz abc 999", { source: "site-search" });

    expect(result.status).toBe("ok");
    expect(result.candidates).toHaveLength(0);
  });
});

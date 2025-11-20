import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveSiteFromText } from "./site-resolver";

const originalEnv = {
  google: process.env.GOOGLE_MAPS_API_KEY,
  url: process.env.NSW_PROPERTY_API_URL,
  key: process.env.NSW_PROPERTY_API_KEY,
};

const originalFetch = global.fetch;

describe("site-resolver (google)", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = "test-google-key";
    delete process.env.NSW_PROPERTY_API_URL;
    delete process.env.NSW_PROPERTY_API_KEY;
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalEnv.google;
    process.env.NSW_PROPERTY_API_URL = originalEnv.url;
    process.env.NSW_PROPERTY_API_KEY = originalEnv.key;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns candidates from Google autocomplete and geocoding", async () => {
    const autocompleteResponse = {
      status: "OK",
      predictions: [
        { description: "6 Myola Road, Newport NSW 2106", place_id: "place-1" },
        { description: "8 Myola Road, Newport NSW 2106", place_id: "place-2" },
      ],
    };
    const geocodeResponse = {
      status: "OK",
      results: [
        {
          formatted_address: "6 Myola Road, Newport NSW 2106",
          geometry: { location: { lat: -33.654, lng: 151.313 } },
          address_components: [
            { long_name: "Northern Beaches", types: ["administrative_area_level_2", "political"] },
          ],
        },
      ],
    };

    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes("autocomplete")) {
        return new Response(JSON.stringify(autocompleteResponse), { status: 200 });
      }
      if (url.includes("geocode")) {
        return new Response(JSON.stringify(geocodeResponse), { status: 200 });
      }
      return new Response("not-found", { status: 404 });
    });

    const result = await resolveSiteFromText("6 myola rd newpoet");

    expect(fetchMock).toHaveBeenCalled();
    const calledUrls = fetchMock.mock.calls.map((call) => call[0]?.toString?.() ?? "");
    expect(calledUrls[0]).toContain("components=country%3Aau");
    expect(calledUrls[0]).toContain("types=geocode");
    expect(calledUrls[0]).not.toContain("dataset");

    expect(result.status).toEqual("ok");
    if (result.status === "ok") {
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
      expect(result.candidates[0]?.formattedAddress).toContain("Myola Road");
      expect(result.candidates[0]?.latitude).toBeCloseTo(-33.654);
      expect(result.candidates[0]?.longitude).toBeCloseTo(151.313);
      expect((result.candidates[0]?.confidence ?? 0) > 0.5).toBe(true);
    }
  });

  it("returns empty candidates when Google autocomplete has no matches", async () => {
    const autocompleteResponse = { status: "ZERO_RESULTS", predictions: [] };
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes("autocomplete")) {
        return new Response(JSON.stringify(autocompleteResponse), { status: 200 });
      }
      return new Response(JSON.stringify({ status: "OK", results: [] }), { status: 200 });
    });

    const result = await resolveSiteFromText("nonsense address 999");

    expect(fetchMock).toHaveBeenCalled();
    expect(result.status).toEqual("ok");
    if (result.status === "ok") {
      expect(result.candidates).toEqual([]);
    }
  });

  it("returns a structured error when Google rejects the request", async () => {
    const autocompleteResponse = {
      status: "REQUEST_DENIED",
      predictions: [],
      error_message: "API key is invalid",
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(autocompleteResponse), { status: 200 }),
    );

    const result = await resolveSiteFromText("1 Main St Sydney");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[site-resolver-google-error]",
      expect.objectContaining({ status: "REQUEST_DENIED", error_message: "API key is invalid" }),
    );
    expect(result.status).toEqual("property_search_failed");
    if (result.status !== "ok") {
      expect(result.details).toMatchObject({ googleStatus: "REQUEST_DENIED", googleErrorMessage: "API key is invalid" });
      expect(result.provider).toEqual("google");
    }
  });
});

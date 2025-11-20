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
      suggestions: [
        { placePrediction: { text: { text: "6 Myola Road, Newport NSW 2106" }, placeId: "place-1" } },
        { placePrediction: { text: { text: "8 Myola Road, Newport NSW 2106" }, placeId: "place-2" } },
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

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.includes("places:autocomplete")) {
          expect(init?.method).toEqual("POST");
          expect(init?.headers).toMatchObject({
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "test-google-key",
          });
          const parsedBody = init?.body ? JSON.parse(init.body as string) : null;
          expect(parsedBody?.includedRegionCodes).toEqual(["AU"]);
          return new Response(JSON.stringify(autocompleteResponse), { status: 200 });
        }
        if (url.includes("geocode")) {
          expect(url).toMatch(/place_id=place-[12]/);
          return new Response(JSON.stringify(geocodeResponse), { status: 200 });
        }
        return new Response("not-found", { status: 404 });
      });

    const result = await resolveSiteFromText("6 myola rd newpoet");

    expect(fetchMock).toHaveBeenCalled();
    const calledUrls = fetchMock.mock.calls.map((call) => call[0]?.toString?.() ?? "");
    expect(calledUrls[0]).toContain("places.googleapis.com/v1/places:autocomplete");

    expect(result.status).toEqual("ok");
    if (result.status === "ok") {
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
      expect(result.candidates[0]?.formattedAddress).toContain("Myola Road");
      expect(result.candidates[0]?.latitude).toBeCloseTo(-33.654);
      expect(result.candidates[0]?.longitude).toBeCloseTo(151.313);
      expect(result.candidates[0]?.provider).toEqual("google");
      expect((result.candidates[0]?.confidence ?? 0) > 0.5).toBe(true);
    }
  });

  it("returns empty candidates when Google autocomplete has no matches", async () => {
    const autocompleteResponse = { suggestions: [] };
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "property-key";
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes("places:autocomplete")) {
          return new Response(JSON.stringify(autocompleteResponse), { status: 200 });
        }
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      });

    const result = await resolveSiteFromText("nonsense address 999");

    expect(fetchMock).toHaveBeenCalled();
    expect(result.status).toEqual("ok");
    if (result.status === "ok") {
      expect(result.candidates).toEqual([]);
    }
  });

  it("returns a structured error when Google rejects the request and no NSW fallback is configured", async () => {
    const autocompleteResponse = {
      error: { status: "PERMISSION_DENIED", message: "API key is invalid" },
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(autocompleteResponse), { status: 403 }),
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

  it("falls back to NSW property search when Google rejects the request", async () => {
    process.env.NSW_PROPERTY_API_URL = "https://example.com/search";
    process.env.NSW_PROPERTY_API_KEY = "property-key";

    const autocompleteResponse = {
      error: { status: "PERMISSION_DENIED", message: "API key is invalid" },
    };

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes("places:autocomplete")) {
          return new Response(JSON.stringify(autocompleteResponse), { status: 403 });
        }
        return new Response(
          JSON.stringify({
            results: [
              { id: "nsw-1", formattedAddress: "6 Myola Road, Newport NSW", lgaName: "Northern Beaches" },
            ],
          }),
          { status: 200 },
        );
      });

    const result = await resolveSiteFromText("6 Myola Road Newport NSW");

    expect(fetchMock).toHaveBeenCalled();
    if (result.status === "ok") {
      expect(result.candidates[0]?.id).toEqual("nsw-1");
    }
  });

  it("keeps Google candidates even if geocoding fails but suggestions exist", async () => {
    const autocompleteResponse = {
      suggestions: [{ placePrediction: { text: { text: "6 Myola Road, Newport NSW" }, placeId: "place-123" } }],
    };

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes("places:autocomplete")) {
          return new Response(JSON.stringify(autocompleteResponse), { status: 200 });
        }
        if (url.includes("geocode")) {
          return new Response("geocode failure", { status: 500 });
        }
        return new Response("not-found", { status: 404 });
      });

    const result = await resolveSiteFromText("6 myola rd newport");

    expect(fetchMock).toHaveBeenCalled();
    expect(result.status).toEqual("ok");
    if (result.status === "ok") {
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0]?.formattedAddress).toContain("Myola Road");
    }
  });
});

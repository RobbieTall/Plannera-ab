import { describe, expect, it } from "vitest";

import { candidateSchema } from "./schema";

describe("site-context api validation", () => {
  it("accepts Google candidates with pending LGA data", () => {
    const parsed = candidateSchema.parse({
      id: "place-123",
      formattedAddress: "22 Campbell Parade, Bondi Beach NSW 2026",
      provider: "google",
      latitude: -33.8915,
      longitude: 151.2767,
      lgaName: null,
    });

    expect(parsed.lgaName).toBeNull();
    expect(parsed.provider).toEqual("google");
  });
});

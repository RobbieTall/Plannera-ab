import { describe, expect, it } from "vitest";

import { buildWorkspaceSeedQuery, launchExampleAddresses } from "@/lib/landing-entry";

describe("landing Quick Site Check entry", () => {
  it("uses only the two launch QA example addresses", () => {
    expect(launchExampleAddresses).toEqual([
      "45 Broken Head Road, Byron Bay NSW 2481",
      "52 Belgrave St, Kempsey NSW 2440",
    ]);
  });

  it("does not build a workspace query for an empty address", () => {
    expect(buildWorkspaceSeedQuery("   ")).toBeNull();
  });

  it("trims and safely encodes both prompt and initialAddress", () => {
    const query = buildWorkspaceSeedQuery("  45 Broken Head Road, Byron Bay NSW 2481  ");
    expect(query).toBe("prompt=45+Broken+Head+Road%2C+Byron+Bay+NSW+2481&initialAddress=45+Broken+Head+Road%2C+Byron+Bay+NSW+2481");
  });
});

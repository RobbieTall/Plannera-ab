import fs from "fs";

import { describe, expect, it } from "vitest";

import { findLocalNswLepsByLga, listLocalNswLepPreparations } from "./nsw-lep-registry";

describe("NSW LEP XML registry", () => {
  it("discovers the bundled NSW LEP XML files", () => {
    const entries = listLocalNswLepPreparations();

    expect(entries.length).toBeGreaterThanOrEqual(50);
  });

  it("points every registry entry at non-empty XML content", () => {
    const entries = listLocalNswLepPreparations();

    for (const entry of entries) {
      expect(entry.config.xmlLocalPath, entry.config.slug).toBeTruthy();
      const xml = fs.readFileSync(entry.config.xmlLocalPath!, "utf-8");
      expect(xml.trim().length, entry.config.slug).toBeGreaterThan(0);
      expect(xml).toMatch(/<\?xml|<Legislation|<instrument/i);
    }
  });

  it("includes Byron under the expected LGA lookup", () => {
    const byronMatches = findLocalNswLepsByLga("BYRON");

    expect(byronMatches.some((entry) => entry.details.lgaCode === "BYRON")).toBe(true);
  });
});

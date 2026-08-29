import { describe, expect, it } from "vitest";

import {
  BYRON_DCP_2014_SOURCES,
  BYRON_DCP_SOURCE_URL,
  parseByronDcpSource,
} from "./byron-ingestion";

describe("Byron DCP official ingestion", () => {
  it("pins the complete current council source set", () => {
    expect(BYRON_DCP_2014_SOURCES).toHaveLength(39);
    expect(new Set(BYRON_DCP_2014_SOURCES.map((source) => source.key)).size).toBe(39);
    expect(new Set(BYRON_DCP_2014_SOURCES.map((source) => source.url)).size).toBe(39);
    expect(
      BYRON_DCP_2014_SOURCES.every(
        (source) =>
          source.url.startsWith("https://www.byron.nsw.gov.au/") &&
          source.url.endsWith(".pdf"),
      ),
    ).toBe(true);
    expect(BYRON_DCP_SOURCE_URL).toBe(
      "https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014",
    );
  });

  it("preserves official chapter provenance and clause references", () => {
    const clauses = parseByronDcpSource({
      key: "Chapter D1",
      title: "Chapter D1 Residential Accommodation",
      url: "https://www.byron.nsw.gov.au/example.pdf",
      byteLength: 1_024,
      text: [
        "Byron Shire Development Control Plan 2014",
        "D1.4 Setbacks",
        "Setbacks protect streetscape character, privacy, solar access and the amenity of neighbouring properties.",
        "D1.4.3 Side setbacks ground floor",
        "A minimum side setback applies to single-storey walls, measured from the legal property boundary.",
      ].join("\n"),
    });

    expect(clauses.map((clause) => clause.ref)).toContain("D1.4");
    expect(clauses.map((clause) => clause.ref)).toContain("D1.4.3");
    expect(clauses.every((clause) => clause.parentRef === "Chapter D1")).toBe(true);
    expect(clauses.every((clause) => clause.sourceUrl.endsWith("/example.pdf"))).toBe(true);
  });

  it("splits long official text without inventing content", () => {
    const officialText = "planning control ".repeat(400).trim();
    const clauses = parseByronDcpSource({
      key: "Chapter B3",
      title: "Chapter B3 Services",
      url: "https://www.byron.nsw.gov.au/services.pdf",
      byteLength: 2_048,
      text: "B3.1 Essential services\n" + officialText,
    });

    expect(clauses.length).toBeGreaterThan(1);
    expect(clauses.map((clause) => clause.bodyText).join(" ")).toBe(officialText);
    expect(clauses[0]?.ref).toBe("B3.1");
    expect(clauses[1]?.ref).toContain("continued");
  });
});

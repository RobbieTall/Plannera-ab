import { describe, expect, it } from "vitest";

import { highlightText } from "./highlight-text";

describe("highlightText", () => {
  it("returns one non-match segment for an empty query", () => {
    expect(highlightText("Hello planning chat", "")).toEqual([
      { text: "Hello planning chat", match: false },
    ]);
  });

  it("returns one non-match segment when the query is not in content", () => {
    expect(highlightText("Hello planning chat", "zoning")).toEqual([
      { text: "Hello planning chat", match: false },
    ]);
  });

  it("splits content around a matching query", () => {
    expect(highlightText("Hello planning chat", "planning")).toEqual([
      { text: "Hello ", match: false },
      { text: "planning", match: true },
      { text: " chat", match: false },
    ]);
  });

  it("matches case-insensitively while preserving original text", () => {
    expect(highlightText("Planning controls", "planning")).toEqual([
      { text: "Planning", match: true },
      { text: " controls", match: false },
    ]);
  });

  it("highlights multiple matches in content", () => {
    expect(highlightText("DCP clause and dcp table", "dcp")).toEqual([
      { text: "DCP", match: true },
      { text: " clause and ", match: false },
      { text: "dcp", match: true },
      { text: " table", match: false },
    ]);
  });

  it("handles a query at the start of content", () => {
    expect(highlightText("Zone applies here", "zone")).toEqual([
      { text: "Zone", match: true },
      { text: " applies here", match: false },
    ]);
  });

  it("handles a query at the end of content", () => {
    expect(highlightText("Check the zone", "zone")).toEqual([
      { text: "Check the ", match: false },
      { text: "zone", match: true },
    ]);
  });
});

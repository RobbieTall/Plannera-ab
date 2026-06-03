import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceConfidenceBadge } from "@/components/projects/source-confidence-badge";

const citedAttribution = {
  confidence: "cited" as const,
  coverageState: "SEARCHABLE_READY",
  sources: [
    {
      ref: "Byron LEP 2014 cl.4.1C",
      type: "LEP" as const,
      title: "Minimum lot sizes for dual occupancies",
    },
    {
      ref: "Byron DCP 2014 §D1.2",
      type: "DCP" as const,
      title: "Dual occupancy setbacks",
    },
  ],
};

describe("SourceConfidenceBadge", () => {
  it("shows the first cited source and remaining source count", () => {
    render(<SourceConfidenceBadge sourceAttribution={citedAttribution} lgaCode="BYRON" />);

    expect(screen.getByText("● Cited from Byron LEP 2014 cl.4.1C + 1 more")).toBeInTheDocument();
  });

  it("shows an inferred AI reasoning label", () => {
    render(
      <SourceConfidenceBadge
        sourceAttribution={{
          confidence: "inferred",
          coverageState: "UNKNOWN",
          sources: [{ ref: "AI reasoning", type: "model", title: "Model-generated" }],
        }}
      />,
    );

    expect(screen.getByText("◐ AI reasoning — not from retrieved source")).toBeInTheDocument();
  });

  it("shows the coverage notice for unresolved local controls", () => {
    render(
      <SourceConfidenceBadge
        sourceAttribution={{
          confidence: "unresolved",
          coverageState: "PROCESSING",
          coverageNotice: "Local controls preparing — BYRON",
          sources: [],
        }}
        lgaCode="BYRON"
      />,
    );

    expect(screen.getByText("○ Local controls preparing — BYRON")).toBeInTheDocument();
  });
});

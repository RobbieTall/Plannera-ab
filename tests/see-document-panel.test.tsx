import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeeDocumentPanel } from "@/components/projects/see-document-panel";
import type { WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

const mockContent: WorkspacePreSeePlanningMemoContent = {
  memoType: "pre_see_planning_memo",
  generatedAt: "2026-01-01T00:00:00.000Z",
  projectId: "test-proj",
  siteDescription: {
    address: "41 Julian Rocks Drive, Byron Bay",
    lga: "Byron Shire Council",
    zoneCode: "R2",
    zoneName: "Low Density Residential",
    zoneLabel: "R2 Low Density Residential",
  },
  proposedWorksSummary: "Construction of a secondary dwelling",
  applicableControls: {
    lepInstrument: { name: "Byron LEP 2014" },
    permissibility: {
      landUse: "secondary dwelling",
      status: "permitted_with_consent",
      interpretation: null,
    },
    quickSiteControls: {
      height: {
        label: "Height of Buildings",
        value: "8.5m",
        interpretation: "cl. 4.3",
      },
    },
    dcpClauses: [
      {
        ref: "DCP 2010 cl. 2.3",
        title: "Setback Requirements",
        headingPath: ["Part 2", "Setbacks"],
        bodyText: "Front setbacks shall be no less than 4.5m.",
        score: 0.9,
      },
    ],
    sourceExcerpts: [],
  },
  consistencyAssessment: [
    { topic: "Height", assessment: "Compliant with 8.5m LEP control" },
  ],
  limitations: ["Data sourced from LEP XML; always verify with Council."],
};

describe("SeeDocumentPanel", () => {
  it("renders site address immediately", () => {
    render(<SeeDocumentPanel content={mockContent} />);
    expect(screen.getByText(/41 Julian Rocks Drive/i)).toBeInTheDocument();
  });

  it("renders proposed works summary after reveal", async () => {
    render(<SeeDocumentPanel content={mockContent} />);
    await screen.findByText(/secondary dwelling/i, {}, { timeout: 3000 });
  });

  it("renders LEP instrument name after reveal", async () => {
    render(<SeeDocumentPanel content={mockContent} />);
    await screen.findByText(/Byron LEP 2014/i, {}, { timeout: 3000 });
  });
});

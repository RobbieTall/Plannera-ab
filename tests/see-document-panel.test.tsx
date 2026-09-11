import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
        bodyText: "Front setbacks shall be no less than 4.5m. ".repeat(12),
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

const canonicalContent: WorkspacePreSeePlanningMemoContent = {
  ...mockContent,
  canonicalSee: {
    standardVersion: "see-builder-standard.v1",
    status: "ready",
    generatedAt: mockContent.generatedAt,
    sourceDetailedPlanningPackArtefactId: "dpp-current",
    sections: [
      {
        id: "executive_summary",
        title: "Executive Summary",
        narrative:
          "The cited evidence supports preparation of the current proposal for development consent, subject to final outputs and operator review.",
        sourceIds: ["LEP:2.3", "DCP:DCP-1"],
      },
      {
        id: "section_4_15_evaluation",
        title: "Section 4.15 Evaluation",
        narrative:
          "The applicable instruments, likely impacts, site suitability and public interest are synthesised from the registered current-site evidence.",
        sourceIds: ["LEP:2.3", "DCP:DCP-1"],
      },
    ],
    issues: [],
  },
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

  it("lets the customer expand and reduce a long planning clause", async () => {
    render(<SeeDocumentPanel content={mockContent} />);
    const expand = await screen.findByRole(
      "button",
      { name: "Read full clause" },
      { timeout: 3000 },
    );

    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    expect(
      screen.getByRole("button", { name: "Show less" }),
    ).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(
      screen.getByRole("button", { name: "Read full clause" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("renders canonical dynamic sections instead of the legacy memo outline", async () => {
    render(<SeeDocumentPanel content={canonicalContent} />);

    expect(screen.getByText("Canonical SEE compiler")).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Section 4\.15 Evaluation/,
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Applicable LEP Instrument"),
    ).not.toBeInTheDocument();
  });

});

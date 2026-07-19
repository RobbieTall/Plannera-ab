import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeasibilityPanel } from "@/components/projects/feasibility-panel";

const props = {
  projectId: "p1",
  sourceDetailedPlanningPackArtefactId: "dpp-1",
  proposalBrief: "Dwelling houses",
};

afterEach(() => vi.unstubAllGlobals());

describe("FeasibilityPanel", () => {
  it("uses the active DCP proposal instead of offering a second development-type selector", () => {
    render(<FeasibilityPanel {...props} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Dwelling houses")).toBeTruthy();
    expect(screen.getByRole("button", { name: /build summary/i })).toBeTruthy();
  });

  it("shows the evidence-derived planning status and cited items", () => {
    const content = {
      summaryType: "planning_feasibility_summary" as const,
      projectId: "p1",
      developmentType: "Dwelling houses",
      proposalBrief: "Dwelling houses",
      overallVerdict: "caution" as const,
      summary: "Cited controls found; professional verification remains required.",
      items: [{ label: "LEP development standards", verdict: "caution" as const, detail: "Height: 9m", confidence: "cited" as const, source: "Byron LEP 2014 clause 4.3" }],
      generatedAt: "2026-07-19T00:00:00.000Z",
      sourceDetailedPlanningPack: { artefactId: "dpp-1", generatedAt: "2026-07-19T00:00:00.000Z", commercialReady: true, sourceQuickSiteCheckArtefactId: "qsc-1" },
    };
    render(<FeasibilityPanel {...props} existingContent={content} />);
    expect(screen.getByText(/planning status/i)).toBeTruthy();
    expect(screen.getByText(/Proceed with caution/)).toBeTruthy();
    expect(screen.getByText(/LEP development standards/)).toBeTruthy();
    expect(screen.getByText(/Cited/)).toBeTruthy();
  });

  it("posts only the exact server binding for the active DCP pack", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: {
          summaryType: "planning_feasibility_summary",
          projectId: "p1",
          developmentType: "Dwelling houses",
          proposalBrief: "Dwelling houses",
          overallVerdict: "unresolved",
          summary: "Review needed.",
          items: [{ label: "DCP: Setbacks", verdict: "unresolved", detail: "No cited value.", confidence: "unavailable" }],
          generatedAt: "2026-07-19T00:00:00.000Z",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FeasibilityPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /build summary/i }));

    expect(await screen.findByText(/Review needed/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/artefacts/generate-feasibility",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          projectId: "p1",
          sourceDetailedPlanningPackArtefactId: "dpp-1",
          expectedProposalBrief: "Dwelling houses",
        }),
      }),
    );
  });
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeasibilityPanel } from "@/components/projects/feasibility-panel";

describe("FeasibilityPanel", () => {
  it("renders development type selector and assess button", () => {
    render(<FeasibilityPanel projectId="p1" address="41 Julian Rocks Dr, Byron Bay" />);
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /assess/i })).toBeTruthy();
  });

  it("shows overall verdict and items when content provided", () => {
    const content = {
      developmentType: "Secondary dwelling",
      overallVerdict: "proceed" as const,
      summary: "This site appears suitable.",
      items: [
        {
          label: "Permissibility",
          verdict: "proceed" as const,
          detail: "Permitted with consent.",
          confidence: "cited" as const,
          source: "Byron LEP 2014 cl. 2.3",
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    render(<FeasibilityPanel projectId="p1" address="41 Julian Rocks Dr" existingContent={content} />);
    expect(screen.getByText(/overall verdict/i)).toBeTruthy();
    expect(screen.getByText(/Permissibility/)).toBeTruthy();
    expect(screen.getByText(/Cited/)).toBeTruthy();
  });

  it("posts selected development type when assessing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: {
          developmentType: "Dual occupancy",
          overallVerdict: "caution",
          summary: "Needs review.",
          items: [{ label: "Permissibility", verdict: "caution", detail: "Check consent pathway.", confidence: "inferred" }],
          generatedAt: new Date().toISOString(),
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FeasibilityPanel projectId="p1" address="41 Julian Rocks Dr" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Dual occupancy" } });
    fireEvent.click(screen.getByRole("button", { name: /assess/i }));

    expect(await screen.findByText(/Needs review/i)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/artefacts/generate-feasibility",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Dual occupancy"),
      }),
    );

    vi.unstubAllGlobals();
  });
});

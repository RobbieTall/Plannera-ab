import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectIntelligenceCard } from "@/components/projects/project-intelligence-card";
import { useLgaCoverageStatus } from "@/hooks/use-lga-coverage-status";
import type { SiteContextSummary } from "@/types/site";
import type { WorkspaceArtefact, WorkspaceMessage } from "@/types/workspace";

vi.mock("@/hooks/use-lga-coverage-status", () => ({
  useLgaCoverageStatus: vi.fn(),
}));

const siteContext: SiteContextSummary = {
  id: "site-1",
  projectId: "project-1",
  addressInput: "10 Test Street",
  formattedAddress: "10 Test Street, Kempsey NSW",
  lgaName: "Kempsey Shire",
  lgaCode: "KEMPSEY",
  parcelId: null,
  lot: null,
  planNumber: null,
  latitude: null,
  longitude: null,
  zone: "R1",
  zoningCode: "R1",
  zoningName: "General Residential",
  zoningSource: "fixture",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const messages: WorkspaceMessage[] = [
  {
    id: "assistant-1",
    role: "assistant",
    content: "Cited answer",
    timestamp: "10:00",
    sourceAttribution: { confidence: "cited", coverageState: "SEARCHABLE_READY", sources: [] },
  },
  {
    id: "assistant-2",
    role: "assistant",
    content: "Inferred answer",
    timestamp: "10:01",
    sourceAttribution: { confidence: "inferred", coverageState: "NOT_STARTED", sources: [] },
  },
  {
    id: "assistant-3",
    role: "assistant",
    content: "Unresolved answer",
    timestamp: "10:02",
    sourceAttribution: { confidence: "unresolved", coverageState: "QUEUED", sources: [] },
  },
];

const artefacts: WorkspaceArtefact[] = [
  {
    id: "artefact-1",
    title: "Quick Site Check",
    owner: "You",
    updatedAt: "3 Jun 2026, 9:30 am",
    type: "report",
  },
];

describe("ProjectIntelligenceCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ staleArtefacts: [{ id: "stale-1" }] }),
    });
    vi.mocked(useLgaCoverageStatus).mockReturnValue({
      maturity: "SEARCHABLE_READY",
      errorMessage: null,
      isLoading: false,
      isPolling: false,
    });
  });

  it("summarises site, coverage, artefact freshness and confidence mix", async () => {
    render(<ProjectIntelligenceCard projectId="project-1" siteContext={siteContext} messages={messages} artefacts={artefacts} />);

    expect(screen.getByText("Project Intelligence")).toBeInTheDocument();
    expect(screen.getByText("10 Test Street, Kempsey NSW")).toBeInTheDocument();
    expect(screen.getByText("Zone: R1 · General Residential")).toBeInTheDocument();
    expect(screen.getByText("Kempsey Shire")).toBeInTheDocument();
    expect(screen.getAllByText("Searchable").length).toBeGreaterThan(0);
    expect(screen.getByText("3 Jun 2026, 9:30 am")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("1 stale item")).toBeInTheDocument();
    });
    expect(screen.getAllByText("33%")).toHaveLength(3);
    expect(fetch).toHaveBeenCalledWith("/api/projects/project-1/artefacts/stale", { credentials: "include" });
  });

  it("renders restrained empty state when site and sourced answers are not available", async () => {
    vi.mocked(useLgaCoverageStatus).mockReturnValue({
      maturity: null,
      errorMessage: null,
      isLoading: false,
      isPolling: false,
    });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ staleArtefacts: [] }) } as Response);

    render(<ProjectIntelligenceCard projectId="project-1" siteContext={null} messages={[]} artefacts={[]} />);

    expect(screen.getByText("No site set")).toBeInTheDocument();
    expect(screen.getByText("Zone: Set site to confirm")).toBeInTheDocument();
    expect(screen.getByText("No LGA set")).toBeInTheDocument();
    expect(screen.getByText("None yet")).toBeInTheDocument();
    expect(screen.getByText("Ask a site question to build a cited, inferred and unresolved answer profile.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("0 stale items")).toBeInTheDocument();
    });
  });
});

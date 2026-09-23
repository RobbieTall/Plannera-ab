import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LgaCoverageStatusPanel } from "@/components/projects/lga-coverage-status-panel";
import { useLgaCoverageStatus } from "@/hooks/use-lga-coverage-status";

vi.mock("@/hooks/use-lga-coverage-status", () => ({
  useLgaCoverageStatus: vi.fn(),
}));

const mockCoverageStatus = (maturity: string | null, serviceTargetAt: string | null = null) => {
  vi.mocked(useLgaCoverageStatus).mockReturnValue({
    maturity: maturity as ReturnType<typeof useLgaCoverageStatus>["maturity"],
    errorMessage: null,
    isLoading: false,
    isPolling: false,
    serviceTargetAt,
  });
};

describe("LgaCoverageStatusPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when maturity is null", () => {
    mockCoverageStatus(null);

    const { container } = render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when maturity is NOT_STARTED", () => {
    mockCoverageStatus("NOT_STARTED");

    const { container } = render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders Reviewing copy when QUEUED", () => {
    mockCoverageStatus("QUEUED");

    render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(screen.getByText("Reviewing local planning controls for Byron Shire. Service target: within 2 business days.")).toBeInTheDocument();
  });

  it("shows the current weekday service target when available", () => {
    mockCoverageStatus("QUEUED", "2026-09-29T03:00:00.000Z");

    render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(screen.getByText(/within 2 business days/)).toBeInTheDocument();
    expect(screen.getByText(/29 Sept 2026|29 Sep 2026/)).toBeInTheDocument();
  });

  it("renders spinner copy when PROCESSING", () => {
    mockCoverageStatus("PROCESSING");

    render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(screen.getByText("Processing Byron Shire planning data. Guidance will improve as local controls are indexed. Service target: within 2 business days.")).toBeInTheDocument();
    expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("renders green copy when SEARCHABLE_READY", () => {
    mockCoverageStatus("SEARCHABLE_READY");

    render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(screen.getByText("Local planning controls for Byron Shire are now searchable. Your workspace has been updated.")).toBeInTheDocument();
  });

  it("renders amber copy when FAILED_REVIEW_NEEDED", () => {
    mockCoverageStatus("FAILED_REVIEW_NEEDED");

    render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(screen.getByText(/Local controls preparation for Byron Shire needs operator review/)).toBeInTheDocument();
    expect(screen.getByText(/refund is only complete after payment-provider confirmation/)).toBeInTheDocument();
  });

  it("dismiss button hides the panel", () => {
    mockCoverageStatus("QUEUED");

    const { container } = render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    fireEvent.click(screen.getByLabelText("Dismiss LGA coverage status"));

    expect(container).toBeEmptyDOMElement();
  });

  it("SEARCHABLE_READY auto-dismisses after 8s", async () => {
    vi.useFakeTimers();
    mockCoverageStatus("SEARCHABLE_READY");

    const { container } = render(<LgaCoverageStatusPanel lgaCode="BYRON" lgaDisplayName="Byron Shire" />);

    expect(screen.getByText("Local planning controls for Byron Shire are now searchable. Your workspace has been updated.")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(container).toBeEmptyDOMElement();
  });
});

/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLgaCoverageStatus } from "@/hooks/use-lga-coverage-status";

const coverageResponse = (state: string) =>
  ({
    ok: true,
    json: () =>
      Promise.resolve({
        lgaCode: "BYRON",
        state,
        activeJobId: null,
        lastUpdatedAt: null,
      }),
  } as Response);

describe("useLgaCoverageStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not fetch when lgaCode is null", () => {
    renderHook(() => useLgaCoverageStatus(null));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches on mount when lgaCode is provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(coverageResponse("NOT_STARTED"));

    const { result } = renderHook(() => useLgaCoverageStatus("BYRON"));

    expect(fetch).toHaveBeenCalledWith("/api/lga/coverage?lga=BYRON");
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.maturity).toBe("NOT_STARTED");
    expect(result.current.isLoading).toBe(false);
  });

  it("polls while maturity is QUEUED", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(coverageResponse("QUEUED"))
      .mockResolvedValueOnce(coverageResponse("QUEUED"));

    const { result } = renderHook(() => useLgaCoverageStatus("BYRON"));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isPolling).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.isPolling).toBe(true);
  });

  it("stops polling when maturity changes to SEARCHABLE_READY", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(coverageResponse("QUEUED"))
      .mockResolvedValueOnce(coverageResponse("SEARCHABLE_READY"));

    const { result } = renderHook(() => useLgaCoverageStatus("BYRON"));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isPolling).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.maturity).toBe("SEARCHABLE_READY");
    expect(result.current.isPolling).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("cleans up interval on unmount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(coverageResponse("QUEUED"));

    const { result, unmount } = renderHook(() => useLgaCoverageStatus("BYRON"));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isPolling).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

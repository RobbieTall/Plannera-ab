"use client";

import type { LgaCoverageMaturity } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

const POLLING_INTERVAL_MS = 10_000;

const POLLING_STATES = new Set<LgaCoverageMaturity>(["QUEUED", "PROCESSING"] as LgaCoverageMaturity[]);

type LgaCoverageResponse = {
  lgaCode: string;
  state: LgaCoverageMaturity;
  activeJobId: string | null;
  lastUpdatedAt: string | null;
};

type LgaCoverageStatus = {
  maturity: LgaCoverageMaturity | null;
  errorMessage: string | null;
  isLoading: boolean;
  isPolling: boolean;
};

export function useLgaCoverageStatus(lgaCode: string | null | undefined): LgaCoverageStatus {
  const [maturity, setMaturity] = useState<LgaCoverageMaturity | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchCoverage = useCallback(async (): Promise<LgaCoverageMaturity | null> => {
    if (!lgaCode) return null;

    try {
      const response = await fetch(`/api/lga/coverage?lga=${encodeURIComponent(lgaCode)}`);
      if (!response.ok) {
        throw new Error("Unable to load LGA coverage status");
      }

      const data = (await response.json()) as LgaCoverageResponse;
      setMaturity(data.state);
      setErrorMessage(null);
      return data.state;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load LGA coverage status";
      setErrorMessage(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [lgaCode]);

  useEffect(() => {
    clearPolling();

    if (!lgaCode) {
      setMaturity(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const startPollingIfNeeded = (state: LgaCoverageMaturity | null) => {
      if (cancelled || !state || !POLLING_STATES.has(state)) {
        clearPolling();
        return;
      }

      setIsPolling(true);
      intervalRef.current = setInterval(() => {
        void fetchCoverage().then((nextState) => {
          if (!nextState || !POLLING_STATES.has(nextState)) {
            clearPolling();
          }
        });
      }, POLLING_INTERVAL_MS);
    };

    void fetchCoverage().then(startPollingIfNeeded);

    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [clearPolling, fetchCoverage, lgaCode]);

  return { maturity, errorMessage, isLoading, isPolling };
}

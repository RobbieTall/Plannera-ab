"use client";

import React, { useEffect, useMemo, useState } from "react";

import { useLgaCoverageStatus } from "@/hooks/use-lga-coverage-status";

interface LgaCoverageStatusPanelProps {
  lgaCode: string | null | undefined;
  lgaDisplayName?: string;
}

const SEARCHABLE_READY_AUTO_HIDE_MS = 8_000;

export function LgaCoverageStatusPanel({ lgaCode, lgaDisplayName }: LgaCoverageStatusPanelProps) {
  const { maturity } = useLgaCoverageStatus(lgaCode);
  const [dismissed, setDismissed] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);

  useEffect(() => {
    setDismissed(false);
    setAutoHidden(false);
  }, [lgaCode, maturity]);

  useEffect(() => {
    if (maturity !== "SEARCHABLE_READY") return undefined;

    const timeout = setTimeout(() => setAutoHidden(true), SEARCHABLE_READY_AUTO_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [maturity]);

  const lgaLabel = useMemo(() => lgaDisplayName?.trim() || lgaCode?.trim() || "this LGA", [lgaCode, lgaDisplayName]);

  if (!maturity || maturity === "NOT_STARTED" || maturity === "VERIFIED" || dismissed || autoHidden) {
    return null;
  }

  const isProcessing = maturity === "PROCESSING";
  const isWarning = maturity === "FAILED_REVIEW_NEEDED";
  const isReady = maturity === "SEARCHABLE_READY" || maturity === "STRUCTURED_PARTIAL";

  const panelTone = isWarning
    ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    : isReady
      ? "border-green-200 bg-green-50 text-green-950 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100"
      : "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100";

  const iconTone = isWarning
    ? "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100"
    : isReady
      ? "bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-100"
      : "bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-100";

  const buttonTone = isWarning
    ? "text-amber-700 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-100 dark:hover:bg-amber-400/20"
    : isReady
      ? "text-green-700 hover:bg-green-100 hover:text-green-950 dark:text-green-100 dark:hover:bg-green-400/20"
      : "text-blue-700 hover:bg-blue-100 hover:text-blue-950 dark:text-blue-100 dark:hover:bg-blue-400/20";

  const message = (() => {
    if (maturity === "QUEUED") return `Reviewing local planning controls for ${lgaLabel}. This usually takes a few minutes.`;
    if (maturity === "PROCESSING") return `Processing ${lgaLabel} planning data. Guidance will improve as local controls are indexed.`;
    if (maturity === "SEARCHABLE_READY") return `Local planning controls for ${lgaLabel} are now searchable. Your workspace has been updated.`;
    if (maturity === "STRUCTURED_PARTIAL") return `Structured planning data for ${lgaLabel} is available. Controls inventory is active.`;
    return `Local data review needed for ${lgaLabel}. Standard guidance is still available.`;
  })();

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${panelTone}`} role="status">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-full p-1.5 ${iconTone}`} aria-hidden="true">
          {isProcessing ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <span className="block h-4 w-4 rounded-full border-2 border-current" />
          )}
        </div>
        <p className="min-w-0 flex-1 leading-5">{message}</p>
        {maturity !== "SEARCHABLE_READY" ? (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className={`rounded-full px-1.5 py-0.5 text-lg leading-none transition ${buttonTone}`}
            aria-label="Dismiss LGA coverage status"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

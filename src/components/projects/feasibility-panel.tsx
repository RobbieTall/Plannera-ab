"use client";

import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { FeasibilityContent } from "@/types/workspace";

const VERDICT_CONFIG = {
  proceed: { label: "Proceed", colour: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700" },
  caution: { label: "Proceed with caution", colour: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  redesign: { label: "Redesign", colour: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
  blocked: { label: "Blocked", colour: "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  unresolved: { label: "Review needed", colour: "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
};

const CONFIDENCE_CONFIG = {
  cited: { label: "Cited", colour: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  inferred: { label: "Inferred", colour: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  unavailable: { label: "Unavailable", colour: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
};

interface FeasibilityPanelProps {
  projectId: string;
  sourceDetailedPlanningPackArtefactId: string;
  proposalBrief: string;
  existingContent?: FeasibilityContent | null;
}

export function FeasibilityPanel({
  projectId,
  sourceDetailedPlanningPackArtefactId,
  proposalBrief,
  existingContent,
}: FeasibilityPanelProps) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<FeasibilityContent | null>(existingContent ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setContent(existingContent ?? null), [existingContent]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/artefacts/generate-feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId,
          sourceDetailedPlanningPackArtefactId,
          expectedProposalBrief: proposalBrief,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { content?: FeasibilityContent; error?: string };
      if (!response.ok || !data.content) throw new Error(data.error ?? "Unable to generate summary");
      setContent(data.content);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate the planning feasibility summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Active proposal</p>
          <p className="mt-1 text-sm leading-5 text-slate-800 dark:text-slate-100">{proposalBrief}</p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
        >
          {loading ? "Building summary…" : content ? "Refresh summary" : "Build summary"}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}

      {content ? (
        <>
          <div className={cn("rounded-lg border px-4 py-3", VERDICT_CONFIG[content.overallVerdict].colour)}>
            <p className="text-xs font-semibold uppercase opacity-70">Planning status</p>
            <p className="mt-0.5 text-base font-bold">{VERDICT_CONFIG[content.overallVerdict].label}</p>
            <p className="mt-2 text-sm leading-5">{content.summary}</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {content.items.map((item, index) => (
              <div key={`${item.label}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", CONFIDENCE_CONFIG[item.confidence].colour)}>
                    {CONFIDENCE_CONFIG[item.confidence].label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{item.detail}</p>
                {item.source ? <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{item.source}</p> : null}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Built {new Date(content.generatedAt).toLocaleString()} from the exact saved Quick Site Check and Detailed Planning Pack. Professional verification is still required before a development decision.
          </p>
        </>
      ) : (
        <p className="text-sm italic text-slate-400 dark:text-slate-500">
          Build a concise decision summary from the active proposal’s cited LEP and DCP evidence.
        </p>
      )}
    </div>
  );
}

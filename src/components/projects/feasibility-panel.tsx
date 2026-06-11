"use client";

import React, { useState } from "react";

import { cn } from "@/lib/utils";
import type { FeasibilityContent } from "@/types/workspace";

const DEVELOPMENT_TYPES = [
  "Secondary dwelling (granny flat)",
  "Dual occupancy",
  "DA — dwelling house",
  "DA — small subdivision",
  "DA — mixed use / commercial",
  "DA — renovation / addition",
  "Complying development",
];

const VERDICT_CONFIG = {
  proceed: { label: "Proceed", colour: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700" },
  caution: { label: "Caution", colour: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  redesign: { label: "Redesign", colour: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
  blocked: { label: "Blocked", colour: "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  unresolved: { label: "Unresolved", colour: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

const CONFIDENCE_CONFIG = {
  cited: { label: "Cited", colour: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  inferred: { label: "Inferred", colour: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  unavailable: { label: "Unavailable", colour: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
};

const OVERALL_VERDICT_ICON = {
  proceed: "✅",
  caution: "⚠️",
  redesign: "🔄",
  blocked: "🚫",
  unresolved: "❔",
};

interface FeasibilityPanelProps {
  projectId: string;
  address: string;
  siteContext?: { lga?: string; zone?: string };
  existingContent?: FeasibilityContent | null;
}

export function FeasibilityPanel({ projectId, address, siteContext, existingContent }: FeasibilityPanelProps) {
  const [devType, setDevType] = useState(existingContent?.developmentType ?? DEVELOPMENT_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<FeasibilityContent | null>(existingContent ?? null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/artefacts/generate-feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, address, developmentType: devType, siteContext }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setContent(data.content);
    } catch {
      setError("Could not generate feasibility assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Basic Feasibility</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Get a cited, confidence-labelled go/no-go for your development type at this site.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={devType}
            onChange={(e) => setDevType(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {DEVELOPMENT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Assessing…" : content ? "Regenerate" : "Assess feasibility"}
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>

      {content ? (
        <>
          <div className={cn("flex items-center justify-between rounded-xl border px-4 py-3", VERDICT_CONFIG[content.overallVerdict].colour)}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Overall verdict</p>
              <p className="text-base font-bold">{VERDICT_CONFIG[content.overallVerdict].label}</p>
            </div>
            <span className="text-2xl">{OVERALL_VERDICT_ICON[content.overallVerdict]}</span>
          </div>

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{content.summary}</p>

          <div className="flex flex-col gap-2">
            {content.items.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold", VERDICT_CONFIG[item.verdict].colour)}>
                      {VERDICT_CONFIG[item.verdict].label}
                    </span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", CONFIDENCE_CONFIG[item.confidence].colour)}>
                      {CONFIDENCE_CONFIG[item.confidence].label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{item.detail}</p>
                {item.source ? <p className="text-[10px] italic text-slate-400 dark:text-slate-500">{item.source}</p> : null}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Generated {new Date(content.generatedAt).toLocaleString()}. This assessment is indicative only and requires professional verification before any development decision.
          </p>
        </>
      ) : null}
    </div>
  );
}

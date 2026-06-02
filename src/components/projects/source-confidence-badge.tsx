import React from "react";

import { cn } from "@/lib/utils";
import type { SourceAttribution } from "@/lib/workspace-chat";

const getFirstSourceLabel = (sourceAttribution: SourceAttribution) => {
  const firstSource = sourceAttribution.sources[0];
  if (!firstSource) return "source";
  return firstSource.ref || firstSource.title;
};

export function SourceConfidenceBadge({
  sourceAttribution,
  lgaCode,
}: {
  sourceAttribution: SourceAttribution;
  lgaCode?: string | null;
}) {
  const badgeClassName = cn(
    "mt-2 inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
    sourceAttribution.confidence === "cited" &&
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    sourceAttribution.confidence === "inferred" &&
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    sourceAttribution.confidence === "unresolved" &&
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  );

  if (sourceAttribution.confidence === "cited") {
    const remainingSources = Math.max(0, sourceAttribution.sources.length - 1);
    return (
      <span className={badgeClassName} title={sourceAttribution.sources.map((source) => source.ref).join(", ")}>
        ● Cited from {getFirstSourceLabel(sourceAttribution)}
        {remainingSources > 0 ? ` + ${remainingSources} more` : ""}
      </span>
    );
  }

  if (sourceAttribution.confidence === "inferred") {
    return <span className={badgeClassName}>◐ AI reasoning — not from retrieved source</span>;
  }

  const notice = sourceAttribution.coverageNotice ?? (lgaCode ? `Local controls preparing — ${lgaCode}` : "Local controls preparing");
  return <span className={badgeClassName}>○ {notice}</span>;
}

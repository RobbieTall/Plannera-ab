"use client";

import React from "react";

export function ChatConfidenceBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return null;
  }

  const percentage = Math.round(score * 100);

  if (score >= 0.7) {
    return (
      <span
        className="mt-2 inline-flex w-fit items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold leading-none text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
        title={String(score)}
      >
        High confidence · {percentage}%
      </span>
    );
  }

  if (score >= 0.4) {
    return (
      <span
        className="mt-2 inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold leading-none text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
        title={String(score)}
      >
        Moderate confidence · {percentage}%
      </span>
    );
  }

  return (
    <span
      className="mt-2 inline-flex w-fit items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold leading-none text-red-700 dark:bg-red-500/10 dark:text-red-200"
      title={String(score)}
    >
      Low confidence · {percentage}%
    </span>
  );
}

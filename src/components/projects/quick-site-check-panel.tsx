"use client";

import { Sparkles } from "lucide-react";

type QuickSiteCheckPanelProps = {
  onClick: () => void;
};

export function QuickSiteCheckPanel({ onClick }: QuickSiteCheckPanelProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-slate-600"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/30">
          <Sparkles className="h-4 w-4 text-slate-900 dark:text-slate-100" />
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
          Free
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Quick Site Check (LEP only)</p>
      <p className="text-xs text-slate-500 dark:text-slate-300">Zoning + LEP snapshot.</p>
    </button>
  );
}

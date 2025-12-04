"use client";

import { useState } from "react";
import { AlertTriangle, MapPin, RefreshCcw, Sparkles } from "lucide-react";

import type {
  QuickSiteCheckArtefactRequest,
  QuickSiteCheckControl,
  QuickSiteCheckReport,
  QuickSiteCheckResponse,
} from "@/types/quick-site-check";
import type { SiteContextSummary } from "@/types/site";
import { cn, formatShortDate } from "@/lib/utils";

const formatList = (items: string[]) => {
  const trimmed = items.map((item) => item.trim()).filter(Boolean);
  if (!trimmed.length) return "No entries";
  if (trimmed.length === 1) return trimmed[0];
  if (trimmed.length === 2) return `${trimmed[0]} and ${trimmed[1]}`;
  return `${trimmed.slice(0, -1).join(", ")}, and ${trimmed.at(-1)}`;
};

const ControlCard = ({ control }: { control: QuickSiteCheckControl }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors dark:border-slate-800 dark:bg-slate-800/60">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{control.label}</p>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
          control.present
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
        )}
      >
        {control.value ?? control.clauseRef ?? "Pending"}
      </span>
    </div>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">{control.interpretation}</p>
    {control.detail ? (
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{control.detail}</p>
    ) : null}
  </div>
);

export function QuickSiteCheckPanel({
  projectId,
  siteContext,
}: {
  projectId: string;
  siteContext: SiteContextSummary | null;
}) {
  const [report, setReport] = useState<QuickSiteCheckReport | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const hasSite = Boolean(siteContext);

  const runCheck = async () => {
    if (!projectId) return;
    setStatus("loading");
    setError(null);
    setSaveStatus("idle");
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/quick-site-check`, { cache: "no-store" });
      const payload: QuickSiteCheckResponse = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Unable to run Quick Site Check");
      }
      setReport(payload.report ?? null);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to run Quick Site Check");
    }
  };

  const saveArtefact = async () => {
    if (!report) return;
    setSaveStatus("saving");
    setSaveMessage(null);

    const title = report.site.address
      ? `Quick Site Check — ${report.site.address}`
      : `Quick Site Check — ${projectId}`;

    const payload: QuickSiteCheckArtefactRequest = {
      projectId,
      title,
      type: "quick_site_check",
      report,
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/artefacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = response.status === 401 ? "Please sign in to save artefacts." : data.error ?? data.message;
        throw new Error(message ?? "Unable to save artefact");
      }

      setSaveStatus("success");
      setSaveMessage("Saved to artefacts.");
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "Unable to save artefact");
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Quick Site Check</p>
          <p className="text-sm text-slate-500 dark:text-slate-300">LEP-only summary of zoning and mapped controls.</p>
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={!hasSite || status === "loading"}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
        >
          {status === "loading" ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {report ? "Re-run check" : "Run check"}
        </button>
      </header>

      {!hasSite ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Set a site to enable Quick Site Check.
        </div>
      ) : null}

      {status === "error" && error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {status === "loading" ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Running Quick Site Check…</p>
      ) : null}

      {report ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
                <MapPin className="h-4 w-4" />
                <span>{report.site.address ?? "No address"}</span>
                {report.site.lga ? <span className="text-slate-400">• {report.site.lga}</span> : null}
              </div>
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                <button
                  type="button"
                  onClick={saveArtefact}
                  disabled={!report || saveStatus === "saving" || status === "loading"}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
                >
                  {saveStatus === "saving" ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Save as artefact
                </button>
                {saveMessage ? (
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      saveStatus === "success"
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-rose-600 dark:text-rose-300",
                    )}
                  >
                    {saveMessage}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-100">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {report.site.zoneLabel ?? "Zoning pending"}
              </span>
              {report.lepInstrument?.name ? (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                  {report.lepInstrument.name}
                </span>
              ) : (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  LEP instrument pending
                </span>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Generated {formatShortDate(report.generatedAt)}
              </span>
            </div>
            {report.permissibility ? (
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-200">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Permissibility snapshot</p>
                <p>{report.permissibility.interpretation}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/60 p-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-slate-900/40 dark:text-emerald-200 dark:ring-emerald-900/30">
                    Generally permitted: {formatList(report.permissibility.permittedWithoutConsent)}
                  </div>
                  <div className="rounded-xl bg-white/60 p-3 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-slate-900/40 dark:text-amber-200 dark:ring-amber-900/30">
                    With consent: {formatList(report.permissibility.permittedWithConsent)}
                  </div>
                  <div className="rounded-xl bg-white/60 p-3 text-xs font-semibold text-rose-700 ring-1 ring-rose-100 dark:bg-slate-900/40 dark:text-rose-200 dark:ring-rose-900/30">
                    Not permitted: {formatList(report.permissibility.prohibited)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">No LEP permissibility data available yet.</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ControlCard control={report.controls.heightOfBuilding} />
            <ControlCard control={report.controls.floorSpaceRatio} />
            <ControlCard control={report.controls.minimumLotSize} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Next steps</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-200">
              {report.nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {report.notes.length ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-900/40">
                {report.notes.join(" ")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

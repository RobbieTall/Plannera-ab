"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, FileText, MapPin } from "lucide-react";

import { useLgaCoverageStatus } from "@/hooks/use-lga-coverage-status";
import type { SiteContextSummary } from "@/types/site";
import type { WorkspaceArtefact, WorkspaceMessage } from "@/types/workspace";

interface ProjectIntelligenceCardProps {
  projectId: string;
  siteContext: SiteContextSummary | null;
  messages: WorkspaceMessage[];
  artefacts: WorkspaceArtefact[];
}

type StaleArtefactsResponse = {
  staleArtefacts?: Array<{ id: string; type: string; staleAt: string; createdAt: string }>;
};

const maturityLabels: Record<string, string> = {
  NOT_STARTED: "Not started",
  QUEUED: "Preparing",
  PROCESSING: "Indexing",
  SEARCHABLE_READY: "Searchable",
  STRUCTURED_PARTIAL: "Structured partial",
  VERIFIED: "Verified",
  FAILED_REVIEW_NEEDED: "Review needed",
};

const maturityTone = (maturity: string | null) => {
  if (maturity === "VERIFIED" || maturity === "STRUCTURED_PARTIAL" || maturity === "SEARCHABLE_READY") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-400/30";
  }
  if (maturity === "FAILED_REVIEW_NEEDED") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-400/30";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
};

const buildZoneLabel = (siteContext: SiteContextSummary | null) => {
  if (!siteContext) return "Set site to confirm";
  const code = siteContext.zoningCode ?? siteContext.zone;
  const name = siteContext.zoningName;
  if (code && name) return `${code} · ${name}`;
  return code ?? name ?? "Not available yet";
};

const formatConfidencePercent = (count: number, total: number) => `${Math.round((count / Math.max(total, 1)) * 100)}%`;

export function ProjectIntelligenceCard({ projectId, siteContext, messages, artefacts }: ProjectIntelligenceCardProps) {
  const { maturity, isLoading } = useLgaCoverageStatus(siteContext?.lgaCode ?? undefined);
  const [staleCount, setStaleCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStaleArtefacts = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/artefacts/stale`, { credentials: "include" });
        if (!response.ok) {
          if (!cancelled) setStaleCount(null);
          return;
        }

        const data = (await response.json()) as StaleArtefactsResponse;
        if (!cancelled) setStaleCount(data.staleArtefacts?.length ?? 0);
      } catch {
        if (!cancelled) setStaleCount(null);
      }
    };

    void loadStaleArtefacts();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const confidence = useMemo(() => {
    const attributedAssistantMessages = messages.filter(
      (message) => message.role === "assistant" && message.sourceAttribution,
    );
    const totals = { cited: 0, inferred: 0, unresolved: 0 };

    for (const message of attributedAssistantMessages) {
      const level = message.sourceAttribution?.confidence;
      if (level) totals[level] += 1;
    }

    return { total: attributedAssistantMessages.length, ...totals };
  }, [messages]);

  const latestArtefact = artefacts[0] ?? null;
  const lgaLabel = siteContext?.lgaName ?? siteContext?.lgaCode ?? "No LGA set";
  const maturityLabel = isLoading ? "Checking" : maturity ? maturityLabels[maturity] ?? maturity : siteContext?.lgaCode ? "Unknown" : "Set site first";

  return (
    <section className="rounded-[1.5rem] border border-white/80 bg-white/90 p-5 shadow-sm shadow-slate-200/70 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Project Intelligence</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">What Plannera knows right now.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${maturityTone(maturity)}`}>
          {maturityLabel}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/70">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-blue-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Site</p>
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                {siteContext?.formattedAddress ?? "No site set"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Zone: {buildZoneLabel(siteContext)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/70">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              LGA coverage
            </div>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{lgaLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{maturityLabel}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/70">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Artefacts
            </div>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
              {latestArtefact ? latestArtefact.updatedAt : "None yet"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {staleCount === null ? "Freshness checking" : `${staleCount} stale item${staleCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <BarChart3 className="h-3.5 w-3.5" />
            Confidence mix
          </div>
          {confidence.total > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white p-2 dark:bg-slate-900/70">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatConfidencePercent(confidence.cited, confidence.total)}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Cited</p>
              </div>
              <div className="rounded-xl bg-white p-2 dark:bg-slate-900/70">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-300">{formatConfidencePercent(confidence.inferred, confidence.total)}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Inferred</p>
              </div>
              <div className="rounded-xl bg-white p-2 dark:bg-slate-900/70">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-300">{formatConfidencePercent(confidence.unresolved, confidence.total)}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Unresolved</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">
              Ask a site question to build a cited, inferred and unresolved answer profile.
            </p>
          )}
        </div>

        <p className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Updates as workspace context, outputs and local coverage change.
        </p>
      </div>
    </section>
  );
}

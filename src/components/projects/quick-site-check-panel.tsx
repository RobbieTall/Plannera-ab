"use client";

import { useCallback, useState } from "react";
import { RefreshCcw, Sparkles } from "lucide-react";

import type { QuickSiteCheckLepResponse, QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";
import type { SiteContextSummary } from "@/types/site";
import type { WorkspaceSessionSignals } from "@/types/workspace";

const formatList = (items: string[]) =>
  items.length ? items.map((item) => `- ${item}`).join("\n") : "- None listed.";

const buildChatMessage = (payload: QuickSiteCheckLepSuccess) => {
  const heading = payload.zone
    ? `Quick Site Check (LEP only) for zone ${payload.zone}`
    : "Quick Site Check (LEP only)";
  const sections = [
    `${heading}\nLGA: ${payload.lga} • LEP: ${payload.lepName}`,
    "",
    "Zone objectives:",
    formatList(payload.zoneObjectives),
    "",
    "Land use table:",
    `Permitted without consent:\n${formatList(payload.permittedWithoutConsent)}`,
    `Permitted with consent:\n${formatList(payload.permittedWithConsent)}`,
    `Prohibited:\n${formatList(payload.prohibited)}`,
  ];

  const partToLabel: Record<"4" | "5" | "6", string> = {
    "4": "Part 4 – Principal development standards",
    "5": "Part 5 – Miscellaneous provisions",
    "6": "Part 6 – Local provisions",
  };

  const clauseGroups: Record<"4" | "5" | "6", QuickSiteCheckLepSuccess["part4Clauses"]> = {
    "4": payload.part4Clauses,
    "5": payload.part5Clauses,
    "6": payload.part6Clauses,
  };

  (['4', '5', '6'] as const).forEach((part) => {
    const clauses = clauseGroups[part];
    if (!clauses?.length) return;
    sections.push("", partToLabel[part]);
    sections.push(
      ...clauses.map((clause) =>
        `- ${clause.clauseNumber} ${clause.heading} – ${clause.textSnippet}`.trim(),
      ),
    );
  });

  return sections.filter(Boolean).join("\n");
};

export function QuickSiteCheckPanel({
  projectId,
  siteContext,
  onAddMessage,
}: {
  projectId: string;
  siteContext: SiteContextSummary | null;
  onAddMessage: (message: string, signals?: WorkspaceSessionSignals) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const zoneLabel = siteContext?.zoningCode
    ? [siteContext.zoningCode, siteContext.zoningName].filter(Boolean).join(" – ")
    : siteContext?.zone ?? null;

  const runCheck = useCallback(async () => {
    setIsRunning(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/tools/quick-site-check-lep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: QuickSiteCheckLepResponse = await response.json();

      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Unable to run Quick Site Check" : payload.message;
        const chatMessage = `Quick Site Check (LEP only) could not run: ${message ?? "Unknown error"}`;
        onAddMessage(chatMessage);
        setStatusMessage(message ?? "Unable to run Quick Site Check");
        return;
      }

      const chatContent = buildChatMessage(payload);
      onAddMessage(chatContent, { lga: payload.lga, zone: payload.zone ?? undefined });
      setStatusMessage("Sent to chat.");
    } catch (error) {
      console.error("[quick-site-check-lep] client error", error);
      const message = "Unable to run Quick Site Check right now.";
      onAddMessage(`Quick Site Check (LEP only) could not run: ${message}`);
      setStatusMessage(message);
    } finally {
      setIsRunning(false);
    }
  }, [onAddMessage, projectId]);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-slate-600">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/30">
          <Sparkles className="h-4 w-4 text-slate-900 dark:text-slate-100" />
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
          Free
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Quick Site Check (LEP only)</p>
      <p className="text-xs text-slate-500 dark:text-slate-300">Zoning + LEP clauses snapshot to chat.</p>

      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-300">
        <p>{siteContext?.formattedAddress ?? "No site set yet"}</p>
        {siteContext?.lgaName ? <p>{siteContext.lgaName}</p> : null}
        {zoneLabel ? <p className="font-semibold text-slate-700 dark:text-slate-100">{zoneLabel}</p> : null}
      </div>

      <button
        type="button"
        onClick={runCheck}
        disabled={isRunning}
        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
      >
        {isRunning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Run check & send to chat
      </button>

      {statusMessage ? (
        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-200">{statusMessage}</p>
      ) : null}
    </div>
  );
}

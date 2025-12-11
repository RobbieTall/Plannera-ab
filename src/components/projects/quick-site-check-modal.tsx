"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, Sparkles } from "lucide-react";

import { useAuthGuard } from "@/components/providers/auth-guard-provider";
import { Modal } from "@/components/ui/modal";
import type { QuickSiteCheckLepResponse, QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";
import type { QuickSiteCheckArtefactRequest, QuickSiteCheckReport } from "@/types/quick-site-check";
import type { WorkspaceSessionSignals } from "@/types/workspace";

type QuickSiteCheckModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onInsertToChat?: (message: string, signals?: WorkspaceSessionSignals) => void;
  onArtefactSaved?: (title: string, summary: string) => void;
  onToast?: (message: string, variant?: "success" | "error") => void;
};

const formatList = (items: string[]) => (items.length ? items : ["None listed."]);

const buildChatMessage = (payload: QuickSiteCheckLepSuccess) => {
  const heading = payload.zone
    ? `Quick Site Check (LEP only) for zone ${payload.zone}`
    : "Quick Site Check (LEP only)";
  const sections = [
    `${heading}\nLGA: ${payload.lga} • LEP: ${payload.lepName}`,
    "",
    "Zone objectives:",
    ...formatList(payload.zoneObjectives).map((item) => `- ${item}`),
    "",
    "Land use table:",
    "Permitted without consent:",
    ...formatList(payload.permittedWithoutConsent).map((item) => `- ${item}`),
    "Permitted with consent:",
    ...formatList(payload.permittedWithConsent).map((item) => `- ${item}`),
    "Prohibited:",
    ...formatList(payload.prohibited).map((item) => `- ${item}`),
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
      ...clauses.map((clause) => `- ${clause.clauseNumber} ${clause.heading} – ${clause.textSnippet}`.trim()),
    );
  });

  return sections.filter(Boolean).join("\n");
};

const buildArtefactTitle = (payload: QuickSiteCheckLepSuccess) => {
  if (payload.zone) {
    return `Quick Site Check (LEP only) – ${payload.lepName} – Zone ${payload.zone}`;
  }
  return `Quick Site Check (LEP only) – ${payload.lepName}`;
};

const buildReportFromResult = (projectId: string, payload: QuickSiteCheckLepSuccess): QuickSiteCheckReport => {
  const placeholderControl = (label: string) => ({
    label,
    value: null,
    present: false,
    interpretation: "Not assessed in LEP-only quick site check.",
  });

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    site: {
      lga: payload.lga,
      zoneCode: payload.zone,
      zoneLabel: payload.zone ? `Zone ${payload.zone}` : null,
    },
    lepInstrument: {
      name: payload.lepName,
      lga: payload.lga,
      source: "ingestion",
    },
    permissibility: {
      zoneLabel: payload.zone ? `Zone ${payload.zone}` : null,
      permittedWithoutConsent: payload.permittedWithoutConsent,
      permittedWithConsent: payload.permittedWithConsent,
      prohibited: payload.prohibited,
      interpretation: "Extracted from LEP zone table (permitted uses and prohibitions).",
    },
    controls: {
      heightOfBuilding: placeholderControl("Height of buildings"),
      floorSpaceRatio: placeholderControl("Floor space ratio"),
      minimumLotSize: placeholderControl("Minimum lot size"),
    },
    notes: payload.zoneObjectives,
    nextSteps: [
      "Review highlighted LEP clauses (Parts 4–6).",
      payload.zone
        ? `Confirm mapping overlays and constraints for zone ${payload.zone}.`
        : "Confirm zoning and rerun Quick Site Check.",
    ],
  };
};

export function QuickSiteCheckModal({
  open,
  onClose,
  projectId,
  onInsertToChat,
  onArtefactSaved,
  onToast,
}: QuickSiteCheckModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickSiteCheckLepSuccess | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { requireAuth } = useAuthGuard();

  const hasResult = Boolean(result);

  const lepHeading = useMemo(() => {
    if (!result) return null;
    const zone = result.zone ? `Zone ${result.zone}` : "Zone pending";
    return `${result.lepName} • ${zone}`;
  }, [result]);

  const runCheck = useCallback(async () => {
    if (!projectId) return;
    setStatus("loading");
    setError(null);
    setSaveError(null);
    try {
      const response = await fetch("/api/tools/quick-site-check-lep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: QuickSiteCheckLepResponse = await response.json();

      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Unable to run Quick Site Check" : payload.message;
        setError(message ?? "Unable to run Quick Site Check");
        setResult(null);
        setStatus("error");
        return;
      }

      setResult(payload);
      setStatus("idle");
    } catch (err) {
      console.error("[quick-site-check-lep] modal error", err);
      setError("Unable to run Quick Site Check right now.");
      setResult(null);
      setStatus("error");
    }
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    runCheck();
  }, [open, runCheck]);

  const handleInsertToChat = () => {
    if (!result || !onInsertToChat) return;
    const message = buildChatMessage(result);
    onInsertToChat(message, { lga: result.lga, zone: result.zone ?? undefined });
  };

  const handleSaveArtefact = useCallback(() => {
    if (!result) return;

    const save = async () => {
      setIsSaving(true);
      setSaveError(null);
      try {
        const summary = buildChatMessage(result);
        const title = buildArtefactTitle(result);
        const report = buildReportFromResult(projectId, result);
        const payload: QuickSiteCheckArtefactRequest = {
          projectId,
          title,
          type: "quick_site_check",
          report,
        };

        const response = await fetch(`/api/projects/${projectId}/artefacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to save artefact");
        }

        onArtefactSaved?.(title, summary);
        onToast?.("Saved Quick Site Check as artefact");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to save artefact";
        setSaveError(message);
        onToast?.(message, "error");
      } finally {
        setIsSaving(false);
      }
    };

    requireAuth(save);
  }, [onArtefactSaved, onToast, projectId, requireAuth, result]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick Site Check (LEP only)"
      description="LEP-only summary of zoning and land use controls."
      size="lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-200">
          {lepHeading ? <p className="font-semibold text-slate-900 dark:text-slate-100">{lepHeading}</p> : null}
          {result?.lga ? <p className="text-slate-500 dark:text-slate-300">LGA: {result.lga}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runCheck}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
          >
            {status === "loading" ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {hasResult ? "Re-run check" : "Run check"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
          >
            Close
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Running Quick Site Check…</p>
      ) : null}

      {status === "error" && error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {!result && status === "idle" && !error ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Run Quick Site Check to view zoning and LEP clauses.</p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Zone objectives</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {formatList(result.zoneObjectives).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Land use table</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Permitted without consent</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-200">
                  {formatList(result.permittedWithoutConsent).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Permitted with consent</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-200">
                  {formatList(result.permittedWithConsent).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">Prohibited</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-200">
                  {formatList(result.prohibited).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {([
              { label: "Part 4 – Principal development standards", clauses: result.part4Clauses },
              { label: "Part 5 – Miscellaneous provisions", clauses: result.part5Clauses },
              { label: "Part 6 – Local provisions", clauses: result.part6Clauses },
            ] as const).map(({ label, clauses }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                {clauses.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    {clauses.map((clause) => (
                      <li key={`${clause.part}-${clause.clauseNumber}`}>
                        <span className="font-semibold">{clause.clauseNumber}</span> – {clause.heading} — {clause.textSnippet}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">No clauses highlighted for this part.</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveArtefact}
              disabled={isSaving || status === "loading"}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
            >
              {isSaving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Save as artefact"}
            </button>

            {onInsertToChat ? (
              <button
                type="button"
                onClick={handleInsertToChat}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
              >
                <Sparkles className="h-4 w-4" />
                Insert summary into chat
              </button>
            ) : null}
          </div>
          {saveError ? (
            <p className="text-sm text-rose-600 dark:text-rose-300">{saveError}</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

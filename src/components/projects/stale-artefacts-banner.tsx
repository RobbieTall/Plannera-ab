"use client";

import { Check, RefreshCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StaleArtefact = {
  id: string;
  type: string;
  staleAt: string;
  createdAt: string;
};

type RegenerationState = "idle" | "loading" | "success" | "error";

const ARTEFACT_LABELS: Record<string, string> = {
  quick_site_check: "Quick Site Check",
  pre_see_planning_memo: "Planning Memo",
  detailed_planning_pack: "Detailed Planning Pack",
};

export function StaleArtefactsBanner({ projectId }: { projectId: string }) {
  const [staleArtefacts, setStaleArtefacts] = useState<StaleArtefact[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [regenerationState, setRegenerationState] = useState<Record<string, RegenerationState>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadStaleArtefacts() {
      try {
        const response = await fetch(`/api/projects/${projectId}/artefacts/stale`);
        if (!response.ok) return;

        const data = (await response.json()) as { staleArtefacts?: StaleArtefact[] };
        if (!cancelled) {
          setStaleArtefacts(data.staleArtefacts ?? []);
        }
      } catch (error) {
        console.error("[stale-artefacts-banner] Unable to load stale artefacts", error);
      }
    }

    void loadStaleArtefacts();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const artefactsByType = useMemo(() => {
    const grouped = new Map<string, StaleArtefact>();
    for (const artefact of staleArtefacts) {
      if (!grouped.has(artefact.type)) {
        grouped.set(artefact.type, artefact);
      }
    }
    return Array.from(grouped.values());
  }, [staleArtefacts]);

  async function regenerateArtefact(artefact: StaleArtefact) {
    setRegenerationState((current) => ({ ...current, [artefact.id]: "loading" }));

    try {
      const response = await fetch(`/api/projects/${projectId}/artefacts/${artefact.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artefactType: artefact.type }),
      });

      if (!response.ok) {
        throw new Error("Regeneration failed");
      }

      setRegenerationState((current) => ({ ...current, [artefact.id]: "success" }));
      setStaleArtefacts((current) => current.filter((item) => item.type !== artefact.type));
    } catch (error) {
      console.error("[stale-artefacts-banner] Unable to regenerate artefact", error);
      setRegenerationState((current) => ({ ...current, [artefact.id]: "error" }));
    }
  }

  if (dismissed || artefactsByType.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">
          <RefreshCcw className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Local planning controls are now available.</p>
          <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-100/80">
            Regenerate your {artefactsByType.map((artefact) => ARTEFACT_LABELS[artefact.type] ?? artefact.type).join(" and ")} for up-to-date results.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {artefactsByType.map((artefact) => {
              const state = regenerationState[artefact.id] ?? "idle";
              const isLoading = state === "loading";
              const isSuccess = state === "success";

              return (
                <button
                  key={artefact.id}
                  type="button"
                  onClick={() => void regenerateArtefact(artefact)}
                  disabled={isLoading || isSuccess}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:border-amber-500 hover:text-amber-950 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-400/40 dark:bg-slate-950/40 dark:text-amber-100"
                >
                  {isLoading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" /> : null}
                  {isSuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
                  {isSuccess ? "Regenerated" : `Regenerate ${ARTEFACT_LABELS[artefact.type] ?? "artefact"}`}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-950 dark:text-amber-100 dark:hover:bg-amber-400/20"
          aria-label="Dismiss stale artefacts prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

import * as React from "react";

import type {
  PathwayEvidenceRequest,
  PathwayEvidenceRequestKind,
} from "@/lib/pathway-evidence-checklist";

type PathwayEvidenceChecklistPanelProps = {
  items: PathwayEvidenceRequest[];
};

const kindLabel: Record<PathwayEvidenceRequestKind, string> = {
  AUTHORITATIVE_ROAD_CLASSIFICATION: "Road evidence",
  REVIEWED_SITE_MEASUREMENTS: "Survey and layout",
  CURRENT_SOURCE: "Current source",
  CURRENT_CONTROL: "Current control",
  GATE_EVIDENCE: "Gate evidence",
};

const gateLabel = (orders: number[]) =>
  orders
    .map((order) => `Gate ${String(order).padStart(2, "0")}`)
    .join(", ");

export function PathwayEvidenceChecklistPanel({
  items,
}: PathwayEvidenceChecklistPanelProps) {
  if (!items.length) return null;

  return (
    <section
      aria-labelledby="pathway-evidence-checklist-heading"
      className="mt-4 rounded-xl border border-amber-300 bg-amber-100/70 p-4 dark:border-amber-800 dark:bg-amber-950/50"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-100">
        Evidence checklist
      </p>
      <h4
        id="pathway-evidence-checklist-heading"
        className="mt-1 text-base font-semibold text-amber-950 dark:text-amber-50"
      >
        What to provide next
      </h4>
      <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-100">
        These requests come from the saved blocking gates. They do not predict
        approval or unlock a paid output.
      </p>

      <ol className="mt-3 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-amber-200 bg-white/80 p-3 dark:border-amber-900/60 dark:bg-slate-950/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-100">
                {kindLabel[item.kind]}
              </span>
              {item.blockingGateOrders.length ? (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                  {gateLabel(item.blockingGateOrders)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
              {item.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {item.why}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">
              <strong>Provide:</strong> {item.provide}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs leading-5 text-amber-900 dark:text-amber-100">
        A$49 and A$749 outputs remain locked until the required evidence is
        reviewed against the same confirmed site and proposal.
      </p>
    </section>
  );
}

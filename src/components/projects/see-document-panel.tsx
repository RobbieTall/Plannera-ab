"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

interface SeeDocumentPanelProps {
  content: WorkspacePreSeePlanningMemoContent;
  generatedAt?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function buildPlainText(c: WorkspacePreSeePlanningMemoContent): string {
  const lines: string[] = [];
  lines.push("STATEMENT OF ENVIRONMENTAL EFFECTS");
  lines.push("=".repeat(60));
  lines.push(`Site: ${c.siteDescription.address ?? "Unknown"}`);
  lines.push(
    `Zone: ${c.siteDescription.zoneName ?? ""} (${c.siteDescription.zoneCode ?? ""})`,
  );
  lines.push(`LGA: ${c.siteDescription.lga ?? ""}`);
  lines.push(`Generated: ${c.generatedAt}`);
  lines.push("");
  lines.push("1. DESCRIPTION OF PROPOSED WORKS");
  lines.push("-".repeat(40));
  lines.push(c.proposedWorksSummary ?? "");
  lines.push("");

  const ctrl = c.applicableControls;
  if (ctrl?.lepInstrument?.name) {
    lines.push("2. APPLICABLE LEP INSTRUMENT");
    lines.push("-".repeat(40));
    lines.push(ctrl.lepInstrument.name);
    if (ctrl.permissibility?.landUse) {
      lines.push(`Land Use: ${ctrl.permissibility.landUse}`);
      lines.push(`Permissibility: ${ctrl.permissibility.status ?? ""}`);
      if (ctrl.permissibility.interpretation)
        lines.push(`Note: ${ctrl.permissibility.interpretation}`);
    }
    lines.push("");
  }

  const controlKeys = Object.keys(ctrl?.quickSiteControls ?? {});
  if (controlKeys.length > 0) {
    lines.push("3. KEY DEVELOPMENT STANDARDS");
    lines.push("-".repeat(40));
    for (const key of controlKeys) {
      const s = ctrl.quickSiteControls[key];
      lines.push(`${s.label ?? key}: ${s.value ?? "—"}`);
      if (s.interpretation) lines.push(`   ${s.interpretation}`);
    }
    lines.push("");
  }

  const clauses = ctrl?.dcpClauses ?? [];
  if (clauses.length > 0) {
    lines.push("4. RELEVANT DCP CLAUSES");
    lines.push("-".repeat(40));
    for (const cl of clauses) {
      lines.push(`[${cl.ref ?? "?"}] ${cl.title ?? ""}`);
      if (cl.bodyText) lines.push(cl.bodyText.substring(0, 400));
      lines.push("");
    }
  }

  if (c.consistencyAssessment?.length) {
    lines.push("5. CONSISTENCY ASSESSMENT");
    lines.push("-".repeat(40));
    for (const item of c.consistencyAssessment) {
      lines.push(`${item.topic}:`);
      lines.push(`  ${item.assessment}`);
      if (item.citations?.length) {
        lines.push(`  Sources: ${item.citations.map((citation) => `${citation.ref} (${citation.type})`).join("; ")}`);
      }
    }
    lines.push("");
  }

  if (c.limitations?.length) {
    lines.push("6. LIMITATIONS");
    lines.push("-".repeat(40));
    for (const lim of c.limitations) lines.push(`- ${lim}`);
  }
  return lines.join("\n");
}

const SECTION_COUNT = 7;

export function SeeDocumentPanel({
  content,
  generatedAt,
  onRegenerate,
  isRegenerating,
}: SeeDocumentPanelProps) {
  const [visibleSections, setVisibleSections] = useState(1);
  const [copied, setCopied] = useState(false);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleClause = (clauseId: string) => {
    setExpandedClauses((current) => {
      const next = new Set(current);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  };

  useEffect(() => {
    if (visibleSections >= SECTION_COUNT) return;
    const t = setTimeout(() => setVisibleSections((v) => v + 1), 400);
    return () => clearTimeout(t);
  }, [visibleSections]);

  const plainText = buildPlainText(content);
  const ctrl = content.applicableControls;
  const clauses = ctrl?.dcpClauses ?? [];
  const controlKeys = Object.keys(ctrl?.quickSiteControls ?? {});

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      // Clipboard access can be unavailable in some browsers; keep the UI non-blocking.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([plainText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = (content.siteDescription.address ?? "see")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    a.download = `see-${slug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const show = (idx: number) => visibleSections > idx;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm">
      {show(0) && (
        <div className="flex flex-col gap-3 border-b border-slate-700 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Statement of Environmental Effects
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {content.siteDescription.address}
              {content.siteDescription.zoneName
                ? ` · ${content.siteDescription.zoneName}`
                : ""}
              {generatedAt
                ? ` · ${new Date(generatedAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5 border-slate-600 text-slate-300 hover:text-white"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-1.5 border-slate-600 text-slate-300 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" /> Download .txt
            </Button>
            {onRegenerate && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="gap-1.5 border-slate-600 text-slate-300 hover:text-white"
              >
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </Button>
            )}
          </div>
        </div>
      )}

      {show(1) && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            1. Proposed Works
          </h3>
          <p className="leading-relaxed text-slate-200">
            {content.proposedWorksSummary}
          </p>
        </section>
      )}

      {show(2) && ctrl?.lepInstrument?.name && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            2. Applicable LEP Instrument
          </h3>
          <p className="text-slate-200">{ctrl.lepInstrument.name}</p>
          {ctrl.permissibility?.landUse && (
            <div className="mt-2 rounded-md bg-slate-800 px-3 py-2 text-xs">
              <span className="text-slate-400">Land Use: </span>
              <span className="text-white">{ctrl.permissibility.landUse}</span>
              {ctrl.permissibility.status && (
                <>
                  {" "}
                  ·{" "}
                  <span
                    className={`font-semibold ${
                      ctrl.permissibility.status === "permitted_with_consent"
                        ? "text-amber-400"
                        : ctrl.permissibility.status ===
                            "permitted_without_consent"
                          ? "text-green-400"
                          : "text-red-400"
                    }`}
                  >
                    {ctrl.permissibility.status.replace(/_/g, " ")}
                  </span>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {show(3) && controlKeys.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            3. Key Development Standards
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {controlKeys.map((key) => {
              const s = ctrl.quickSiteControls[key];
              return (
                <div
                  key={key}
                  className="rounded-md bg-slate-800 px-3 py-2 text-xs"
                >
                  <p className="text-slate-400">{s.label ?? key}</p>
                  <p className="font-medium text-white">{s.value ?? "—"}</p>
                  {s.interpretation && (
                    <p className="mt-0.5 text-slate-400">{s.interpretation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {show(4) && clauses.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            4. Relevant DCP Clauses
          </h3>
          {clauses.map((cl, i) => {
            const clauseId = `dcp-clause-${i}`;
            const expanded = expandedClauses.has(clauseId);
            const canExpand = (cl.bodyText?.length ?? 0) > 180;

            return (
              <article
                key={`${cl.ref ?? "clause"}-${i}`}
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-3 text-xs transition-colors duration-300 hover:border-slate-600"
              >
                <p className="font-semibold text-white">
                  [{cl.ref ?? "?"}] {cl.title}
                </p>
                {cl.headingPath && cl.headingPath.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {cl.headingPath.join(" › ")}
                  </p>
                )}
                {cl.bodyText && (
                  <div
                    id={clauseId}
                    className={`relative mt-2 overflow-hidden transition-[max-height] duration-500 ease-out ${expanded ? "max-h-[80rem]" : "max-h-16"}`}
                  >
                    <p className="leading-5 text-slate-300">{cl.bodyText}</p>
                    {!expanded && canExpand ? (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-800 to-transparent" />
                    ) : null}
                  </div>
                )}
                {canExpand ? (
                  <button
                    type="button"
                    aria-controls={clauseId}
                    aria-expanded={expanded}
                    onClick={() => toggleClause(clauseId)}
                    className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full border border-slate-600 px-3 py-1.5 font-medium text-sky-300 transition-colors duration-200 hover:border-sky-400 hover:bg-sky-400/10 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                    />
                    {expanded ? "Show less" : "Read full clause"}
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      {show(5) && (content.consistencyAssessment?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            5. Consistency Assessment
          </h3>
          {content.consistencyAssessment.map((item, i) => (
            <div
              key={`${item.topic}-${i}`}
              className="rounded-md bg-slate-800/50 px-3 py-2 text-xs"
            >
              <p className="font-semibold text-white">{item.topic}</p>
              <p className="mt-0.5 text-slate-300">{item.assessment}</p>
              {item.citations?.length ? (
                <p className="mt-1 text-[10px] text-slate-500">
                  Sources: {item.citations.map((citation) => `${citation.ref} (${citation.type})`).join("; ")}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      )}

      {show(6) && (content.limitations?.length ?? 0) > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            6. Limitations
          </h3>
          <ul className="space-y-0.5">
            {content.limitations.map((lim, i) => (
              <li
                key={`${lim}-${i}`}
                className="flex gap-2 text-xs text-slate-400"
              >
                <span className="shrink-0">•</span>
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visibleSections < SECTION_COUNT && (
        <div className="animate-pulse space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-slate-800" />
          ))}
        </div>
      )}
    </div>
  );
}

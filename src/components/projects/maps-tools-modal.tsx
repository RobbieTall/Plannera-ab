"use client";

import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Globe2, MapPin } from "lucide-react";

import { getLgaMapInfo, NSW_SPATIAL_VIEWER_URL } from "@/lib/lga-map-registry";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import type { SiteContextSummary } from "@/types/site";

interface MapsToolsModalProps {
  open: boolean;
  onClose: () => void;
  siteContext: SiteContextSummary | null;
}

const externalTools = [
  {
    label: "NSW Spatial Viewer (fallback)",
    href: NSW_SPATIAL_VIEWER_URL,
  },
  {
    label: "NSW Planning Portal (external)",
    href: "https://www.planningportal.nsw.gov.au",
  },
  {
    label: "NSW SEED Environment Explorer",
    href: "https://experience.arcgis.com/experience/51f9f0e3414047c9aa6f9e9f69e2e38f",
  },
];

export function MapsToolsModal({ open, onClose, siteContext }: MapsToolsModalProps) {
  const hasSite = Boolean(siteContext);
  const address = siteContext?.formattedAddress ?? siteContext?.addressInput ?? null;
  const lgaName = siteContext?.lgaName ?? null;
  const councilMapInfo = getLgaMapInfo(lgaName);
  const councilMapUrl = councilMapInfo?.primaryMapUrl ?? null;
  const hasCouncilMap = useMemo(
    () => Boolean(councilMapUrl || (councilMapInfo?.fallbackMapUrls?.length ?? 0) > 0),
    [councilMapInfo?.fallbackMapUrls?.length, councilMapUrl]
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const handleOpenCouncilMap = useCallback(async () => {
    if (!hasSite || !hasCouncilMap || !lgaName) return;

    setIsResolving(true);
    try {
      const response = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lgaName }),
      });

      if (!response.ok) {
        throw new Error("Unable to resolve council map");
      }

      const data: {
        resolvedUrl: string | null;
        fallbackUsed: boolean;
        source: string;
      } = await response.json();

      if (data.source === "nsw_spatial_viewer") {
        showToast("Council map unavailable. Opening NSW Spatial Viewer instead.");
      }

      if (data.resolvedUrl) {
        window.open(data.resolvedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      showToast("Council map unavailable. Opening NSW Spatial Viewer instead.");
      window.open(NSW_SPATIAL_VIEWER_URL, "_blank", "noopener,noreferrer");
    } finally {
      setIsResolving(false);
    }
  }, [hasCouncilMap, hasSite, lgaName, showToast]);

  const councilMapMessage = !hasSite
    ? "Set a site to view council mapping tools."
    : !hasCouncilMap
      ? "No council map available for this LGA."
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Maps & external tools"
      description="Open council GIS and planning resources for this project."
      size="lg"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">How to use this tool</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">
            Use your council’s interactive map to check:
          </p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-100">
            <li>Bushfire-prone land</li>
            <li>Flooding</li>
            <li>Coastal hazards</li>
            <li>Ecology or environmental constraints</li>
            <li>Lot boundaries & overlays</li>
          </ul>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">
            Tip: You can take screenshots and paste them into Plannera, then save them as artefacts for your project.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-100">
            <MapPin className="h-4 w-4" />
            <span className={cn(!address && "text-slate-400 dark:text-slate-500")}>{address ?? "No address set"}</span>
            {lgaName ? <span className="text-slate-400">• {lgaName}</span> : null}
          </div>
          {councilMapMessage ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{councilMapMessage}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Council mapping</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Launch the local GIS for this project’s LGA.</p>
              {lgaName ? <p className="text-xs text-slate-400">Council: {lgaName}</p> : null}
            </div>
            <button
              type="button"
              onClick={handleOpenCouncilMap}
              disabled={!hasSite || !hasCouncilMap || isResolving}
              title={!hasCouncilMap ? "No council map available for this LGA." : undefined}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              <Globe2 className="h-4 w-4" />
              {isResolving ? "Checking map..." : "Open council map"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">External Tools</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Quick links to NSW planning and environment maps.</p>
          <ul className="mt-3 space-y-2">
            {externalTools.map((tool) => (
              <li key={tool.href}>
                <a
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                  href={tool.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{tool.label}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {toastMessage ? (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
          {toastMessage}
        </div>
      ) : null}
    </Modal>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { fetchSavedSeeFile, fetchSavedSeeVersions } from "@/lib/see-document-download-client";
import type { SavedSeeFormat, SavedSeeVersion } from "@/lib/see-document-version-summary";

const actionClass = "min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800";

/** Mount with a project key so changing workspaces cannot retain another project's versions. */
export function WorkingSeeDownloads({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<SavedSeeVersion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setBusy(true);
    setVersions([]);
    setCursor(null);
    setMessage(null);
    fetchSavedSeeVersions(projectId, null, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setVersions(page.versions);
        setCursor(page.nextCursor);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage("Saved documents are unavailable. Please sign in or try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { controller.abort(); requestRef.current?.abort(); };
  }, [projectId, revision]);

  const loadMore = async () => {
    if (!cursor || busy) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setMessage(null);
    try {
      const page = await fetchSavedSeeVersions(projectId, cursor, controller.signal);
      if (controller.signal.aborted) return;
      setVersions((current) => [...current, ...page.versions.filter(
        (item) => !current.some((saved) => saved.versionId === item.versionId),
      )]);
      setCursor(page.nextCursor);
    } catch {
      if (!controller.signal.aborted) setMessage("More versions could not be loaded. Please try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const download = async (version: SavedSeeVersion, format: SavedSeeFormat) => {
    if (busy) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setMessage(null);
    try {
      const file = await fetchSavedSeeFile(version, format, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([file.bytes], { type: file.mimeType }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(format + " download requested. Open the saved file from your browser downloads.");
    } catch {
      if (!controller.signal.aborted) setMessage("Download unavailable. Refresh the list or sign in again; access is checked for each download.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <section aria-label="Saved Word and PDF documents" aria-busy={busy} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Saved Word and PDF versions</h3>
        <button type="button" className={actionClass} disabled={busy} onClick={() => setRevision((value) => value + 1)}>Refresh list</button>
      </div>
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
        These downloads reopen the original saved files, not a new assessment.
        Older versions may not include later plans or evidence. All are working documents, not submission-ready.
      </p>
      {message ? <p role="status" className="text-sm text-amber-800 dark:text-amber-200">{message}</p> : null}
      {busy ? <p role="status" className="text-xs text-slate-500">Loading protected documents...</p> : null}
      {!busy && !message && versions.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No accessible Word/PDF version is saved for this project yet. The planning memo and its text export are separate.
        </p>
      ) : null}
      {versions.map((version) => (
        <article key={version.versionId} className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="space-y-1">
            <p className="break-words font-medium text-slate-900 dark:text-slate-100">{version.documentReference}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {version.council} | Generated <time dateTime={version.generatedAt}>{new Date(version.generatedAt).toLocaleString()}</time>
            </p>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              {version.evidenceStatus === "MORE_EVIDENCE_REQUIRED" ? "More evidence required" : "Evidence recorded; final review still required"}
            </p>
          </div>
          <details className="text-xs text-slate-600 dark:text-slate-300">
            <summary className="min-h-8 cursor-pointer py-1 font-medium">Evidence warnings and version details</summary>
            <ul className="list-disc space-y-1 pl-5">{version.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            <dl className="mt-3 space-y-1 break-all">
              <div><dt className="font-medium">Version</dt><dd>{version.versionId}</dd></div>
              <div><dt className="font-medium">Renderer</dt><dd>{version.rendererVersion}</dd></div>
              <div><dt className="font-medium">Source planning pack</dt><dd>{version.sourceDetailedPlanningPackArtefactId}</dd></div>
              <div><dt className="font-medium">Source site check</dt><dd>{version.sourceQuickSiteCheckArtefactId}</dd></div>
            </dl>
          </details>
          <div className="flex flex-wrap gap-2">
            {(["DOCX", "PDF"] as const).map((format) => (
              <button key={format} type="button" className={actionClass} disabled={busy}
                onClick={() => void download(version, format)}
                aria-label={"Download " + format + " " + version.documentReference + " version " + version.versionId.slice(0, 12)}>
                Download {format === "DOCX" ? "Word (.docx)" : "PDF"}
              </button>
            ))}
          </div>
        </article>
      ))}
      {cursor ? <button type="button" className={actionClass} disabled={busy} onClick={() => void loadMore()}>Load older saved versions</button> : null}
    </section>
  );
}

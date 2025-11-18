"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import Image from "next/image";

import { cn, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { X } from "lucide-react";

interface MapSnapshotsPanelProps {
  projectId: string;
  projectName: string;
  onToast: (message: string, variant?: "success" | "error") => void;
  onClose?: () => void;
}

interface MapSnapshotArtefact {
  id: string;
  projectId: string;
  type: "map_snapshot";
  title: string;
  source: string;
  sourceUrl?: string | null;
  overlays: string[];
  notes?: string | null;
  imageUrl: string;
  capturedAt: string;
  createdAt: string;
}

const overlayOptions = [
  "Bushfire",
  "Flood",
  "Heritage",
  "Biodiversity / Ecological",
  "Zoning",
  "Contours / Topography",
];

const externalLinks = [
  {
    label: "Open NSW Spatial Viewer",
    href: "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address",
  },
  { label: "Open Council Web Map", href: "https://example.com/council-map" },
];

function getDefaultTitle(projectName: string) {
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Map snapshot – ${projectName} – ${today}`;
}

export function MapSnapshotsPanel({ projectId, projectName, onToast, onClose }: MapSnapshotsPanelProps) {
  const [snapshots, setSnapshots] = useState<MapSnapshotArtefact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeSnapshot, setActiveSnapshot] = useState<MapSnapshotArtefact | null>(null);

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("NSW Spatial Viewer");
  const [otherSource, setOtherSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [overlays, setOverlays] = useState<string[]>([]);
  const [includeOtherOverlay, setIncludeOtherOverlay] = useState(false);
  const [otherOverlay, setOtherOverlay] = useState("");
  const [notes, setNotes] = useState("");

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [snapshots],
  );

  const resetForm = useCallback(() => {
    setTitle(getDefaultTitle(projectName));
    setSource("NSW Spatial Viewer");
    setOtherSource("");
    setSourceUrl("");
    setOverlays([]);
    setIncludeOtherOverlay(false);
    setOtherOverlay("");
    setNotes("");
    setSubmitError(null);
  }, [projectName]);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/artefacts`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = response.status === 401 ? "Please sign in to view map snapshots." : data.error;
        throw new Error(message ?? "Unable to load map snapshots");
      }

      const artefacts: MapSnapshotArtefact[] = await response.json();
      setSnapshots(artefacts.filter((entry) => entry.type === "map_snapshot"));
    } catch (error) {
      console.error("Failed to load map snapshots", error);
      setLoadError("We couldn’t load map snapshots right now.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileSelection = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const file = fileList[0];
    setSelectedFile(file);
    setIsModalOpen(true);
    setTitle(getDefaultTitle(projectName));
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files);
  };

  const toggleOverlay = (value: string) => {
    setOverlays((previous) =>
      previous.includes(value) ? previous.filter((entry) => entry !== value) : [...previous, value],
    );
  };

  const resolvedSource = useMemo(() => {
    if (source !== "Other") return source;
    return otherSource.trim() ? otherSource.trim() : "Other";
  }, [otherSource, source]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setSubmitError("Please add an image before saving.");
      return;
    }
    if (!title.trim()) {
      setSubmitError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("title", title.trim());
    formData.append("source", resolvedSource);
    if (sourceUrl.trim()) {
      formData.append("sourceUrl", sourceUrl.trim());
    }
    const overlaysToSubmit = includeOtherOverlay && otherOverlay.trim()
      ? [...overlays, otherOverlay.trim()]
      : overlays;

    overlaysToSubmit.forEach((overlay) => formData.append("overlays", overlay));
    if (notes.trim()) {
      formData.append("notes", notes.trim());
    }
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`/api/projects/${projectId}/artefacts`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = response.status === 401 ? "Please sign in to save map snapshots." : data.error;
        throw new Error(message ?? "We couldn’t save this snapshot. Please try again.");
      }

      const created: MapSnapshotArtefact = await response.json();
      setSnapshots((previous) => [created, ...previous]);
      onToast("Map snapshot saved to Artefacts.");
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      resetForm();
    } catch (error) {
      console.error("Failed to create map snapshot", error);
      setSubmitError(error instanceof Error ? error.message : "We couldn’t save this snapshot. Please try again.");
      onToast("We couldn’t save this snapshot. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Maps & External Tools</p>
          <h2 className="text-lg font-semibold text-slate-900">Bring council maps into Plannera</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use council and NSW mapping tools to view zoning, bushfire, flood, heritage and other overlays. Take a screenshot
            and upload it here so Plannera can store it as a map snapshot for this project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {externalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
              >
                {link.label}
              </a>
            ))}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-900 hover:text-slate-900"
              aria-label="Close maps panel"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Add map snapshot</p>
              <p className="text-xs text-slate-500">Drag in a screenshot of your map view, or click to select an image file.</p>
            </div>
            {selectedFile ? (
              <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Ready to save
              </span>
            ) : null}
          </div>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 transition",
              isDragging ? "border-slate-900 bg-slate-50" : "hover:border-slate-900",
            )}
          >
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(event) => handleFileSelection(event.target.files)}
            />
            <p className="text-base font-semibold text-slate-900">Drop image</p>
            <p className="mt-1 text-sm text-slate-500">PNG and JPG files are supported.</p>
            <p className="mt-2 text-xs text-slate-400">Drag an image here, or click to browse.</p>
            {selectedFile ? (
              <p className="mt-3 text-xs text-emerald-700">Selected: {selectedFile.name}</p>
            ) : null}
          </label>
          {loadError ? <p className="text-xs text-rose-600">{loadError}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Map snapshots</h3>
            <button
              type="button"
              onClick={() => void fetchSnapshots()}
              className="text-xs font-semibold text-slate-600 underline underline-offset-2"
              disabled={isLoading}
            >
              {isLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {isLoading ? (
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <div className="h-24 rounded-xl bg-slate-100" />
              <div className="h-24 rounded-xl bg-slate-100" />
            </div>
          ) : sortedSnapshots.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No map snapshots yet. Upload a screenshot to start a collection for this project.
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {sortedSnapshots.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-900"
                  onClick={() => setActiveSnapshot(snapshot)}
                >
                  <div className="relative h-28 w-full overflow-hidden rounded-lg bg-slate-100">
                    <Image src={snapshot.imageUrl} alt={snapshot.title} fill className="object-cover transition group-hover:scale-105" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{snapshot.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{snapshot.source}</p>
                  {snapshot.overlays?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {snapshot.overlays.slice(0, 4).map((overlay) => (
                        <span
                          key={overlay}
                          className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {overlay}
                        </span>
                      ))}
                      {snapshot.overlays.length > 4 ? (
                        <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          +{snapshot.overlays.length - 4} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                    {formatDate(snapshot.capturedAt, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
          setPreviewUrl(null);
          resetForm();
        }}
        title="Save map snapshot"
        description="Add a title, overlays, and context so your map screenshot is stored as an artefact."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-[2fr,1fr]">
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                required
              />
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source</label>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option>NSW Spatial Viewer</option>
                <option>Council Web Map</option>
                <option>Other</option>
              </select>
              {source === "Other" ? (
                <input
                  type="text"
                  value={otherSource}
                  onChange={(event) => setOtherSource(event.target.value)}
                  placeholder="Enter source name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              ) : null}
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source URL (optional)</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
              <div className="mt-2 flex h-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Selected map snapshot" width={240} height={180} className="h-full w-full object-contain" />
                ) : (
                  <p className="px-4 text-center text-xs text-slate-500">Select an image to see a thumbnail.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overlays</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {overlayOptions.map((overlay) => (
                <label key={overlay} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={overlays.includes(overlay)}
                    onChange={() => toggleOverlay(overlay)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  {overlay}
                </label>
              ))}
              <div className="space-y-2 rounded-xl border border-slate-200 px-3 py-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeOtherOverlay}
                    onChange={(event) => {
                      setIncludeOtherOverlay(event.target.checked);
                      if (!event.target.checked) {
                        setOtherOverlay("");
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Other overlay
                </label>
                <input
                  type="text"
                  value={otherOverlay}
                  onChange={(event) => setOtherOverlay(event.target.value)}
                  placeholder="Describe other overlay"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={!includeOtherOverlay}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="E.g. ‘Zoomed to southern gully, including bushfire and flood overlays.’"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving…" : "Save snapshot"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                resetForm();
              }}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(activeSnapshot)}
        onClose={() => setActiveSnapshot(null)}
        title={activeSnapshot?.title ?? "Map snapshot"}
        description={activeSnapshot?.source ?? "Map snapshot"}
      >
        {activeSnapshot ? (
          <div className="space-y-4">
            <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image src={activeSnapshot.imageUrl} alt={activeSnapshot.title} fill className="object-contain" />
            </div>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
                <p className="mt-1 font-medium text-slate-900">{activeSnapshot.source}</p>
                {activeSnapshot.sourceUrl ? (
                  <a
                    href={activeSnapshot.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 underline underline-offset-2"
                  >
                    {activeSnapshot.sourceUrl}
                  </a>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Captured</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(activeSnapshot.capturedAt, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overlays</p>
              {activeSnapshot.overlays?.length ? (
                <div className="flex flex-wrap gap-2">
                  {activeSnapshot.overlays.map((overlay) => (
                    <span
                      key={overlay}
                      className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {overlay}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No overlays noted.</p>
              )}
            </div>
            {activeSnapshot.notes ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="text-sm text-slate-700">{activeSnapshot.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

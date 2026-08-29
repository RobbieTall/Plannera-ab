"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import Image from "next/image";

import { cn, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { AlertTriangle, Check, X, XCircle } from "lucide-react";
import { useAuthGuard } from "@/components/providers/auth-guard-provider";

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
  spatialEvidence?: {
    id: string;
    sourceAuthority: "NSW_GOVERNMENT" | "COUNCIL" | "CONSULTANT" | "SURVEYOR" | "USER_PROVIDED" | "OTHER";
    contentHash: string;
    siteFingerprint: string;
    siteAddress: string;
    layers: string[];
    legendStatus: "CAPTURED" | "SOURCE_LINKED" | "NOT_AVAILABLE" | "NOT_APPLICABLE";
    legendNotes?: string | null;
    observation: string;
    limitation: string;
    sourceEffectiveAt?: string | null;
    sourceCheckedAt: string;
    expiresAt: string;
    status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "CONFLICT" | "SUPERSEDED";
    reviewedAt?: string | null;
    reviewNote?: string | null;
  } | null;
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
];

const authorityOptions = [
  { value: "NSW_GOVERNMENT", label: "NSW Government" },
  { value: "COUNCIL", label: "Council" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "SURVEYOR", label: "Registered surveyor" },
  { value: "USER_PROVIDED", label: "User provided" },
  { value: "OTHER", label: "Other" },
] as const;

const spatialStatusLabels = {
  PENDING_REVIEW: "Pending review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CONFLICT: "Conflict",
  SUPERSEDED: "Superseded",
} as const;

const spatialStatusClasses = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  CONFLICT: "bg-red-100 text-red-800",
  SUPERSEDED: "bg-slate-100 text-slate-600",
} as const;

function getDefaultTitle(projectName: string) {
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Map snapshot – ${projectName} – ${today}`;
}

export function MapSnapshotsPanel({ projectId, projectName, onToast, onClose }: MapSnapshotsPanelProps) {
  const { requireAuth } = useAuthGuard();
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
  const [sourceAuthority, setSourceAuthority] = useState<(typeof authorityOptions)[number]["value"]>("NSW_GOVERNMENT");
  const [otherSource, setOtherSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [overlays, setOverlays] = useState<string[]>([]);
  const [includeOtherOverlay, setIncludeOtherOverlay] = useState(false);
  const [otherOverlay, setOtherOverlay] = useState("");
  const [notes, setNotes] = useState("");
  const [legendStatus, setLegendStatus] = useState<"CAPTURED" | "SOURCE_LINKED" | "NOT_AVAILABLE" | "NOT_APPLICABLE">("SOURCE_LINKED");
  const [legendNotes, setLegendNotes] = useState("");
  const [observation, setObservation] = useState("");
  const [limitation, setLimitation] = useState("");
  const [observationConfirmed, setObservationConfirmed] = useState(false);
  const [capturedAt, setCapturedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceEffectiveAt, setSourceEffectiveAt] = useState("");
  const [sourceCheckedAt, setSourceCheckedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reviewNote, setReviewNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [snapshots],
  );

  const resetForm = useCallback(() => {
    setTitle(getDefaultTitle(projectName));
    setSource("NSW Spatial Viewer");
    setSourceAuthority("NSW_GOVERNMENT");
    setOtherSource("");
    setSourceUrl("");
    setOverlays([]);
    setIncludeOtherOverlay(false);
    setOtherOverlay("");
    setNotes("");
    setLegendStatus("SOURCE_LINKED");
    setLegendNotes("");
    setObservation("");
    setLimitation("");
    setObservationConfirmed(false);
    setCapturedAt(new Date().toISOString().slice(0, 10));
    setSourceEffectiveAt("");
    setSourceCheckedAt(new Date().toISOString().slice(0, 10));
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

  const submitSnapshot = async () => {
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
    formData.append("sourceAuthority", sourceAuthority);
    if (sourceUrl.trim()) {
      formData.append("sourceUrl", sourceUrl.trim());
    }
    const overlaysToSubmit = includeOtherOverlay && otherOverlay.trim()
      ? [...overlays, otherOverlay.trim()]
      : overlays;

    overlaysToSubmit.forEach((overlay) => formData.append("overlays", overlay));
    formData.append("legendStatus", legendStatus);
    if (legendNotes.trim()) formData.append("legendNotes", legendNotes.trim());
    formData.append("observation", observation.trim());
    formData.append("limitation", limitation.trim());
    formData.append("observationConfirmed", String(observationConfirmed));
    formData.append("capturedAt", capturedAt);
    formData.append("sourceCheckedAt", sourceCheckedAt);
    if (sourceEffectiveAt) formData.append("sourceEffectiveAt", sourceEffectiveAt);
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requireAuth(submitSnapshot);
  };

  const reviewSnapshot = async (decision: "ACCEPT" | "REJECT" | "MARK_CONFLICT") => {
    if (!activeSnapshot) return;
    if (decision !== "ACCEPT" && !reviewNote.trim()) {
      setReviewError("Add a review note before rejecting evidence or marking a conflict.");
      return;
    }
    setIsReviewing(true);
    setReviewError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/artefacts/${activeSnapshot.id}/spatial-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision, note: reviewNote.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Unable to review spatial evidence");
      const updated = { ...activeSnapshot, spatialEvidence: data.spatialEvidence };
      setSnapshots((previous) => previous.map((snapshot) => snapshot.id === updated.id ? updated : snapshot));
      setActiveSnapshot(updated);
      setReviewNote("");
      onToast(decision === "ACCEPT" ? "Spatial evidence accepted." : decision === "REJECT" ? "Spatial evidence rejected." : "Spatial conflict recorded.");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to review spatial evidence");
    } finally {
      setIsReviewing(false);
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
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">{snapshot.source}</p>
                    {snapshot.spatialEvidence ? (
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", spatialStatusClasses[snapshot.spatialEvidence.status])}>
                        {spatialStatusLabels[snapshot.spatialEvidence.status]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Legacy</span>
                    )}
                  </div>
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
        description="Record the exact source, site, layers, observation and limitations before this image can be reviewed as evidence."
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
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source authority</label>
              <select
                value={sourceAuthority}
                onChange={(event) => setSourceAuthority(event.target.value as (typeof authorityOptions)[number]["value"])}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {authorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                required={sourceAuthority === "NSW_GOVERNMENT" || sourceAuthority === "COUNCIL" || legendStatus === "SOURCE_LINKED"}
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

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Captured
              <input type="date" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900" />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source checked
              <input type="date" value={sourceCheckedAt} onChange={(event) => setSourceCheckedAt(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900" />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Effective date
              <input type="date" value={sourceEffectiveAt} onChange={(event) => setSourceEffectiveAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900" />
            </label>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Legend evidence
              <select value={legendStatus} onChange={(event) => setLegendStatus(event.target.value as typeof legendStatus)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900">
                <option value="CAPTURED">Captured in image</option>
                <option value="SOURCE_LINKED">Available at source URL</option>
                <option value="NOT_AVAILABLE">Not available</option>
                <option value="NOT_APPLICABLE">Not applicable</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Legend note
              <input value={legendNotes} onChange={(event) => setLegendNotes(event.target.value)} required={legendStatus === "NOT_AVAILABLE" || legendStatus === "NOT_APPLICABLE"} placeholder="Legend location or reason" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observed on the map
              <textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows={4} required minLength={10} placeholder="State only what is visibly supported by the selected layer and legend." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900" />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Limitation
              <textarea value={limitation} onChange={(event) => setLimitation(event.target.value)} rows={4} required minLength={10} placeholder="Record scale, currency, boundary or interpretation limits." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900" />
            </label>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={observationConfirmed} onChange={(event) => setObservationConfirmed(event.target.checked)} required className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
            <span>I confirm the observation describes this exact captured map view and does not infer a constraint that is not visible in the source.</span>
          </label>

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
        onClose={() => {
          setActiveSnapshot(null);
          setReviewNote("");
          setReviewError(null);
        }}
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
            {activeSnapshot.spatialEvidence ? (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence state</p>
                    <p className="mt-1 text-sm text-slate-600">Bound to {activeSnapshot.spatialEvidence.siteAddress}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", spatialStatusClasses[activeSnapshot.spatialEvidence.status])}>
                    {spatialStatusLabels[activeSnapshot.spatialEvidence.status]}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observed</p>
                    <p className="mt-1 text-sm text-slate-800">{activeSnapshot.spatialEvidence.observation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Limitation</p>
                    <p className="mt-1 text-sm text-slate-800">{activeSnapshot.spatialEvidence.limitation}</p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Authority</p><p className="mt-1 text-slate-800">{authorityOptions.find((option) => option.value === activeSnapshot.spatialEvidence?.sourceAuthority)?.label ?? activeSnapshot.spatialEvidence.sourceAuthority}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legend</p><p className="mt-1 text-slate-800">{activeSnapshot.spatialEvidence.legendStatus.replaceAll("_", " ").toLowerCase()}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source checked</p><p className="mt-1 text-slate-800">{formatDate(activeSnapshot.spatialEvidence.sourceCheckedAt, { month: "short", day: "numeric", year: "numeric" })}</p></div>
                </div>
                {activeSnapshot.spatialEvidence.reviewNote ? (
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review note</p><p className="mt-1 text-sm text-slate-800">{activeSnapshot.spatialEvidence.reviewNote}</p></div>
                ) : null}
                {activeSnapshot.spatialEvidence.status !== "SUPERSEDED" ? (
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Review note</label>
                    <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} placeholder="Required for rejection or conflict; optional when accepting." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                    {reviewError ? <p className="text-sm text-rose-600">{reviewError}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button type="button" disabled={isReviewing} onClick={() => void reviewSnapshot("ACCEPT")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Check className="h-4 w-4" />Accept</button>
                      <button type="button" disabled={isReviewing} onClick={() => void reviewSnapshot("MARK_CONFLICT")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60"><AlertTriangle className="h-4 w-4" />Conflict</button>
                      <button type="button" disabled={isReviewing} onClick={() => void reviewSnapshot("REJECT")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 disabled:opacity-60"><XCircle className="h-4 w-4" />Reject</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="border-t border-slate-200 pt-4 text-sm text-slate-600">
                This legacy snapshot has no structured site, source, legend or review provenance and cannot support a final SEE.
              </div>
            )}
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

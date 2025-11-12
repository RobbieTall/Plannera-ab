"use client";

import { MouseEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

import type { Project } from "@/lib/mock-data";
import { formatDate, getStatusStyles } from "@/lib/utils";

interface ProjectDeleteModalProps {
  open: boolean;
  project: Project | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProjectDeleteModal({ open, project, isDeleting, onConfirm, onCancel }: ProjectDeleteModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!isMounted || !open || !project) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm sm:items-center"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-heading"
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h2 id="delete-project-heading" className="text-xl font-semibold text-slate-900">
              Delete {project.name}?
            </h2>
            <p className="text-sm text-slate-500">
              This will permanently remove the project and {project.tasks.length} related task(s). Tasks listed below will no
              longer appear on dashboards.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Tasks impacted</span>
            <span>{project.tasks.length}</span>
          </header>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
            {project.tasks.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">No active tasks are linked to this project.</li>
            ) : (
              project.tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">Due {formatDate(task.dueDate, { month: "short", day: "numeric" })}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyles(task.status)}`}>
                    {task.status.replace("-", " ")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              "Delete project"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

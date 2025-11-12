"use client";

import { useMemo } from "react";
import { Archive, Edit3, MoreHorizontal, Trash2 } from "lucide-react";

import type { Project } from "@/lib/mock-data";
import { cn, getPriorityStyles, getProjectStatusStyles } from "@/lib/utils";

interface ProjectHeaderProps {
  project: Project;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchiveDisabled?: boolean;
}

export function ProjectHeader({ project, onEdit, onArchive, onDelete, isArchiveDisabled }: ProjectHeaderProps) {
  const progressPercent = useMemo(() => Math.round(project.progress * 100), [project.progress]);

  return (
    <header className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-sm"
            style={{ backgroundColor: project.color }}
            aria-hidden="true"
          >
            {project.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", getProjectStatusStyles(project.status))}>
                {project.status.replace("-", " ")}
              </span>
              <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", getPriorityStyles(project.priority))}>
                {project.priority} priority
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{project.name}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">{project.description}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onArchive}
            disabled={project.status === "archived" || isArchiveDisabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
              project.status === "archived" || isArchiveDisabled
                ? "cursor-not-allowed opacity-50"
                : "hover:border-slate-300 hover:text-slate-900",
            )}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            {project.status === "archived" ? "Archived" : "Archive"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="mr-2 inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700"
            >
              #{tag}
            </span>
          ))}
        </span>
      </div>
    </header>
  );
}

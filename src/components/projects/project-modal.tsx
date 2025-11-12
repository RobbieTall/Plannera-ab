"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import type { Project, TeamMember } from "@/lib/mock-data";
import type { ProjectFormData } from "@/lib/project-form-schema";
import { ProjectForm, ProjectFormHandle } from "./project-form";

interface ProjectModalProps {
  open: boolean;
  mode: "create" | "edit";
  project?: Project | null;
  teamMembers: TeamMember[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectFormData) => Promise<void> | void;
  onDelete?: () => void;
}

const projectToFormData = (project: Project): ProjectFormData => ({
  name: project.name,
  description: project.description,
  status: project.status,
  priority: project.priority,
  startDate: project.startDate,
  endDate: project.endDate,
  progress: Math.round(project.progress * 100),
  teamMemberIds: project.teamMembers.map((member) => member.id),
  tags: project.tags,
  color: project.color,
});

export function ProjectModal({
  open,
  mode,
  project,
  teamMembers,
  isSubmitting,
  onClose,
  onSubmit,
  onDelete,
}: ProjectModalProps) {
  const formRef = useRef<ProjectFormHandle>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isRendered, setIsRendered] = useState(open);
  const [animationState, setAnimationState] = useState<"enter" | "exit">("enter");

  const requestClose = useCallback(() => {
    if (isDirty) {
      const shouldClose = window.confirm("You have unsaved changes. Close without saving?");
      if (!shouldClose) {
        return;
      }
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setIsDirty(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      requestAnimationFrame(() => setAnimationState("enter"));
      return;
    }
    setAnimationState("exit");
    const timeout = window.setTimeout(() => setIsRendered(false), 200);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        formRef.current?.submit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const nameField = document.getElementById("project-name");
      if (nameField instanceof HTMLInputElement) {
        nameField.focus();
      }
    }, 120);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, requestClose]);

  const initialValues = useMemo<ProjectFormData | undefined>(() => {
    if (!project) {
      return undefined;
    }
    return projectToFormData(project);
  }, [project]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const handleSubmit = async (values: ProjectFormData) => {
    await onSubmit(values);
    setIsDirty(false);
  };

  if (!isMounted || !isRendered) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm transition-opacity duration-200 sm:items-center ${animationState === "enter" ? "opacity-100" : "opacity-0"}`}
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-heading"
        className={`relative flex w-full max-w-5xl flex-col rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200 sm:rounded-3xl ${animationState === "enter" ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      >
        <button
          type="button"
          onClick={requestClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="pr-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {mode === "create" ? "Create project" : "Edit project"}
          </p>
          <h2 id="project-modal-heading" className="mt-2 text-xl font-semibold text-slate-900">
            {mode === "create" ? "Add a new project" : project?.name ?? "Update project"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Capture scope, team, and timeline in one place. Your updates will sync with dashboards instantly.
          </p>
        </header>

        <div className="mt-6 overflow-y-auto">
          <ProjectForm
            ref={formRef}
            mode={mode}
            project={project ?? null}
            teamMembers={teamMembers}
            initialValues={initialValues}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={requestClose}
            onDirtyChange={setIsDirty}
          />
        </div>

        {mode === "edit" && onDelete ? (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
            >
              Delete project
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

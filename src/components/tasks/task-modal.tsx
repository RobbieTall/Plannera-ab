"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import type { Project, Task, TeamMember } from "@/lib/mock-data";
import type { TaskFormValues } from "@/lib/task-form-schema";
import { defaultTaskFormValues } from "@/lib/task-form-schema";
import { cn } from "@/lib/utils";
import { TaskForm, TaskFormHandle } from "./task-form";

interface TaskModalProps {
  open: boolean;
  mode: "create" | "edit";
  task?: Task | null;
  projects: Project[];
  teamMembers: TeamMember[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  onDelete?: () => void;
}

export function TaskModal({
  open,
  mode,
  task,
  projects,
  teamMembers,
  isSubmitting,
  onClose,
  onSubmit,
  onDelete,
}: TaskModalProps) {
  const formRef = useRef<TaskFormHandle>(null);
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
  }, [open, requestClose]);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      requestAnimationFrame(() => setAnimationState("enter"));
      return;
    }
    setAnimationState("exit");
    const timeout = window.setTimeout(() => setIsRendered(false), 200);
    return () => window.clearTimeout(timeout);
  }, [open, requestClose]);

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
      const titleField = document.getElementById("task-title");
      if (titleField instanceof HTMLInputElement) {
        titleField.focus();
      }
    }, 120);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, requestClose]);

  const initialValues = useMemo<TaskFormValues>(() => {
    if (!task) {
      return { ...defaultTaskFormValues, tags: [] };
    }

    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate : null,
      projectId: task.projectId,
      assigneeId: task.assignee?.id ?? null,
      tags: task.tags ?? [],
      estimatedHours: task.estimatedHours ?? null,
    };
  }, [task]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const handleSubmit = async (values: TaskFormValues) => {
    await onSubmit(values);
    setIsDirty(false);
  };

  const handleDelete = () => {
    onDelete?.();
  };

  if (!isMounted || !isRendered) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm transition-opacity duration-200 sm:items-center",
        animationState === "enter" ? "opacity-100" : "opacity-0",
      )}
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-heading"
        className={cn(
          "relative flex w-full max-w-3xl flex-col rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200 sm:rounded-3xl",
          animationState === "enter" ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
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
                {mode === "create" ? "Create task" : "Edit task"}
              </p>
              <h2 id="task-modal-heading" className="mt-2 text-xl font-semibold text-slate-900">
                {mode === "create" ? "Add a new task" : task?.title ?? "Update task"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Fill out the details below. Changes save to your workspace immediately once you press save.
              </p>
            </header>

            <div className="mt-6 overflow-y-auto">
              <TaskForm
                ref={formRef}
                mode={mode}
                projects={projects}
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
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                >
                  Delete task
                </button>
              </div>
            ) : null}
      </div>
    </div>,
    document.body,
  );
}


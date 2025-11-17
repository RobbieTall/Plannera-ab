"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Filter, LayoutGrid, Plus, Rows3, Search } from "lucide-react";

import { ProjectCard } from "@/components/dashboard/project-card";
import { ProjectSkeleton } from "@/components/dashboard/skeletons";
import { ProjectDeleteModal } from "@/components/projects/project-delete-modal";
import { ProjectModal } from "@/components/projects/project-modal";
import { dateRanges, projects, teamMembers } from "@/lib/mock-data";
import type { Project, ProjectStatus, TaskPriority, TaskStatus } from "@/lib/mock-data";
import type { ProjectFormData } from "@/lib/project-form-schema";
import { cn, DateRangeFilter, isWithinDateRange } from "@/lib/utils";

const projectStatusOptions: Array<{ label: string; value: "all" | ProjectStatus }> = [
  { label: "All projects", value: "all" },
  { label: "Active", value: "active" },
  { label: "On hold", value: "on-hold" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

const taskStatusOptions: Array<{ label: string; value: "all" | TaskStatus }> = [
  { label: "All task statuses", value: "all" },
  { label: "To do", value: "todo" },
  { label: "In progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Blocked", value: "blocked" },
];

const priorityOptions: Array<{ label: string; value: "all" | TaskPriority }> = [
  { label: "All priorities", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export function ProjectsView() {
  const [isLoading, setIsLoading] = useState(true);
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectStatus, setProjectStatus] = useState<(typeof projectStatusOptions)[number]["value"]>("all");
  const [taskStatus, setTaskStatus] = useState<(typeof taskStatusOptions)[number]["value"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]["value"]>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modalState, setModalState] = useState<{ open: boolean; mode: "create" | "edit"; project: Project | null }>({
    open: false,
    mode: "create",
    project: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; variant: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projectList.filter((project) => {
      if (projectStatus !== "all" && project.status !== projectStatus) {
        return false;
      }

      const matchesSearch = term
        ? project.name.toLowerCase().includes(term) || project.description.toLowerCase().includes(term)
        : true;

      const matchesTaskStatus =
        taskStatus === "all" || project.tasks.some((task) => task.status === taskStatus);

      const matchesPriority =
        priorityFilter === "all" || project.tasks.some((task) => task.priority === priorityFilter) || project.priority === priorityFilter;

      const matchesDate =
        dateFilter === "all" || project.tasks.some((task) => isWithinDateRange(task.dueDate, dateFilter));

      return matchesSearch && matchesTaskStatus && matchesPriority && matchesDate;
    });
  }, [dateFilter, priorityFilter, projectList, projectStatus, searchTerm, taskStatus]);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ id: Date.now(), message, variant });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ open: false, mode: "create", project: null });
  }, []);

  const openCreateModal = () => {
    setModalState({ open: true, mode: "create", project: null });
  };

  const openEditModal = (project: Project) => {
    setModalState({ open: true, mode: "edit", project });
  };

  const handleArchive = (project: Project) => {
    if (project.status === "archived") {
      showToast(`${project.name} is already archived`, "error");
      return;
    }
    setProjectList((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              status: "archived",
            }
          : item,
      ),
    );
    showToast(`Archived ${project.name}`);
  };

  const mapFormToProject = (values: ProjectFormData, existing?: Project): Project => {
    const selectedMembers = values.teamMemberIds
      .map((id) => teamMembers.find((member) => member.id === id) ?? null)
      .filter((member): member is NonNullable<typeof member> => Boolean(member));

    return {
      id: existing?.id ?? `proj-${Date.now()}`,
      name: values.name,
      description: values.description,
      status: values.status,
      priority: values.priority,
      progress: values.progress / 100,
      startDate: values.startDate,
      endDate: values.endDate,
      color: values.color,
      tags: values.tags,
      tasks: existing?.tasks ?? [],
      teamMembers: selectedMembers,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      activity: existing?.activity ?? [],
      isDemo: existing?.isDemo ?? false,
    } satisfies Project;
  };

  const handleSubmitProject = async (values: ProjectFormData) => {
    try {
      setIsSaving(true);
      await new Promise((resolve) => window.setTimeout(resolve, 450));

      if (modalState.mode === "edit" && modalState.project) {
        const updated = mapFormToProject(values, modalState.project);
        setProjectList((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        showToast("Project updated");
      } else {
        const created = mapFormToProject(values);
        setProjectList((previous) => [created, ...previous]);
        showToast("Project created");
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save project", error);
      showToast("Unable to save project", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setIsDeleting(true);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setProjectList((previous) => previous.filter((project) => project.id !== deleteTarget.id));
      showToast("Project deleted");
      if (modalState.open && modalState.project?.id === deleteTarget.id) {
        closeModal();
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete project", error);
      showToast("Unable to delete project", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4">
          <div
            role="status"
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
                : "border-rose-200 bg-rose-50/80 text-rose-600",
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500">
          Track progress across initiatives, swap between grid and list layouts, and surface exactly what needs your attention.
        </p>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create project
        </button>
      </header>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 transition focus-within:border-slate-900">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by project or description"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </div>
          <select
            value={projectStatus}
            onChange={(event) => setProjectStatus(event.target.value as (typeof projectStatusOptions)[number]["value"])}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
          >
            {projectStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={taskStatus}
            onChange={(event) => setTaskStatus(event.target.value as (typeof taskStatusOptions)[number]["value"])}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
          >
            {taskStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as (typeof priorityOptions)[number]["value"])}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateRangeFilter)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
          >
            {dateRanges.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 transition",
              viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 transition",
              viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900",
            )}
          >
            <Rows3 className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={cn("grid gap-4", viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "")}
        >
          {[...Array(6)].map((_, index) => (
            <ProjectSkeleton key={`project-skeleton-${index}`} />
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
          )}
        >
          {filteredProjects.map((project) => (
            <div key={project.id} className="group relative">
              <Link href={`/projects/${project.id}`} className="block">
                <ProjectCard project={project} variant={viewMode} />
              </Link>
              <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-end px-4 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/90 p-1 shadow">
                  <button
                    type="button"
                    onClick={() => openEditModal(project)}
                    className="rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(project)}
                    className="rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(project)}
                    className="rounded-2xl px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No projects match these filters</h2>
          <p className="text-sm text-slate-500">
            Try adjusting your filters or create a project brief to get rolling.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Start a new project
          </button>
        </div>
      )}

      <ProjectModal
        open={modalState.open}
        mode={modalState.mode}
        project={modalState.project}
        teamMembers={teamMembers}
        isSubmitting={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmitProject}
        onDelete={modalState.mode === "edit" ? () => setDeleteTarget(modalState.project) : undefined}
      />

      <ProjectDeleteModal
        open={Boolean(deleteTarget)}
        project={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

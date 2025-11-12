"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock, BarChart3, Filter, LayoutGrid, Plus, Rows3, Search, Sparkles } from "lucide-react";

import { ProjectCard } from "@/components/dashboard/project-card";
import { ProjectSkeleton, TaskSkeleton } from "@/components/dashboard/skeletons";
import { TaskCard } from "@/components/dashboard/task-card";
import { TaskModal } from "@/components/tasks/task-modal";
import { DeleteConfirmationModal } from "@/components/tasks/delete-confirmation-modal";
import { dateRanges, projects, tasks as initialTasks, teamMembers } from "@/lib/mock-data";
import type { Task, TaskPriority, TaskStatus } from "@/lib/mock-data";
import { cn, DateRangeFilter, isWithinDateRange } from "@/lib/utils";
import type { TaskFormValues } from "@/lib/task-form-schema";

const statusOptions: Array<{ label: string; value: "all" | TaskStatus }> = [
  { label: "All statuses", value: "all" },
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

export function DashboardView() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskList, setTaskList] = useState<Task[]>(() => [...initialTasks]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]["value"]>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");
  const [projectView, setProjectView] = useState<"grid" | "list">("grid");
  const [modalState, setModalState] = useState<{ open: boolean; mode: "create" | "edit"; task: Task | null }>({
    open: false,
    mode: "create",
    task: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; variant: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now();
    setToast({ id, message, variant });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3600);
  }, []);

  const projectList = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        tasks: taskList.filter((task) => task.projectId === project.id),
      })),
    [taskList],
  );

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return taskList
      .filter((task) => {
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }
        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
          return false;
        }
        if (!isWithinDateRange(task.dueDate, dateFilter)) {
          return false;
        }
        if (!term) {
          return true;
        }
        return (
          task.title.toLowerCase().includes(term) ||
          task.description.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [dateFilter, priorityFilter, searchTerm, statusFilter, taskList]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projectList.filter((project) => {
      const matchesSearch = term
        ? project.name.toLowerCase().includes(term) || project.description.toLowerCase().includes(term)
        : true;

      const matchesStatus =
        statusFilter === "all" || project.tasks.some((task) => task.status === statusFilter);
      const matchesPriority =
        priorityFilter === "all" || project.tasks.some((task) => task.priority === priorityFilter);
      const matchesDate = project.tasks.some((task) => isWithinDateRange(task.dueDate, dateFilter));

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [dateFilter, priorityFilter, projectList, searchTerm, statusFilter]);

  const now = useMemo(() => new Date(), []);
  const activeProjects = projectList.filter((project) => project.status !== "completed").length;
  const completedTasks = taskList.filter((task) => task.status === "completed").length;
  const overdueTasks = taskList.filter((task) => {
    const dueDate = new Date(task.dueDate);
    return dueDate < now && task.status !== "completed";
  }).length;
  const upcomingMeetings = taskList.filter((task) => isWithinDateRange(task.dueDate, "this-week")).length;

  const highlightTasks = filteredTasks.slice(0, 6);

  const openCreateModal = () => {
    setModalState({ open: true, mode: "create", task: null });
  };

  const openEditModal = (task: Task) => {
    setModalState({ open: true, mode: "edit", task });
  };

  const closeModal = () => {
    setModalState({ open: false, mode: "create", task: null });
  };

  const scheduleDelete = (task: Task) => {
    setDeleteTarget(task);
  };

  const resolveAssignee = (assigneeId: string | null) => {
    if (!assigneeId) {
      return null;
    }
    return teamMembers.find((member) => member.id === assigneeId) ?? null;
  };

  const handleSaveTask = async (values: TaskFormValues) => {
    try {
      setIsSaving(true);
      await new Promise((resolve) => window.setTimeout(resolve, 450));

      if (modalState.mode === "create") {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: values.status,
          dueDate: values.dueDate ?? "",
          projectId: values.projectId,
          assignee: resolveAssignee(values.assigneeId),
          tags: values.tags,
          estimatedHours: values.estimatedHours,
        };
        setTaskList((previous) => [newTask, ...previous]);
        showToast("Task created successfully");
      } else if (modalState.mode === "edit" && modalState.task) {
        setTaskList((previous) =>
          previous.map((task) =>
            task.id === modalState.task?.id
              ? {
                  ...task,
                  title: values.title,
                  description: values.description,
                  priority: values.priority,
                  status: values.status,
                  dueDate: values.dueDate ?? "",
                  projectId: values.projectId,
                  assignee: resolveAssignee(values.assigneeId),
                  tags: values.tags,
                  estimatedHours: values.estimatedHours,
                }
              : task,
          ),
        );
        showToast("Task updated");
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save task", error);
      showToast("Something went wrong while saving", "error");
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
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      setTaskList((previous) => previous.filter((task) => task.id !== deleteTarget.id));
      showToast("Task deleted");
      if (modalState.open && modalState.task?.id === deleteTarget.id) {
        closeModal();
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete task", error);
      showToast("Unable to delete task", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const deleteFromModal =
    modalState.mode === "edit" && modalState.task
      ? (() => {
          const taskToDelete = modalState.task;
          return () => scheduleDelete(taskToDelete);
        })()
      : undefined;

  return (
    <div className="space-y-10">
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

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="absolute inset-y-0 right-0 h-full w-56 bg-gradient-to-b from-slate-900/5 via-slate-900/10 to-slate-900/5 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Planning control center
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your work at a glance</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-500">
              Monitor projects, track due dates, and keep momentum. Filters update live so you can slice the plan the way you need.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-sm">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active projects</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{activeProjects}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tasks completed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{completedTasks}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Overdue</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{overdueTasks}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Due this week</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{upcomingMeetings}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
            <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 transition focus-within:border-slate-900">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search tasks or projects"
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
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number]["value"])}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
              >
                {statusOptions.map((option) => (
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
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setProjectView("grid")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 transition",
                projectView === "grid" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setProjectView("list")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 transition",
                projectView === "list" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900",
              )}
            >
              <Rows3 className="h-4 w-4" />
              List
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <p className="text-sm text-slate-500">Responsive view adapts across breakpoints. Hover any card for quick insight.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                <BarChart3 className="h-4 w-4" />
                View report
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                Create task
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className={cn("grid gap-4", projectView === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "")}
            >
              {[...Array(6)].map((_, index) => (
                <ProjectSkeleton key={`project-skeleton-${index}`} />
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div
              className={cn(
                "grid gap-4",
                projectView === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
              )}
            >
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} variant={projectView} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <AlarmClock className="h-8 w-8 text-slate-400" />
              <div>
                <p className="text-base font-semibold text-slate-900">No projects match this view</p>
                <p className="mt-1 text-sm text-slate-500">Adjust filters or create a new project to get started.</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Start a new project
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
              <p className="text-sm text-slate-500">Stay ahead of due dates. Filters carry over from the project view.</p>
            </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
              Showing {highlightTasks.length} of {filteredTasks.length} tasks
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              New task
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <TaskSkeleton key={`task-skeleton-${index}`} />
            ))}
          </div>
        ) : highlightTasks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {highlightTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={openEditModal}
                onDelete={scheduleDelete}
                projectName={projectList.find((project) => project.id === task.projectId)?.name}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <AlarmClock className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-base font-semibold text-slate-900">No tasks yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first task to populate the timeline.</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create task
            </button>
          </div>
        )}
      </section>

      <TaskModal
        open={modalState.open}
        mode={modalState.mode}
        task={modalState.task}
        projects={projectList}
        teamMembers={teamMembers}
        isSubmitting={isSaving}
        onClose={closeModal}
        onSubmit={handleSaveTask}
        onDelete={deleteFromModal}
      />

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        title="Delete this task?"
        description={<span>Tasks are removed immediately and can’t be recovered later.</span>}
      />
    </div>
  );
}

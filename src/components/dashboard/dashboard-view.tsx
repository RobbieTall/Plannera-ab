"use client";

import { useEffect, useMemo, useState } from "react";
import { AlarmClock, BarChart3, Filter, LayoutGrid, Rows3, Search, Sparkles } from "lucide-react";

import { ProjectCard } from "@/components/dashboard/project-card";
import { ProjectSkeleton, TaskSkeleton } from "@/components/dashboard/skeletons";
import { TaskCard } from "@/components/dashboard/task-card";
import { dateRanges, projects, tasks } from "@/lib/mock-data";
import type { TaskPriority, TaskStatus } from "@/lib/mock-data";
import { cn, DateRangeFilter, isWithinDateRange } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]["value"]>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");
  const [projectView, setProjectView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return tasks
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
  }, [dateFilter, priorityFilter, searchTerm, statusFilter]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects.filter((project) => {
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
  }, [dateFilter, priorityFilter, searchTerm, statusFilter]);

  const now = useMemo(() => new Date(), []);
  const activeProjects = projects.filter((project) => project.status !== "completed").length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const overdueTasks = tasks.filter((task) => {
    const dueDate = new Date(task.dueDate);
    return dueDate < now && task.status !== "completed";
  }).length;
  const upcomingMeetings = tasks.filter((task) => isWithinDateRange(task.dueDate, "this-week")).length;

  const highlightTasks = filteredTasks.slice(0, 6);

  return (
    <div className="space-y-10">
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
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <BarChart3 className="h-4 w-4" />
              View report
            </button>
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
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
            Showing {highlightTasks.length} of {filteredTasks.length} tasks
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
              <TaskCard key={task.id} task={task} />
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
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create task
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

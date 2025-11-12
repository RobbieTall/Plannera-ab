"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, LayoutGrid, Rows3, Search } from "lucide-react";

import { ProjectCard } from "@/components/dashboard/project-card";
import { ProjectSkeleton } from "@/components/dashboard/skeletons";
import { dateRanges, projects } from "@/lib/mock-data";
import type { ProjectStatus, TaskPriority, TaskStatus } from "@/lib/mock-data";
import { cn, DateRangeFilter, isWithinDateRange } from "@/lib/utils";

const projectStatusOptions: Array<{ label: string; value: "all" | ProjectStatus }> = [
  { label: "All projects", value: "all" },
  { label: "On track", value: "on-track" },
  { label: "At risk", value: "at-risk" },
  { label: "Off track", value: "off-track" },
  { label: "Completed", value: "completed" },
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
  const [searchTerm, setSearchTerm] = useState("");
  const [projectStatus, setProjectStatus] = useState<(typeof projectStatusOptions)[number]["value"]>("all");
  const [taskStatus, setTaskStatus] = useState<(typeof taskStatusOptions)[number]["value"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]["value"]>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects.filter((project) => {
      if (projectStatus !== "all" && project.status !== projectStatus) {
        return false;
      }

      const matchesSearch = term
        ? project.name.toLowerCase().includes(term) || project.description.toLowerCase().includes(term)
        : true;

      const matchesTaskStatus =
        taskStatus === "all" || project.tasks.some((task) => task.status === taskStatus);

      const matchesPriority =
        priorityFilter === "all" || project.tasks.some((task) => task.priority === priorityFilter);

      const matchesDate =
        dateFilter === "all" || project.tasks.some((task) => isWithinDateRange(task.dueDate, dateFilter));

      return matchesSearch && matchesTaskStatus && matchesPriority && matchesDate;
    });
  }, [dateFilter, priorityFilter, projectStatus, searchTerm, taskStatus]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500">
          Track progress across initiatives, swap between grid and list layouts, and surface exactly what needs your attention.
        </p>
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
            <ProjectCard key={project.id} project={project} variant={viewMode} />
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
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Start a new project
          </button>
        </div>
      )}
    </div>
  );
}

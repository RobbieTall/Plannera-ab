"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

import { TaskCard } from "@/components/dashboard/task-card";
import { TaskSkeleton } from "@/components/dashboard/skeletons";
import { dateRanges, projects, tasks } from "@/lib/mock-data";
import type { TaskPriority, TaskStatus } from "@/lib/mock-data";
import { DateRangeFilter, isWithinDateRange } from "@/lib/utils";

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

const projectLookup = Object.fromEntries(projects.map((project) => [project.id, project.name] as const));

const columnConfig: Array<{ status: TaskStatus; title: string; description: string }> = [
  { status: "todo", title: "To do", description: "Ideas and tasks waiting to start" },
  { status: "in-progress", title: "In progress", description: "Actively being worked on" },
  { status: "blocked", title: "Blocked", description: "Needs support to move" },
  { status: "completed", title: "Completed", description: "Wrapped up and archived" },
];

export function TasksView() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]["value"]>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return tasks.filter((task) => {
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
        task.description.toLowerCase().includes(term) ||
        projectLookup[task.projectId]?.toLowerCase().includes(term)
      );
    });
  }, [dateFilter, priorityFilter, searchTerm, statusFilter]);

  const groupedTasks = useMemo(
    () =>
      columnConfig.map((column) => ({
        ...column,
        tasks: filteredTasks.filter((task) => task.status === column.status),
      })),
    [filteredTasks],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">Tasks</h1>
        <p className="text-sm text-slate-500">
          Search across projects, prioritize by urgency, and see at a glance which workstreams are blocked.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 transition focus-within:border-slate-900">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search tasks, descriptions, or projects"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columnConfig.map((column) => (
            <div key={column.status} className="space-y-3">
              <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200/70" />
              <TaskSkeleton />
              <TaskSkeleton />
            </div>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {groupedTasks.map((column) => (
            <section key={column.status} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <header className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">{column.title}</h2>
                  <span className="text-xs font-semibold text-slate-400">{column.tasks.length}</span>
                </div>
                <p className="text-xs text-slate-500">{column.description}</p>
              </header>
              <div className="space-y-3">
                {column.tasks.length > 0 ? (
                  column.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} projectName={projectLookup[task.projectId]} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Nothing here yet
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No tasks match these filters</h2>
          <p className="text-sm text-slate-500">Use a broader search or start by creating a task.</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create task
          </button>
        </div>
      )}
    </div>
  );
}

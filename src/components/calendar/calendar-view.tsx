"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Filter, Search } from "lucide-react";

import { TaskCard } from "@/components/dashboard/task-card";
import { TaskSkeleton } from "@/components/dashboard/skeletons";
import { dateRanges, projects, tasks } from "@/lib/mock-data";
import type { TaskPriority, TaskStatus } from "@/lib/mock-data";
import { cn, DateRangeFilter, formatDate, isWithinDateRange } from "@/lib/utils";

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

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date: Date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function toKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function CalendarView() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]["value"]>("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const monthMeta = useMemo(() => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    const cursor = new Date(calendarStart);
    while (cursor <= calendarEnd) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return { monthStart, monthEnd, calendarStart, calendarEnd, days };
  }, [currentMonth]);

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      if (dueDate < monthMeta.calendarStart || dueDate > monthMeta.calendarEnd) {
        return false;
      }
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
  }, [dateFilter, monthMeta, priorityFilter, searchTerm, statusFilter]);

  const tasksByDate = useMemo(() => {
    return filteredTasks.reduce<Record<string, typeof tasks>>((accumulator, task) => {
      const key = task.dueDate;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(task);
      return accumulator;
    }, {});
  }, [filteredTasks]);

  useEffect(() => {
    if (selectedDate && tasksByDate[selectedDate]) {
      return;
    }
    const firstKey = filteredTasks[0]?.dueDate ?? null;
    setSelectedDate(firstKey);
  }, [filteredTasks, selectedDate, tasksByDate]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-900 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Planning calendar</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Navigate between months, filter by status, and zoom into a specific day to see task details.
            </p>
          </div>
          <button
            type="button"
            onClick={goToNextMonth}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-900 hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 transition focus-within:border-slate-900 lg:max-w-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search tasks"
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
      </header>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {[...Array(6)].map((_, index) => (
              <div key={`calendar-skeleton-${index}`} className="h-12 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-8 w-36 animate-pulse rounded-full bg-slate-200/70" />
            <TaskSkeleton />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {"Mon Tue Wed Thu Fri Sat Sun".split(" ").map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {monthMeta.days.map((day) => {
                const key = toKey(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const dayTasks = tasksByDate[key] ?? [];
                const isSelected = selectedDate === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "flex min-h-[92px] flex-col gap-1 rounded-2xl border p-2 text-left text-xs transition",
                      isCurrentMonth ? "border-slate-200 bg-white hover:border-slate-900" : "border-transparent bg-slate-50 text-slate-400",
                      isSelected ? "border-slate-900 ring-2 ring-slate-900" : "",
                    )}
                  >
                    <span className="font-semibold text-slate-900">{day.getDate()}</span>
                    <div className="flex flex-1 flex-col gap-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className="truncate rounded-full bg-slate-900/5 px-2 py-1 text-[10px] font-semibold text-slate-700"
                        >
                          {task.title}
                        </span>
                      ))}
                    </div>
                    {dayTasks.length > 3 ? (
                      <span className="text-[10px] font-medium text-slate-400">+{dayTasks.length - 3} more</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agenda</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedDate ? formatDate(selectedDate) : "Select a day"}
                </h2>
              </div>
              <div className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                <CalendarDays className="mr-1 inline h-4 w-4" />
                {selectedDate ? tasksByDate[selectedDate]?.length ?? 0 : 0} tasks
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {selectedDate && tasksByDate[selectedDate] && tasksByDate[selectedDate]!.length > 0 ? (
                tasksByDate[selectedDate]!.map((task) => (
                  <TaskCard key={task.id} task={task} projectName={projectLookup[task.projectId]} />
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  <span>No tasks scheduled for this day.</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Schedule task
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

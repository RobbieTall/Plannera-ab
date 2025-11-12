"use client";

import { ReactNode, useMemo } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, ListTodo, Users } from "lucide-react";

import type { Project } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

interface ProjectStatsProps {
  project: Project;
}

export function ProjectStats({ project }: ProjectStatsProps) {
  const stats = useMemo(() => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((task) => task.status === "completed").length;
    const overdueTasks = project.tasks.filter((task) => {
      if (!task.dueDate) {
        return false;
      }
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today && task.status !== "completed";
    }).length;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      teamSize: project.teamMembers.length,
    };
  }, [project]);

  const cards: Array<{
    label: string;
    value: string;
    icon: ReactNode;
    helper?: string;
  }> = [
    {
      label: "Total tasks",
      value: String(stats.totalTasks),
      icon: <ListTodo className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Completed",
      value: `${stats.completedTasks}/${stats.totalTasks || 1}`,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />,
    },
    {
      label: "Overdue",
      value: String(stats.overdueTasks),
      icon: <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />,
    },
    {
      label: "Team size",
      value: String(stats.teamSize),
      icon: <Users className="h-4 w-4 text-slate-500" aria-hidden="true" />,
    },
  ];

  return (
    <section aria-labelledby="project-stats-heading" className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 id="project-stats-heading" className="text-lg font-semibold text-slate-900">
          Project health
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Updated {formatDate(project.createdAt, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{card.label}</span>
              {card.icon}
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
            {card.helper ? <p className="mt-1 text-xs text-slate-500">{card.helper}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

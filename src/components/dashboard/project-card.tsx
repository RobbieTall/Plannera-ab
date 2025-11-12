import { CalendarDays, Users } from "lucide-react";

import type { Project } from "@/lib/mock-data";
import { cn, formatDate, getPriorityStyles, getProjectStatusStyles } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  variant?: "grid" | "list";
};

export function ProjectCard({ project, variant = "grid" }: ProjectCardProps) {
  const completedTasks = project.tasks.filter((task) => task.status === "completed").length;
  const totalTasks = project.tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
        variant === "list" ? "flex flex-col gap-4 md:flex-row md:items-center" : "",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", getProjectStatusStyles(project.status))}>
              {project.status.replace("-", " ")}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", getPriorityStyles(project.priority))}>
              {project.priority} priority
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {formatDate(project.createdAt, { month: "short", day: "numeric" })}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900 transition group-hover:text-slate-950">
            {project.name}
          </h3>
          <p className="mt-2 max-w-xl text-sm text-slate-500">{project.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {project.startDate ? formatDate(project.startDate, { month: "short", day: "numeric" }) : "TBD"} –
              {" "}
              {project.endDate ? formatDate(project.endDate, { month: "short", day: "numeric" }) : "TBD"}
            </span>
          </div>
          {project.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700">
                  #{tag}
                </span>
              ))}
              {project.tags.length > 3 ? (
                <span className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-500">
                  +{project.tags.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Progress</p>
            <p className="text-lg font-semibold text-slate-900">{Math.round(project.progress * 100)}%</p>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${Math.round(project.progress * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className={cn("mt-6 flex items-center gap-4", variant === "list" ? "md:ml-auto" : "")}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Users className="h-4 w-4 text-slate-400" />
          <span>{project.teamMembers.length} teammates</span>
        </div>
        <div className="flex -space-x-2">
          {project.teamMembers.slice(0, 4).map((member) => (
            <span
              key={member.id}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-semibold text-slate-600 shadow-sm"
              style={{ backgroundImage: `url(${member.avatarUrl})`, backgroundSize: "cover" }}
              aria-label={member.name}
            />
          ))}
          {project.teamMembers.length > 4 ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-semibold text-white shadow-sm">
              +{project.teamMembers.length - 4}
            </span>
          ) : null}
        </div>
        <div className="ml-auto text-right text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{totalTasks} task{totalTasks === 1 ? "" : "s"}</p>
          <p className="text-xs">{completedTasks} completed ({completionRate}%)</p>
        </div>
      </div>
    </article>
  );
}

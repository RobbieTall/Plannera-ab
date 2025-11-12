import { CalendarDays, CircleUserRound } from "lucide-react";

import type { Task } from "@/lib/mock-data";
import { cn, formatDate, getPriorityStyles, getStatusStyles } from "@/lib/utils";

type TaskCardProps = {
  task: Task;
  projectName?: string;
};

export function TaskCard({ task, projectName }: TaskCardProps) {
  return (
    <article className="group flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          {projectName ? (
            <span className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
              {projectName}
            </span>
          ) : null}
          
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", getStatusStyles(task.status))}>
              {task.status.replace("-", " ")}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", getPriorityStyles(task.priority))}>
              {task.priority} priority
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900 transition group-hover:text-slate-950">{task.title}</h3>
          <p className="mt-2 text-sm text-slate-500">{task.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CircleUserRound className="h-4 w-4 text-slate-400" />
            <span>{task.assignee.name}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
